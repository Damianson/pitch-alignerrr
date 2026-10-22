FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=5000

# Install system dependencies:
# - ffmpeg: required for audio format transcoding to 16kHz mono WAV
# - libsndfile1: required for soundfile audio decoding
# - git: required for huggingface / whisperx model downloads
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install lightweight CPU-only PyTorch first (avoids multi-gigabyte CUDA bloat)
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install backend Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the French wav2vec2 alignment model into the image so cold-start requests are fast
RUN python -c "import whisperx; whisperx.load_align_model('fr', device='cpu')"

# Copy backend source code
COPY app.py .
COPY src/ ./src/

# Expose default port (Render will inject $PORT dynamically at runtime)
EXPOSE 5000

# Single gunicorn worker with 4 threads to fit cleanly within Render's 512MB RAM tier
CMD ["sh", "-c", "exec gunicorn -w 1 --threads 4 --timeout 180 -b 0.0.0.0:${PORT:-5000} app:app"]

