import numpy as np
import pytest
import soundfile as sf
import src.aligner as aligner


def test_align_words_formats_timestamps_and_flags_warnings(tmp_path, monkeypatch):
    wav_path = tmp_path / "sample.wav"
    sf.write(str(wav_path), np.zeros(16000, dtype=np.float32), 16000)

    # Mock WhisperX functions so unit tests run instantly without downloading models
    monkeypatch.setattr(aligner, "_get_align_model", lambda language_code, device: ("mock_model", "mock_meta"))
    monkeypatch.setattr(aligner.whisperx, "load_audio", lambda path: np.zeros(16000, dtype=np.float32))
    monkeypatch.setattr(
        aligner.whisperx,
        "align",
        lambda segments, model, meta, audio, device, return_char_alignments: {
            "word_segments": [
                {"word": "Tu", "start": 0.1234, "end": 0.2811, "score": 0.912},
                {"word": "viens", "start": 0.29, "end": 0.72, "score": 0.25},  # Low confidence
                {"word": "demain", "start": None, "end": None, "score": None},  # Failed alignment
            ]
        },
    )

    result = aligner.align_words(wav_path, "Tu viens demain ?")

    assert result["transcript"] == "Tu viens demain ?"
    assert len(result["words"]) == 3


    assert result["words"][0] == {"word": "Tu", "start": 0.123, "end": 0.281, "score": 0.912}

    
    assert result["words"][2] == {"word": "demain", "start": None, "end": None, "score": None}


    assert len(result["warnings"]) == 2
    assert any("Low alignment confidence" in w for w in result["warnings"])
    assert any("Could not confidently align" in w for w in result["warnings"])


def test_align_words_rejects_empty_transcript(tmp_path):
    wav_path = tmp_path / "sample.wav"
    sf.write(str(wav_path), np.zeros(16000, dtype=np.float32), 16000)

    with pytest.raises(ValueError, match="Transcript cannot be empty"):
        aligner.align_words(wav_path, "   ")