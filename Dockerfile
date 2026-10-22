FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860

# Install system dependencies:
# - ffmpeg: required for audio format transcoding to 16kHz mono WAV
# - libsndfile1: required for soundfile audio decoding
# - git: required for model downloads
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set up non-root user with UID 1000 (standard requirement for Hugging Face Spaces)
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

# Install lightweight CPU-only PyTorch first (avoids multi-gigabyte CUDA bloat)
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install backend Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Switch to non-root user before caching model so permissions match
USER user

# Pre-download the French wav2vec2 alignment model into ~/.cache for instant cold-starts
RUN python -c "import whisperx; whisperx.load_align_model('fr', device='cpu')"

# Copy backend source code with correct ownership
COPY --chown=user:user app.py .
COPY --chown=user:user src/ ./src/

# Expose port (7860 is default for Hugging Face Spaces; Render dynamically overrides via $PORT)
EXPOSE 7860

# Run with Gunicorn (binds to $PORT or default 7860)
CMD ["sh", "-c", "exec gunicorn -w 1 --threads 4 --timeout 180 -b 0.0.0.0:${PORT:-7860} app:app"]
