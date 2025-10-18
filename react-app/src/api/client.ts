const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

const resolveApiBase = () => {
  const envValue = import.meta.env.VITE_API_BASE?.trim();
  const fallback = 'http://localhost:5000';
  const rawBase = envValue && envValue.length > 0 ? envValue : fallback;

  try {
    const windowOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const baseUrl = new URL(rawBase, windowOrigin);

    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost && !LOCAL_HOSTNAMES.has(currentHost) && LOCAL_HOSTNAMES.has(baseUrl.hostname)) {
        baseUrl.hostname = currentHost;
      }
    }

    baseUrl.pathname = baseUrl.pathname.replace(/\/+$/, '');
    return baseUrl.toString().replace(/\/+$/, '');
  } catch {
    return rawBase.replace(/\/+$/, '');
  }
};

export const API_BASE = resolveApiBase();

type BackendStatus = 'success' | 'no_unprocessed' | string;

export interface LabelDescription {
  description: string;
  when_true: string;
  when_false: string;
}

export interface LabelDefinition {
  column: string;
  display_name: string;
  emoji: string;
  shortcut: string;
  description: LabelDescription;
}

export interface LabelConfigResponse {
  labels: LabelDefinition[];
}

export type LabelState = Record<string, boolean>;

interface BackendImagePayload {
  image_path: string;
  filename: string;
  remaining: number;
  labels?: LabelState;
}

interface BackendLoadImageResponse {
  status: BackendStatus;
  image: BackendImagePayload | null;
  message?: string;
}

export interface ImageData {
  filename: string;
  path: string;
}

export interface LoadImageResult {
  image: ImageData | null;
  remaining: number;
  labels?: LabelState;
}

export interface NavigateRequest {
  currentPath: string;
  labels: LabelState;
  reviewer: string;
}

export interface NavigateResult extends LoadImageResult {}

export interface ProgressData {
  total_images: number;
  processed_images: number;
  percentage: number;
}

export interface ReviewerStats {
  reviewer: string;
  count: number;
}

const mapBackendImage = (payload: BackendImagePayload | null): LoadImageResult => {
  if (!payload) {
    return { image: null, remaining: 0 };
  }

  return {
    image: {
      filename: payload.filename,
      path: payload.image_path,
    },
    remaining: payload.remaining ?? 0,
    labels: payload.labels,
  };
};

export const apiClient = {
  async loadImage(username: string): Promise<LoadImageResult> {
    const url = new URL(`${API_BASE}/load_image`);
    if (username?.trim()) {
      url.searchParams.set('username', username.trim());
    }

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to load image');
    const data: BackendLoadImageResponse = await response.json();

    if (data.status === 'success') {
      return mapBackendImage(data.image);
    }

    if (data.status === 'no_unprocessed') {
      return { image: null, remaining: 0 };
    }

    throw new Error(data.message ?? 'Failed to load image');
  },

  async navigate(data: NavigateRequest): Promise<NavigateResult> {
    const response = await fetch(`${API_BASE}/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_path: data.currentPath,
        labels: data.labels,
        reviewer: data.reviewer,
      }),
    });
    if (!response.ok) throw new Error('Failed to navigate');
    const payload: BackendLoadImageResponse = await response.json();

    if (payload.status === 'success') {
      return mapBackendImage(payload.image);
    }

    if (payload.status === 'no_unprocessed') {
      return { image: null, remaining: 0 };
    }

    throw new Error(payload.message ?? 'Failed to navigate');
  },

  async getProgress(): Promise<ProgressData> {
    const response = await fetch(`${API_BASE}/get_progress`);
    if (!response.ok) throw new Error('Failed to get progress');
    const data = await response.json();
    return {
      total_images: data.total ?? 0,
      processed_images: data.processed ?? 0,
      percentage: data.percentage ?? 0,
    };
  },

  async getStats(): Promise<ReviewerStats[]> {
    const response = await fetch(`${API_BASE}/get_stats`);
    if (!response.ok) throw new Error('Failed to get stats');
    const data = await response.json();
    return data.stats ?? [];
  },

  async getLabelConfig(): Promise<LabelConfigResponse> {
    const response = await fetch(`${API_BASE}/label_config`);
    if (!response.ok) {
      throw new Error('Failed to load label configuration');
    }

    const data = (await response.json()) as LabelConfigResponse | null;
    if (!data || !Array.isArray(data.labels)) {
      throw new Error('Label configuration response is invalid');
    }

    return data;
  },

  getImageUrl(filename: string): string {
    const normalized = filename.replace(/^\/+/, '');
    return `${API_BASE}/images/${normalized}`;
  },
};
