from pathlib import Path
import gc
import soundfile as sf
import torch
import whisperx


DEFAULT_LANGUAGE = "fr"
MIN_ALIGNMENT_SCORE = 0.4  # Warn if WhisperX confidence score for a word is below this

# Cache the loaded alignment model so we don't reload it on every call
_MODEL_CACHE: dict[tuple[str, str], tuple[object, object]] = {}


def _get_align_model(language_code: str = DEFAULT_LANGUAGE, device: str = "cpu"):
    """Loads and caches the WhisperX forced-alignment model."""
    cache_key = (language_code, device)
    if cache_key not in _MODEL_CACHE:
        model_a, metadata = whisperx.load_align_model(
            language_code=language_code,
            device=device,
        )
        _MODEL_CACHE[cache_key] = (model_a, metadata)
    return _MODEL_CACHE[cache_key]


def align_words(
    audio_path: str | Path,
    transcript: str,
    language_code: str = DEFAULT_LANGUAGE,
    device: str = "cpu",
) -> dict:
    """
    Map a known written transcript to word-level start and end timestamps.
    """
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    clean_transcript = transcript.strip()
    if not clean_transcript:
        raise ValueError("Transcript cannot be empty.")

    audio = whisperx.load_audio(str(audio_path))
    info = sf.info(str(audio_path))
    duration = float(info.duration)

    # Load the cached French forced-alignment model
    model_a, metadata = _get_align_model(language_code=language_code, device=device)

    transcript_segments = [
        {
            "text": clean_transcript,
            "start": 0.0,
            "end": duration,
        }
    ]

    with torch.inference_mode():
        aligned = whisperx.align(
            transcript_segments,
            model_a,
            metadata,
            audio,
            device,
            return_char_alignments=False,
        )
    gc.collect()
    raw_words = aligned.get("word_segments", [])


    words = []
    warnings = []

    for item in raw_words:
        word_text = item.get("word", "").strip()
        start = item.get("start")
        end = item.get("end")
        score = item.get("score")

        if start is None or end is None:
            warnings.append(
                f"Could not confidently align word '{word_text}'."
            )
            words.append({
                "word": word_text,
                "start": None,
                "end": None,
                "score": None,
            })
            continue

        if score is not None and score < MIN_ALIGNMENT_SCORE:
            warnings.append(
                f"Low alignment confidence ({score:.2f}) for word '{word_text}'."
            )

        words.append({
            "word": word_text,
            "start": round(float(start), 3),
            "end": round(float(end), 3),
            "score": round(float(score), 3) if score is not None else None,
        })


    return {
        "transcript": clean_transcript,
        "words": words,
        "warnings": warnings,
    }