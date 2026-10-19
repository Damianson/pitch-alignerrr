import subprocess
from pathlib import Path
from math import gcd
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly


TARGET_SR = 16000
MIN_DURATION_SEC = 0.5
MAX_DURATION_SEC = 30.0
SILENCE_THRESHOLD = 0.05  # Minimum amplitude to count as active speech

def convert_to_wav(input_path: str | Path) -> Path:
    source = Path(input_path)
    output = source.with_suffix(".wav")

    subprocess.run(
        ["ffmpeg", "-y", "-i", str(source), "-vn", "-c:a", "pcm_s16le", str(output)],
        check=True,
    )
    return output


def convert_folder_to_wav(folder_path: str | Path) -> list[Path]:
    folder = Path(folder_path)
    if not folder.is_dir():
        raise NotADirectoryError(f"Folder not found: {folder}")

    converted = []
    for source in sorted(folder.iterdir()):
        if not source.is_file() or source.suffix.lower() == ".wav":
            continue

        output = source.with_suffix(".wav")
        if output.exists():
            raise FileExistsError(f"Refusing to overwrite existing file: {output}")

        convert_to_wav(source)
        source.unlink()
        converted.append(output)

    return converted


def prepare_audio(input_path: str | Path, output_path: str | Path) -> dict:
    """Convert audio to the standard format used by the analyser."""
    input_path = Path(input_path)
    output_path = Path(output_path)

    if not input_path.exists():
        raise FileNotFoundError(f"Audio file not found: {input_path}")

    # 1. Read audio file as float32 numpy array
    try:
        data, sr = sf.read(str(input_path), dtype="float32")
    except Exception as exc:
        raise ValueError(f"Unreadable audio file '{input_path}': {exc}") from exc

    if data.size == 0:
        raise ValueError("Audio file is empty.")

    # Convert stereo to mono
    if data.ndim > 1:
        data = np.mean(data, axis=1).astype(np.float32)


    # Validate duration and check for pure silence.
    duration = len(data) / sr

    if duration < MIN_DURATION_SEC or duration > MAX_DURATION_SEC:
        raise ValueError("Audio duration is outside the allowed range.")

    if np.max(np.abs(data)) < SILENCE_THRESHOLD:
        raise ValueError("Audio is silent.")

    # Resample to 16kHz
    if sr != TARGET_SR:
        common = gcd(sr, TARGET_SR)
        data = resample_poly(data, TARGET_SR // common, sr // common).astype(np.float32)
        sr = TARGET_SR

    # Trim leading & trailing silence and record the start offset
    active_indices = np.where(np.abs(data) >= SILENCE_THRESHOLD)[0]
    if active_indices.size == 0:
        raise ValueError("Audio is silent.")

    pad = int(0.03 * sr)
    start_idx = max(0, int(active_indices[0]) - pad)
    end_idx = min(len(data), int(active_indices[-1]) + pad + 1)

    trimmed_offset_sec = start_idx / sr
    data = data[start_idx:end_idx]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(output_path), data, sr)

    return {
        "output_path": str(output_path),
        "sample_rate": sr,
        "duration_sec": round(len(data) / sr, 3),
        "trimmed_offset_sec": round(trimmed_offset_sec, 3),
    }