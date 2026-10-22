from pathlib import Path
import numpy as np
import parselmouth


DEFAULT_TIME_STEP = 0.01      # 10 ms per frame
DEFAULT_PITCH_FLOOR = 75.0    # Minimum human speech pitch in Hz
DEFAULT_PITCH_CEILING = 500.0 # Maximum human speech pitch in Hz
MIN_VOICED_RATIO = 0.15       # Warn if fewer than 15% of frames have a detectable pitch
MAX_SEMITONE_DEVIATION = 12.0  # Reject harmonic/octave-jump outliers (>1 octave from median)


def extract_pitch(
    audio_path: str | Path,
    time_step: float = DEFAULT_TIME_STEP,
    pitch_floor: float = DEFAULT_PITCH_FLOOR,
    pitch_ceiling: float = DEFAULT_PITCH_CEILING,
) -> list[dict]:
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    sound = parselmouth.Sound(str(audio_path))
    pitch = sound.to_pitch(
        time_step=time_step,
        pitch_floor=pitch_floor,
        pitch_ceiling=pitch_ceiling,
    )

    times = pitch.xs()
    frequencies = pitch.selected_array["frequency"]

    frames = []
    for t, freq in zip(times, frequencies):
        pitch_val = None if freq <= 0 else round(float(freq), 2)
        frames.append({"time": round(float(t), 4), "pitch_hz": pitch_val})
    return frames


def normalize_pitch(frames: list[dict]) -> dict:
    if not frames:
        raise ValueError("Cannot normalize an empty pitch frame sequence.")

    voiced_values = [
        frame["pitch_hz"]
        for frame in frames
        if frame["pitch_hz"] is not None
    ]
    voiced_ratio = len(voiced_values) / len(frames)
    warnings = []

    if not voiced_values:
        warnings.append("No voiced pitch detected.")
        return {
            "frames": [
                {
                    "time": frame["time"],
                    "pitch_hz": frame["pitch_hz"],
                    "semitone_offset": None,
                }
                for frame in frames
            ],
            "median_hz": None,
            "voiced_ratio": round(voiced_ratio, 3),
            "warnings": warnings,
        }

    if voiced_ratio < MIN_VOICED_RATIO:
        warnings.append("Pitch estimates are sparse and may be unreliable.")
    

    median_hz = float(np.median(voiced_values))
    normalized_frames = []

    outlier_count = 0
    for frame in frames:
        pitch_hz = frame["pitch_hz"]

        if pitch_hz is None:
            semitone = None
        else:
            semitone = round(
                float(12.0 * np.log2(pitch_hz / median_hz)),
                3,
            )
            if abs(semitone) > MAX_SEMITONE_DEVIATION:
                pitch_hz = None
                semitone = None
                outlier_count += 1

        normalized_frames.append({
            "time": frame["time"],
            "pitch_hz": pitch_hz,
            "semitone_offset": semitone,
        })

    if outlier_count > 0:
        warnings.append(f"Filtered {outlier_count} implausible pitch outlier frame(s).")
    


    return {
        "frames": normalized_frames,
        "median_hz": round(median_hz, 2),
        "voiced_ratio": round(voiced_ratio, 3),
        "warnings": warnings,
    }


def analyze_pitch(
    audio_path: str | Path,
    time_step: float = DEFAULT_TIME_STEP,
    pitch_floor: float = DEFAULT_PITCH_FLOOR,
    pitch_ceiling: float = DEFAULT_PITCH_CEILING,
) -> dict:
    """Extracts raw pitch frames and normalizes them."""
    raw_frames = extract_pitch(
        audio_path,
        time_step=time_step,
        pitch_floor=pitch_floor,
        pitch_ceiling=pitch_ceiling,
    )
    return normalize_pitch(raw_frames)