# SABRINA LISTENS 🎧

**SABRINA LISTENS** is a modern, high-performance desktop music application. It allows users to paste music links (Spotify tracks, albums, playlists, artists, YouTube videos, and direct audio files), inspect song metadata and album artwork, choose desired audio bitrates and formats, and download them with automated ID3 tagging and FFmpeg transcoding.

Runs **100% free of cost** on your local machine without any cloud server billing or paid subscription requirements. Featuring an animated Headphones Sound Waves ASCII background and a sharp two-tone black & red interface.

---

## 🌟 Key Features

- **Multi-Source URL Recognition**:
  - **Spotify**: Individual tracks, albums, curated playlists, artist catalogs (with automated metadata resolution).
  - **YouTube**: Videos, audio streams, and playlists.
  - **Direct Audio URLs**: `.mp3`, `.m4a`, `.flac`, `.wav`, `.ogg`, `.opus`.
  - Automatic URL normalization, tracking query stripping (`?si=...`, `?utm_source=...`), and shortened link resolution (`spotify.link`).
- **Rich Track & Collection Browser**:
  - Full album artwork, release dates, track numbers, and explicit content indicators.
  - Granular selection: choose individual songs, select all, or batch-download entire albums/playlists.
- **Accurate Audio Quality & Transcoding**:
  - **Original Source Quality**: Direct stream passthrough (~160 kbps Opus/AAC).
  - **MP3 320 kbps**: Maximum MP3 bitrate with high-fidelity encoding.
  - **MP3 256 kbps / 192 kbps**: Standard high-efficiency MP3s.
  - **AAC / M4A (256 kbps)**: Apple/mobile compatible AAC container.
  - **FLAC**: Lossless audio container.
  - **Transparent Labeling**: Clear UI alerts distinguishing genuine source audio bitrate from output transcode bitrate.
- **Dedicated Download Queue**:
  - Job-based worker queue with concurrency controls (default 3 concurrent downloads).
  - Real-time updates via **Server-Sent Events (SSE)**.
  - Per-track live progress percentage, download speed (`MB/s`), and ETA.
  - Overall playlist progress bar.
  - Job pause, cancellation, and retry for failed items. One failed track does not abort the playlist.
- **Automated Metadata & ID3 Tagging**:
  - Writes ID3 tags (Title, Artist, Album, Track Number, Year) using `mutagen`.
  - Downloads and embeds high-resolution album cover artwork directly into MP3/M4A/FLAC files.
  - Clean filesystem organization: `Downloads/Artist/Album/01 - Track Title.mp3`.
  - Windows-safe filename sanitization (strips `\ / : * ? " < > |`) and overwrite protection.
- **Offline Library & Integrated Player**:
  - Download history indexed in SQLite.
  - In-browser HTML5 audio player with scrub bar and volume slider.
  - One-click "Reveal in Folder" button for Windows Explorer / system file manager.
- **Security & Reliability**:
  - Built-in SSRF protection blocking localhost, internal IP ranges (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`), loopbacks, and cloud metadata (`169.254.169.254`).
  - Safe subprocess argument arrays (never constructing shell strings).

---

## 🏗️ Architecture

```
                                  URL Input
                                      |
                                      v
                             SSRF & URL Validation
                                      |
                                      v
                          Spotify / Media Metadata
                                      |
                                      v
                        Track / Album / Playlist View
                                      |
                                      v
                        Track Selection & Quality Pick
                                      |
                                      v
                            Audio Stream Discovery
                                      |
                                      v
                           Worker Queue (Asyncio)
                                      |
                                      v
                             Live Audio Retrieval
                                      |
                                      v
                          Optional FFmpeg Transcode
                                      |
                                      v
                           mutagen Tagging & Art
                                      |
                                      v
                           Completed Audio File
```

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Python 3.10+, FastAPI, SQLite, SQLAlchemy, Pydantic v2.
- **Processing**: `yt-dlp`, `mutagen`, `imageio-ffmpeg` / system `ffmpeg`.

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**

### Option A: One-Click Windows Launch
Double-click `start.bat` in the project root:
```bat
start.bat
```
This automatically boots the server and opens `http://127.0.0.1:8000` in your default browser.

---

### Option B: Manual Local Development

#### 1. Start the Backend
```bash
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Start the Frontend Dev Server
In a second terminal:
```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start Vite development server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🛠️ FFmpeg Setup

The application automatically checks for FFmpeg using:
1. `imageio-ffmpeg` bundled high-performance Windows FFmpeg binary (included automatically in the virtual environment).
2. System `PATH` (`ffmpeg` in terminal).
3. Stremio, Jellyfin, Scoop, or Winget default install directories.
4. Custom path configured in the in-app **Settings** modal or `FFMPEG_PATH` in `.env`.

To install FFmpeg globally if desired:
- **Windows**: `winget install Gyan.FFmpeg`
- **macOS**: `brew install ffmpeg`
- **Ubuntu/Debian**: `sudo apt install ffmpeg`

---

## 🧪 Running Automated Tests

A comprehensive suite of automated tests covers SSRF security, URL parsing, filename sanitization, overwrite protection, and REST API endpoints.

To run the tests:
```bash
cd backend
.\venv\Scripts\pytest -v
```

All 19 test cases will run and pass:
```
tests/test_api_routes.py::test_health_check PASSED
tests/test_api_routes.py::test_settings_get_and_update PASSED
tests/test_api_routes.py::test_downloads_queue_get PASSED
tests/test_api_routes.py::test_history_get_and_clear PASSED
tests/test_api_routes.py::test_resolve_invalid_url PASSED
tests/test_file_manager.py::test_file_manager_path_generation PASSED
tests/test_file_manager.py::test_file_manager_avoid_overwrite PASSED
tests/test_security.py::test_ip_restriction PASSED
tests/test_security.py::test_ssrf_blocking PASSED
tests/test_security.py::test_filename_sanitization PASSED
tests/test_security.py::test_path_component_sanitization PASSED
tests/test_url_parser.py::test_strip_tracking_params PASSED
tests/test_url_parser.py::test_parse_spotify_track PASSED
tests/test_url_parser.py::test_parse_spotify_album PASSED
tests/test_url_parser.py::test_parse_spotify_playlist PASSED
tests/test_url_parser.py::test_parse_spotify_artist PASSED
tests/test_url_parser.py::test_parse_youtube PASSED
tests/test_url_parser.py::test_parse_direct_audio PASSED
tests/test_url_parser.py::test_parse_invalid_url PASSED
======================= 19 passed in 1.5s ========================
```

---

## ⚙️ Configuration Reference

Copy `backend/.env.example` to `backend/.env` to adjust default settings:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `HOST` | `127.0.0.1` | Local backend host |
| `PORT` | `8000` | Backend port |
| `OUTPUT_DIRECTORY` | `~/Downloads/SabrinaListens` | Completed audio directory |
| `MAX_CONCURRENT_DOWNLOADS` | `3` | Maximum simultaneous downloads |
| `FFMPEG_PATH` | `""` | Optional manual path to `ffmpeg.exe` |
| `SPOTIFY_CLIENT_ID` | `""` | Optional developer client ID |
| `SPOTIFY_CLIENT_SECRET` | `""` | Optional developer client secret |

---

## 🔒 Security Measures

- **SSRF Prevention**: All inbound URLs are parsed and evaluated before any network connection is established. Non-HTTP(S) schemes, localhost, and internal/private subnet IPs (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `169.254.169.254`) are immediately rejected.
- **Sanitized Subprocess Execution**: FFmpeg is invoked exclusively via argument lists (e.g., `[ffmpeg_bin, "-y", "-i", input, ...]`) with `shell=False`.
- **Filesystem Security**: Directory traversal attempts (`..`, illegal Windows characters) are stripped and sanitized.
