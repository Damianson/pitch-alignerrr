import numpy as np
import pytest
import soundfile as sf
from src.pitch import analyze_pitch, normalize_pitch


def _create_two_tone_wav(path, f1: float, f2: float, sr: int = 16000):
    """Creates 0.4s of f1 Hz, 0.2s of silence (unvoiced), and 0.4s of f2 Hz."""
    t = np.linspace(0, 0.4, int(sr * 0.4), endpoint=False)
    tone1 = 0.5 * np.sin(2 * np.pi * f1 * t)
    silence = np.zeros(int(0.2 * sr), dtype=np.float32)
    tone2 = 0.5 * np.sin(2 * np.pi * f2 * t)
    audio = np.concatenate([tone1, silence, tone2]).astype(np.float32)
    sf.write(str(path), audio, sr)


def test_proportional_pitch_rise_and_unvoiced_frames(tmp_path):
    high_speaker = tmp_path / "speaker_150_180.wav"
    low_speaker = tmp_path / "speaker_100_120.wav"

    _create_two_tone_wav(high_speaker, 150.0, 180.0)
    _create_two_tone_wav(low_speaker, 100.0, 120.0)

    res_high = analyze_pitch(high_speaker)
    res_low = analyze_pitch(low_speaker)

    # 1. Unvoiced middle section must be preserved as None
    assert any(f["pitch_hz"] is None and f["semitone_offset"] is None for f in res_high["frames"])

    # 2. Both speakers have a 1.2x rise (~3.16 semitones total range)
    st_high = [f["semitone_offset"] for f in res_high["frames"] if f["semitone_offset"] is not None]
    st_low = [f["semitone_offset"] for f in res_low["frames"] if f["semitone_offset"] is not None]

    rise_high = max(st_high) - min(st_high)
    rise_low = max(st_low) - min(st_low)

    assert np.isclose(rise_high, 12.0 * np.log2(180.0 / 150.0), atol=0.15)
    assert np.isclose(rise_high, rise_low, atol=0.15)


def test_normalize_pitch_handles_all_unvoiced_frames():
    frames = [
        {"time": 0.0, "pitch_hz": None},
        {"time": 0.01, "pitch_hz": None},
    ]
    result = normalize_pitch(frames)

    assert result["median_hz"] is None
    assert result["voiced_ratio"] == 0.0
    assert "No voiced pitch detected." in result["warnings"]
    assert all(f["semitone_offset"] is None for f in result["frames"])