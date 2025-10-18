import time
from flask import Flask, jsonify, request, send_from_directory
import json
import os
import pandas as pd
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, timedelta
import threading
import fcntl
import random
from flask_cors import CORS
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
# Load environment configuration eagerly so every helper can rely on it.
load_dotenv(BASE_DIR / ".env")


class ImageClassifierApp:
    def __init__(self, *, base_dir=None, path_overrides=None, file_overrides=None):
        path_overrides = path_overrides or {}
        file_overrides = file_overrides or {}

        # Root folder that relative paths are resolved against.
        self.base_dir = self._resolve_base_dir(base_dir)

        # Directory that stores label configuration JSON files.
        self.config_dir = self._resolve_path(
            path_overrides.get("config_dir"),
            env_var="RMC_CONFIG_DIR",
        )
        # Specific label configuration file that defines available labels.
        label_config_relpath = self._resolve_relative_component(
            file_overrides.get("label_config_filename"),
            env_var="RMC_LABEL_CONFIG_FILE",
        )
        self.label_config_path = self._normalize_join(self.config_dir, label_config_relpath)
        self.label_config = self._load_label_config()
        self.label_columns = [label["column"] for label in self.label_config["labels"]]
        self.label_defaults = {column: False for column in self.label_columns}
        self.output_dir = self._resolve_path(
            path_overrides.get("output_dir"),
            env_var="RMC_OUTPUT_DIR",
        )
        self.output_dir.mkdir(parents=True, exist_ok=True)
        # CSV backing store that tracks classifier decisions.
        csv_component = self._resolve_relative_component(
            file_overrides.get("csv_filename"),
            env_var="RMC_CSV_FILENAME",
        )
        self.csv_path = self._normalize_join(self.output_dir, csv_component)
        # Separate lock file to coordinate cross-process writes to the CSV.
        lock_component = self._resolve_relative_component(
            file_overrides.get("lock_filename"),
            env_var="RMC_LOCK_FILENAME",
        )
        self.lock_path = self._normalize_join(self.output_dir, lock_component)
        # Location that holds source images to classify.
        self.image_dir = self._resolve_path(
            path_overrides.get("image_dir"),
            env_var="RMC_IMAGE_SOURCE_DIR",
        )
        # Publicly served directory containing processed/recording images.
        self.recording_dir = self._resolve_path(
            path_overrides.get("recording_dir"),
            env_var="RMC_RECORDING_DIR",
        )
        # URL prefix used when serving images through Flask.
        self.image_route_prefix = self._resolve_route_prefix(
            path_overrides.get("image_route_prefix"),
            env_var="RMC_IMAGE_ROUTE_PREFIX",
        )
        # Allow additional legacy prefixes (comma separated) for backward compatibility.
        alias_values = self._resolve_aliases(path_overrides.get("image_route_aliases"))
        self._image_route_prefix_aliases = {self.image_route_prefix, *alias_values}
        # Directory that contains the built frontend bundle.
        self.dist_dir = self._resolve_path(
            path_overrides.get("dist_dir"),
            env_var="RMC_DIST_DIR",
        )
        # Folder serving static celebration assets when the review completes.
        self.celebration_dir = self._resolve_path(
            path_overrides.get("celebration_dir"),
            env_var="RMC_CELEBRATION_DIR",
        )
        self.reviewer_column = "reviewer"
        self.assignment_user_column = "assigned_to"
        self.assignment_timestamp_column = "assigned_at"
        # Duration after which stale assignments automatically return to the pool.
        self.assignment_timeout = timedelta(minutes=10)
        # Column schema maintained in the classification CSV.
        self.dataframe_columns = [
            "image_path",
            *self.label_columns,
            "processed",
            self.reviewer_column,
            self.assignment_user_column,
            self.assignment_timestamp_column,
        ]
        self._thread_lock = threading.Lock()
        self.lock_path.touch(exist_ok=True)
        self._ensure_csv_initialized()
        self._prime_dataframe()
        self.app = Flask(__name__)
        #self.cors = CORS(self.app)
        self.setup_routes()

    def setup_routes(self):

        @self.app.after_request
        def add_cors_headers(response):
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            return response

        @self.app.route("/")
        def index():
            return self._serve_frontend()

        @self.app.route("/username")
        def username_page():
            return self._serve_frontend()

        @self.app.route("/stats")
        def stats_page():
            return self._serve_frontend()

        @self.app.route("/help")
        def help_page():
            return self._serve_frontend()

        @self.app.route("/complete")
        def celebration_page():
            return self._serve_frontend()

        @self.app.route("/label_config")
        def label_config():
            return jsonify(self.label_config)

        @self.app.route("/load_image")
        def load_image():
            username = (request.args.get("username") or "").strip()
            with self.dataframe_access(write=True) as df:
                if username:
                    next_unprocessed = self._select_image_for_user(df, username)
                else:
                    next_unprocessed = self._get_next_unprocessed(df)

                if not next_unprocessed:
                    return jsonify(
                        {
                            "status": "no_unprocessed",
                            "message": "No unprocessed images available",
                            "image": None,
                        }
                    )

                payload = self._build_image_payload(df, next_unprocessed)

            return jsonify({"status": "success", "image": payload})

        @self.app.route("/navigate", methods=["POST", "OPTIONS"])
        def navigate():
            if request.method == "OPTIONS":
                return ("", 204)
            payload = request.get_json(force=True) or {}
            response = self._handle_navigation(payload)
            return jsonify(response)

        @self.app.route("/get_progress")
        def get_progress():
            with self.dataframe_access(write=False) as df:
                total = len(df)
                processed = df["processed"].sum() if total > 0 else 0
                percentage = (processed / total * 100) if total > 0 else 0

            return jsonify(
                {
                    "total": int(total),
                    "processed": int(processed),
                    "percentage": round(percentage, 1),
                }
            )

        @self.app.route("/get_stats")
        def get_stats():
            with self.dataframe_access(write=False) as df:
                if self.reviewer_column in df.columns:
                    reviewer_counts = (
                        df[df["processed"] == True].groupby(self.reviewer_column).size()
                    )
                    reviewer_counts.sort_values(inplace=True, ascending=False)

                    stats = [
                        {"reviewer": reviewer, "count": int(count)}
                        for reviewer, count in reviewer_counts.items()
                        if reviewer
                    ]
                else:
                    stats = []

            return jsonify({"stats": stats})

        @self.app.route("/images/<path:filename>")
        def serve_image(filename):
            clean_filename = filename
            for prefix in self._image_route_prefix_aliases:
                if not prefix:
                    continue
                prefix_with_slash = f"{prefix}/"
                if filename.startswith(prefix_with_slash):
                    clean_filename = filename[len(prefix_with_slash) :]
                    break
            return send_from_directory(str(self.recording_dir), clean_filename)

        @self.app.route("/celebration/<path:filename>")
        def serve_celebration_asset(filename):
            return send_from_directory(str(self.celebration_dir), filename)

        @self.app.route("/<path:path>")
        def spa_fallback(path):
            return self._serve_frontend(path)

    def _resolve_path(self, override, *, env_var):
        """Return a filesystem path resolved relative to base_dir from overrides or required env var."""
        if override is not None:
            return self._normalize_path(Path(override))
        env_value = self._require_env(env_var)
        return self._normalize_path(Path(env_value))

    def _resolve_relative_component(self, override, *, env_var):
        """Resolve a relative filename component, ensuring the env var exists when override missing."""
        if override is not None:
            return Path(override)
        return Path(self._require_env(env_var))

    def _resolve_route_prefix(self, override, *, env_var):
        """Clean route prefixes so Flask routes stay canonical."""
        if override is not None:
            return self._clean_prefix(override)
        return self._clean_prefix(self._require_env(env_var))

    def _resolve_aliases(self, override):
        """Load any additional route prefixes that should map to the recording directory."""
        if override is not None:
            raw_values = override
        else:
            alias_env = os.getenv("RMC_IMAGE_ROUTE_ALIASES")
            raw_values = alias_env.split(",") if alias_env else []

        if isinstance(raw_values, str):
            raw_values = [raw_values]

        aliases = []
        for value in raw_values:
            cleaned = self._clean_prefix(value)
            if cleaned:
                aliases.append(cleaned)
        return aliases

    def _resolve_base_dir(self, override):
        """Find the base directory used to anchor all other relative paths."""
        if override is not None:
            candidate = Path(override).expanduser()
            if candidate.is_absolute():
                return candidate.resolve()
            return (BASE_DIR / candidate).resolve()

        base_value = self._require_env("RMC_BASE_DIR")
        candidate = Path(base_value).expanduser()
        if candidate.is_absolute():
            return candidate.resolve()
        return (BASE_DIR / candidate).resolve()

    def _normalize_path(self, candidate):
        """Normalize a path to an absolute location under the configured base directory."""
        candidate = Path(candidate).expanduser()
        if candidate.is_absolute():
            return candidate.resolve()
        return (self.base_dir / candidate).resolve()

    def _normalize_join(self, anchor, component):
        """Attach a relative component to an anchor path while respecting absolute overrides."""
        component_path = Path(component).expanduser()
        if component_path.is_absolute():
            return component_path.resolve()
        return (anchor / component_path).resolve()

    def _require_env(self, key):
        """Fetch a required environment variable or raise immediately when missing/blank."""
        value = os.getenv(key)
        if value is None:
            raise RuntimeError(f"Missing required environment variable: {key}")
        value = value.strip()
        if not value:
            raise RuntimeError(f"Environment variable '{key}' cannot be empty.")
        return value

    def _clean_prefix(self, value):
        """Normalize a URL prefix by stripping slashes and whitespace."""
        if value is None:
            return ""
        return str(value).strip().strip("/")

    def _serve_frontend(self, requested_path=None):
        if not self.dist_dir.exists():
            return (
                "Frontend build not found. Run `npm run build` inside the react-app/ directory.",
                503,
                {"Content-Type": "text/plain"},
            )

        if requested_path:
            safe_path = requested_path.lstrip("/")
            candidate = self.dist_dir / safe_path
            if candidate.is_file():
                return send_from_directory(str(self.dist_dir), safe_path)

        return send_from_directory(str(self.dist_dir), "index.html")

    def run(self, host="127.0.0.1", port=5000, debug=False):
        self.app.run(host=host, port=port, debug=debug)

    def _handle_navigation(self, payload):
        current_path = payload.get("current_path")
        labels = payload.get("labels", {}) or {}
        reviewer = payload.get("reviewer", "")

        with self.dataframe_access(write=True) as df:

            if current_path:
                self._update_labels(
                    df,
                    current_path,
                    labels,
                    processed_override=True,
                    reviewer=reviewer,
                )
                self._clear_assignment(df, current_path)

            if reviewer:
                next_unprocessed = self._select_image_for_user(df, reviewer)
            else:
                next_unprocessed = self._get_next_unprocessed(df)

            if not next_unprocessed:
                return {
                    "status": "no_unprocessed",
                    "message": "No unprocessed images available",
                    "image": None,
                }

            image_payload = self._build_image_payload(df, next_unprocessed)

        return {"status": "success", "image": image_payload}

    @contextmanager
    def dataframe_access(self, write=False):
        with self._thread_lock:
            with open(self.lock_path, "r+") as lock_file:
                fcntl.flock(lock_file, fcntl.LOCK_EX)
                df = self._load_dataframe()
                df, synced = self._sync_dataframe_with_images(df)
                try:
                    yield df
                    if write or synced:
                        self._save_dataframe(df)
                finally:
                    lock_file.flush()
                    fcntl.flock(lock_file, fcntl.LOCK_UN)

    def _load_dataframe(self):
        if self.csv_path.exists():
            df = pd.read_csv(self.csv_path)
        else:
            df = pd.DataFrame(
                columns=[
                    "image_path",
                    *self.label_columns,
                    "processed",
                    self.reviewer_column,
                ]
            )

        if "image_path" not in df.columns:
            df["image_path"] = ""

        for column in self.label_columns:
            if column not in df.columns:
                df[column] = False
            df[column] = df[column].fillna(False).astype(bool)

        if "processed" not in df.columns:
            df["processed"] = False
        df["processed"] = df["processed"].fillna(False).astype(bool)

        if self.reviewer_column not in df.columns:
            df[self.reviewer_column] = ""
        df[self.reviewer_column] = df[self.reviewer_column].fillna("").astype(str)

        if self.assignment_user_column not in df.columns:
            df[self.assignment_user_column] = ""
        df[self.assignment_user_column] = df[self.assignment_user_column].fillna("").astype(str)

        if self.assignment_timestamp_column not in df.columns:
            df[self.assignment_timestamp_column] = ""
        df[self.assignment_timestamp_column] = df[self.assignment_timestamp_column].fillna("").astype(str)

        df["image_path"] = df["image_path"].fillna("").astype(str)
        df = df[df["image_path"] != ""]
        df.drop_duplicates(subset=["image_path"], keep="last", inplace=True)

        df.reset_index(drop=True, inplace=True)
        return df[self.dataframe_columns]

    def _save_dataframe(self, df):
        df[self.dataframe_columns].to_csv(self.csv_path, index=False)

    def _ensure_csv_initialized(self):
        if self.csv_path.exists():
            return
        initial_df = pd.DataFrame(columns=self.dataframe_columns)
        initial_df.to_csv(self.csv_path, index=False)

    def _prime_dataframe(self):
        # Trigger initial sync so CSV and cached state include all images before requests arrive.
        with self.dataframe_access(write=False):
            pass

    def _load_label_config(self):
        if not self.label_config_path.exists():
            raise FileNotFoundError(f"Label configuration not found at {self.label_config_path}")

        with open(self.label_config_path, "r", encoding="utf-8") as config_file:
            data = json.load(config_file)

        labels = data.get("labels")
        if not isinstance(labels, list) or not labels:
            raise ValueError("Label configuration must define a non-empty 'labels' list.")

        for label in labels:
            if not isinstance(label, dict):
                raise ValueError("Each label configuration entry must be an object.")

            column = label.get("column")
            if not column or not isinstance(column, str) or not column.strip():
                raise ValueError("Each label configuration entry must include a non-empty string 'column'.")
            label["column"] = column.strip()

            display_name = label.get("display_name")
            if display_name is None or not isinstance(display_name, str) or not display_name.strip():
                raise ValueError(f"Label '{column}' is missing a 'display_name'.")
            label["display_name"] = display_name.strip()

            emoji = label.get("emoji", "")
            if not isinstance(emoji, str):
                raise ValueError(f"Label '{column}' must define 'emoji' as a string.")
            label["emoji"] = emoji.strip()

            shortcut = label.get("shortcut", "")
            if not isinstance(shortcut, str):
                raise ValueError(f"Label '{column}' must define 'shortcut' as a string.")
            label["shortcut"] = shortcut.strip()

            description = label.get("description")
            if not isinstance(description, dict):
                raise ValueError(f"Label '{column}' must define 'description' as an object.")

            for key in ("description", "when_true", "when_false"):
                value = description.get(key, "")
                if not isinstance(value, str):
                    raise ValueError(f"Label '{column}' description field '{key}' must be a string.")
                description[key] = value.strip()

        return {"labels": labels}

    def _sync_dataframe_with_images(self, df):
        if not self.image_dir.exists():
            return df, False

        existing_paths = set(df["image_path"].astype(str))
        normalized_existing = set(existing_paths)
        for path in existing_paths:
            for prefix in self._image_route_prefix_aliases:
                if not prefix:
                    continue
                prefix_with_slash = f"{prefix}/"
                if path.startswith(prefix_with_slash):
                    normalized_existing.add(path[len(prefix_with_slash) :])
                    break

        new_rows = []
        for file_path in sorted(self.image_dir.glob("**/*")):
            if not file_path.is_file():
                continue
            relative_path = file_path.relative_to(self.image_dir).as_posix()
            canonical_path = (
                f"{self.image_route_prefix}/{relative_path}"
                if self.image_route_prefix
                else relative_path
            )

            if canonical_path in normalized_existing:
                continue
            if relative_path in normalized_existing:
                continue

            new_rows.append(
                {
                    "image_path": canonical_path,
                    **self._default_labels(),
                    "processed": False,
                    self.reviewer_column: "",
                    self.assignment_user_column: "",
                    self.assignment_timestamp_column: "",
                }
            )

        if new_rows:
            df = pd.concat([df, pd.DataFrame(new_rows)], ignore_index=True)
            df = df[self.dataframe_columns]

        return df, bool(new_rows)

    def _clear_assignment(self, df, image_path):
        mask = df["image_path"] == image_path
        if not mask.any():
            return
        df.loc[mask, self.assignment_user_column] = ""
        df.loc[mask, self.assignment_timestamp_column] = ""

    def _release_user_assignment(self, df, username):
        username = (username or "").strip()
        if not username:
            return
        mask = df[self.assignment_user_column] == username
        if not mask.any():
            return
        df.loc[mask, self.assignment_user_column] = ""
        df.loc[mask, self.assignment_timestamp_column] = ""

    def _select_image_for_user(self, df, username):
        username = (username or "").strip()
        if not username:
            return self._get_next_unprocessed(df)

        now = datetime.utcnow()
        expiry = now - self.assignment_timeout

        self._release_user_assignment(df, username)

        assigned_mask = df[self.assignment_user_column] != ""
        unprocessed_mask = df["processed"] == False
        candidates = df[assigned_mask & unprocessed_mask]
        fallback_index = None

        if not candidates.empty:
            timestamps = pd.to_datetime(
                candidates[self.assignment_timestamp_column], errors="coerce"
            )
            invalid_stamp = timestamps.isna()
            stale_mask = timestamps < expiry
            combined_mask = (stale_mask | invalid_stamp) & (
                candidates[self.assignment_user_column] != username
            )
            if combined_mask.any():
                stale_indices = timestamps[combined_mask]
                target_index = stale_indices.sort_values().index[0]
                df.at[target_index, self.assignment_user_column] = username
                df.at[target_index, self.assignment_timestamp_column] = now.isoformat()
                return df.at[target_index, "image_path"]
            if not timestamps.empty:
                fallback_index = timestamps.sort_values().index[0]

        available_mask = (df[self.assignment_user_column] == "") & unprocessed_mask
        available = df[available_mask]
        if available.empty:
            if fallback_index is None:
                return None
            df.at[fallback_index, self.assignment_user_column] = username
            df.at[fallback_index, self.assignment_timestamp_column] = now.isoformat()
            return df.at[fallback_index, "image_path"]

        next_row = available.sample(n=1).iloc[0]
        idx = next_row.name
        df.at[idx, self.assignment_user_column] = username
        df.at[idx, self.assignment_timestamp_column] = now.isoformat()
        return df.at[idx, "image_path"]


    def _build_image_payload(self, df, image_path):
        remaining = int((df["processed"] == False).sum())
        filename = Path(image_path).name
        reviewer = ""
        row = df[df["image_path"] == image_path]
        if not row.empty:
            reviewer = str(row.iloc[0].get(self.reviewer_column, ""))
        return {
            "image_path": image_path,
            "filename": filename,
            "labels": self._default_labels(),
            "remaining": remaining,
        }

    def _update_labels(self, df, image_path, labels, processed_override, reviewer=""):
        mask = df["image_path"] == image_path
        if mask.any():
            idx = df[mask].index[0]
        else:
            idx = len(df)
            df.loc[idx] = {
                "image_path": image_path,
                **self._default_labels(),
                "processed": False,
                self.reviewer_column: "",
                self.assignment_user_column: "",
                self.assignment_timestamp_column: "",
            }

        for column in self.label_columns:
            df.at[idx, column] = bool(labels.get(column, False))

        if processed_override is None:
            processed_value = True
        else:
            processed_value = bool(processed_override)

        df.at[idx, "processed"] = processed_value

        if reviewer:
            df.at[idx, self.reviewer_column] = str(reviewer)

    def _default_labels(self):
        return dict(self.label_defaults)

    def _get_unprocessed_images(self, df):
        unprocessed = df[df["processed"] == False]
        if unprocessed.empty:
            return []
        return unprocessed.sort_values("image_path")["image_path"].tolist()

    def _get_next_unprocessed(self, df):
        unprocessed = self._get_unprocessed_images(df)
        if not unprocessed:
            return None
        return random.choice(unprocessed)


def main():
    app = ImageClassifierApp()
    app.run(host="0.0.0.0", debug=True)


if __name__ == "__main__":
    main()
