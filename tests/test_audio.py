import numpy as np
import pytest
import soundfile as sf
from src.audio import prepare_audio, TARGET_SR


def test_prepare_audio_converts_stereo_resamples_and_trims(tmp_path):
    raw_file = tmp_path / "raw_stereo.wav"
    out_file = tmp_path / "prepared.wav"
    orig_sr = 44100

    # 0.2s leading silence + 0.8s 220Hz sine wave + 0.2s trailing silence (2 channels)
    silence = np.zeros((int(0.2 * orig_sr), 2), dtype=np.float32)
    t = np.linspace(0, 0.8, int(0.8 * orig_sr), endpoint=False)
    tone = np.column_stack([0.5 * np.sin(2 * np.pi * 220 * t)] * 2).astype(np.float32)
    stereo_data = np.vstack([silence, tone, silence])

    sf.write(str(raw_file), stereo_data, orig_sr)

    result = prepare_audio(raw_file, out_file)

    assert out_file.exists()
    assert result["sample_rate"] == TARGET_SR
    assert 0.15 <= result["trimmed_offset_sec"] <= 0.21

    processed_data, processed_sr = sf.read(str(out_file))
    assert processed_sr == TARGET_SR
    assert processed_data.ndim == 1  # Mono


def test_prepare_audio_rejects_silence(tmp_path):
    silent_file = tmp_path / "silent.wav"
    sf.write(str(silent_file), np.zeros(16000, dtype=np.float32), 16000)

    with pytest.raises(ValueError, match="silent"):
        prepare_audio(silent_file, tmp_path / "out.wav")


def test_prepare_audio_rejects_too_short_clip(tmp_path):
    short_file = tmp_path / "short.wav"
    sf.write(str(short_file), np.ones(1600, dtype=np.float32) * 0.5, 16000)  # 0.1 sec

    with pytest.raises(ValueError, match="duration"):
        prepare_audio(short_file, tmp_path / "out.wav")