# ==============================================================================
# SABRINA LISTENS — Multi-Stage Production Dockerfile for Render.com & Cloud
# ==============================================================================

# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend + System FFmpeg
FROM python:3.11-slim
WORKDIR /app

# Install system FFmpeg and clean up apt cache
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend

# Copy compiled frontend from Stage 1 into the directory served by FastAPI
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Production and Cloud Mode Environment Variables
ENV APP_ENV=production
ENV CLOUD_MODE=true
ENV OUTPUT_DIRECTORY=/tmp/downloads
ENV TEMP_DIRECTORY=/tmp/temp_downloads
ENV PORT=8000

WORKDIR /app/backend
EXPOSE 8000

# Start Uvicorn dynamically binding to the port injected by Render ($PORT)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
