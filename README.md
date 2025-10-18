# RaspiScanner Manual Classifier

A full-stack web application for manual image classification with a Flask backend and React frontend. Designed for collaborative image annotation with multi-user support, keyboard shortcuts, and real-time progress tracking.

## Project Overview

The RaspiScanner Manual Classifier provides an intuitive interface for manually classifying images with customizable labels. It's built for scenarios where automated image classification needs human verification, such as quality control, data labeling, or research annotation tasks.

### Key Features

- **Multi-User Support**: Concurrent classification with user assignment and locking
- **Customizable Labels**: Dynamic label configuration with emojis and keyboard shortcuts
- **Real-time Progress**: Live progress tracking and statistics
- **Keyboard Navigation**: Efficient classification with keyboard shortcuts
- **Mobile-Friendly**: Responsive design with touch support
- **Celebration Mode**: Fullscreen celebration upon completion
- **Assignment System**: Prevents duplicate work with timed assignments

## Architecture

### Technology Stack

**Backend:**
- **Framework**: Flask 3.1.2+
- **Language**: Python 3.12+
- **Data Storage**: CSV-based with file locking
- **Concurrency**: Thread-safe with file locking
- **CORS**: Enabled for frontend communication

**Frontend:**
- **Framework**: React 19.1+ with TypeScript
- **Build Tool**: Vite 7.1+
- **Styling**: Tailwind CSS 4.1+
- **Routing**: React Router DOM 7.9+
- **Icons**: Lucide React

### System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   React Frontend │◄──►│   Flask Backend   │◄──►│   File System     │
│                 │    │                  │    │                  │
│ - TypeScript    │    │ - REST API       │    │ - Images         │
│ - Tailwind CSS  │    │ - CSV Database   │    │ - CSV Storage    │
│ - Real-time UI  │    │ - File Locking   │    │ - Configuration  │
└─────────────────┘    └──────────────────┘    └──────────────────┘
```

## Installation Instructions

### Prerequisites

- Python 3.12 or higher
- Node.js 18+ and npm
- UV package manager (recommended)

### Backend Setup

1. **Clone and navigate to the project:**
   ```bash
   cd RaspiScannerManualClassifier
   ```

2. **Install Python dependencies with UV:**
   ```bash
   uv init
   uv add flask flask-cors pandas pillow python-dotenv
   ```

3. **Set up environment configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Configuration section)
   ```

4. **Create required directories:**
   ```bash
   mkdir -p images_to_classify outputs celebration configuration
   ```

### Frontend Setup

1. **Navigate to the React app:**
   ```bash
   cd react-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the frontend:**
   ```bash
   npm run build
   ```

4. **Return to project root:**
   ```bash
   cd ..
   ```

## Usage Guide

### Starting the Application

1. **Start the Flask backend:**
   ```bash
   uv run python main.py
   ```
   The backend will start on `http://localhost:5000`

2. **Start the React development server (optional):**
   ```bash
   cd react-app && npm run dev
   ```
   The frontend will start on `http://localhost:5173`

3. **Access the application:**
   - Production: `http://localhost:5000`
   - Development: `http://localhost:5173`

### Classification Workflow

1. **User Setup**: Enter your username on the initial screen
2. **Image Loading**: The system automatically loads the next unprocessed image
3. **Label Assignment**: Click label buttons or use keyboard shortcuts to toggle labels
4. **Navigation**: Press "Next Unprocessed Image" or Spacebar to save and advance
5. **Completion**: When all images are processed, enjoy the celebration screen!

### Keyboard Shortcuts

- **Spacebar**: Save current labels and load next image
- **Label Shortcuts**: Use configured keyboard shortcuts (e.g., 'A' for the first label)
- **Long Press**: Hold label buttons for detailed descriptions

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Root directory used to resolve all relative paths
RMC_BASE_DIR=.

# Folder containing application configuration files
RMC_CONFIG_DIR=configuration

# Label configuration filename inside the config directory
RMC_LABEL_CONFIG_FILE=label_config.json

# Directory where CSV data and lock files are stored
RMC_OUTPUT_DIR=outputs

# Classification CSV filename written under the output directory
RMC_CSV_FILENAME=classification_data.csv

# File used to coordinate concurrent writes to the CSV
RMC_LOCK_FILENAME=classification_data.lock

# Source directory containing images awaiting classification
RMC_IMAGE_SOURCE_DIR=images_to_classify

# Directory served by Flask for existing/processed images
RMC_RECORDING_DIR=images_to_classify

# URL prefix expected when serving images from the recording directory
RMC_IMAGE_ROUTE_PREFIX=images_to_classify

# Additional URL prefixes that should map to the recording directory
# RMC_IMAGE_ROUTE_ALIASES=recording_images

# Directory containing the built frontend bundle
RMC_DIST_DIR=dist

# Static assets for the celebration/completion page
RMC_CELEBRATION_DIR=celebration
```

### Label Configuration

Create `configuration/label_config.json` to define your classification labels:

```json
{
  "labels": [
    {
      "column": "object_cross",
      "display_name": "SOMETHING CROSSES THE EDGE",
      "emoji": "⚠️",
      "shortcut": "A",
      "description": {
        "description": "Indicates whether something is inside of the region of interest.",
        "when_true": "Any object has a part in this area.",
        "when_false": "Area is clean and no object occupies the space in the region."
      }
    },
    {
      "column": "quality_issue",
      "display_name": "QUALITY ISSUE",
      "emoji": "🔧",
      "shortcut": "Q",
      "description": {
        "description": "Indicates image quality problems.",
        "when_true": "Image has blur, noise, or other quality issues.",
        "when_false": "Image quality is acceptable for analysis."
      }
    }
  ]
}
```

#### Label Configuration Fields

- **column**: Internal identifier (must be unique)
- **display_name**: User-facing label text
- **emoji**: Visual indicator for the label
- **shortcut**: Keyboard shortcut (single character)
- **description**: Detailed explanations for classification guidance

### Directory Structure

```
RaspiScannerManualClassifier/
├── main.py                 # Flask backend application
├── .env                    # Environment configuration
├── configuration/
│   └── label_config.json   # Label definitions
├── images_to_classify/     # Source images for classification
├── outputs/                # CSV data and lock files
├── celebration/           # Celebration assets (videos, images)
├── dist/                  # Built frontend (after npm run build)
└── react-app/             # React frontend source
    ├── src/
    │   ├── components/     # React components
    │   ├── pages/         # Application pages
    │   ├── context/       # React context
    │   ├── hooks/         # Custom React hooks
    │   ├── api/           # API client
    │   └── types/         # TypeScript definitions
    └── package.json
```

## API Documentation

### Backend Endpoints

#### `GET /label_config`
Retrieves the current label configuration.

**Response:**
```json
{
  "labels": [
    {
      "column": "object_cross",
      "display_name": "SOMETHING CROSSES THE EDGE",
      "emoji": "⚠️",
      "shortcut": "A",
      "description": {
        "description": "Indicates whether something is inside of the region of interest.",
        "when_true": "Any object has a part in this area.",
        "when_false": "Area is clean and no object occupies the space in the region."
      }
    }
  ]
}
```

#### `GET /load_image`
Loads the next unprocessed image for classification.

**Parameters:**
- `username` (optional): Username for user-specific assignment

**Response:**
```json
{
  "status": "success",
  "image": {
    "image_path": "images_to_classify/example.jpg",
    "filename": "example.jpg",
    "labels": {"object_cross": false},
    "remaining": 42
  }
}
```

#### `POST /navigate`
Saves current classification and loads next image.

**Request Body:**
```json
{
  "current_path": "images_to_classify/example.jpg",
  "labels": {"object_cross": true},
  "reviewer": "username"
}
```

**Response:** Same as `/load_image`

#### `GET /get_progress`
Retrieves classification progress statistics.

**Response:**
```json
{
  "total": 100,
  "processed": 58,
  "percentage": 58.0
}
```

#### `GET /get_stats`
Retrieves reviewer statistics.

**Response:**
```json
{
  "stats": [
    {"reviewer": "user1", "count": 42},
    {"reviewer": "user2", "count": 16}
  ]
}
```

#### `GET /images/<path:filename>`
Serves image files from the recording directory.

#### `GET /celebration/<path:filename>`
Serves celebration assets.

### Frontend API Client

The React frontend uses a TypeScript API client located in [`react-app/src/api/client.ts`](react-app/src/api/client.ts) with the following methods:

- [`apiClient.loadImage(username)`](react-app/src/api/client.ts:109) - Load next image
- [`apiClient.navigate(data)`](react-app/src/api/client.ts:130) - Save and advance
- [`apiClient.getProgress()`](react-app/src/api/client.ts:154) - Get progress
- [`apiClient.getStats()`](react-app/src/api/client.ts:165) - Get statistics
- [`apiClient.getLabelConfig()`](react-app/src/api/client.ts:172) - Get label config
- [`apiClient.getImageUrl(filename)`](react-app/src/api/client.ts:186) - Generate image URL

## Contributing Guidelines

### Development Setup

1. **Backend Development:**
   ```bash
   uv run python main.py
   ```

2. **Frontend Development:**
   ```bash
   cd react-app
   npm run dev
   ```

3. **Code Quality:**
   ```bash
   # Backend (add linter to pyproject.toml)
   uv add black ruff
   uv run black main.py
   uv run ruff check main.py

   # Frontend
   cd react-app
   npm run lint
   ```

### Adding New Features

1. **Backend Changes:**
   - Add new routes to [`main.py`](main.py:110) in the `setup_routes()` method
   - Update the [`ImageClassifierApp`](main.py:21) class as needed
   - Ensure thread safety with the [`dataframe_access`](main.py:360) context manager

2. **Frontend Changes:**
   - Add new pages to [`react-app/src/pages/`](react-app/src/pages/)
   - Update routing in [`react-app/src/App.tsx`](react-app/src/App.tsx:24)
   - Add API methods to [`react-app/src/api/client.ts`](react-app/src/api/client.ts)

3. **Label Configuration:**
   - Update [`configuration/label_config.json`](configuration/label_config.json)
   - Follow the existing schema for new labels

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes with descriptive messages
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

#### "Frontend build not found" Error
**Problem**: Backend cannot find the built frontend files.

**Solution**:
```bash
cd react-app
npm run build
cd ..
```

#### "No unprocessed images available" Message
**Problem**: No images found for classification.

**Solution**:
- Ensure images are placed in the `images_to_classify/` directory
- Check that image files have supported extensions (.jpg, .png, etc.)
- Verify the `RMC_IMAGE_SOURCE_DIR` environment variable points to the correct directory

#### CSV File Corruption
**Problem**: Classification data becomes corrupted.

**Solution**:
- Stop all running instances of the application
- Delete the lock file: `rm outputs/classification_data.lock`
- Restart the application

#### Port Already in Use
**Problem**: Flask backend fails to start due to port conflict.

**Solution**:
- Change the port in [`main.py`](main.py:324): `app.run(host="0.0.0.0", port=5001)`
- Or kill the existing process: `pkill -f "python main.py"`

#### CORS Errors
**Problem**: Frontend cannot connect to backend.

**Solution**:
- Ensure backend is running on the correct port
- Check that `VITE_API_BASE` is set correctly in frontend environment
- Verify CORS headers are set in [`main.py`](main.py:112)

### Performance Tips

- **Large Image Sets**: For datasets with thousands of images, consider periodic CSV cleanup
- **Multiple Users**: The assignment system handles up to ~10 concurrent users effectively
- **Image Optimization**: Pre-process images to reasonable sizes for faster loading
- **Browser Caching**: Configure appropriate cache headers for static assets

### Debugging

Enable debug logging by setting environment variables:

```bash
export FLASK_DEBUG=1
export RMC_DEBUG=1
```

Check browser developer console for frontend debug messages and network requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the API documentation
3. Examine the browser console for errors
4. Check backend logs for detailed error messages