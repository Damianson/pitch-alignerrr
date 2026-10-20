import tempfile
from pathlib import Path
from src.audio import prepare_audio
from src.pitch import analyze_pitch
from src.aligner import align_words

POINTS_PER_WORD = 10  # Number of relative progress steps sampled per word

def compare_word_timings(
    ref_words: list[dict],
    learner_words: list[dict],
) -> tuple[list[dict], list[str]]:
    """
    Compare start times and durations (in ms) for corresponding words between the reference and learner recordings.
    """
    comparisons = []
    warnings = []

    if len(ref_words) != len(learner_words):
        warnings.append(
            f"Word count mismatch between reference ({len(ref_words)}) "
            f"and learner ({len(learner_words)})."
        )

    for ref_w, lrn_w in zip(ref_words, learner_words):
        word_text = ref_w.get("word", "")

        ref_start, ref_end = ref_w.get("start"), ref_w.get("end")
        lrn_start, lrn_end = lrn_w.get("start"), lrn_w.get("end")

        if any(value is None for value in (ref_start, ref_end, lrn_start, lrn_end)):
            warnings.append(
                f"Skipping timing comparison for '{word_text}' due to missing alignment timestamps."
            )
            comparisons.append({
                "text": word_text,
                "reference_start_ms": None,
                "learner_start_ms": None,
                "reference_duration_ms": None,
                "learner_duration_ms": None,
                "start_difference_ms": None,
                "duration_difference_ms": None,
            })
            continue


        ref_start_ms = round(ref_start * 1000)
        lrn_start_ms = round(lrn_start * 1000)
        ref_dur_ms = round((ref_end - ref_start) * 1000)
        lrn_dur_ms = round((lrn_end - lrn_start) * 1000)

        start_diff_ms = lrn_start_ms - ref_start_ms
        dur_diff_ms = lrn_dur_ms - ref_dur_ms

        comparisons.append({
            "text": word_text,
            "reference_start_ms": ref_start_ms,
            "learner_start_ms": lrn_start_ms,
            "reference_duration_ms": ref_dur_ms,
            "learner_duration_ms": lrn_dur_ms,
            "start_difference_ms": start_diff_ms,
            "duration_difference_ms": dur_diff_ms,
        })


    return comparisons, warnings

def _sample_word_pitch(
    frames: list[dict],
    word_start: float | None,
    word_end: float | None,
    num_points: int = POINTS_PER_WORD,
) -> list[float | None]:
    """
    Samples `num_points` normalized semitone values across a single word's [start, end] window.
    Preserves None if the word wasn't aligned or if the nearest frame is unvoiced.
    """
    if word_start is None or word_end is None or word_end <= word_start or not frames:
        return [None] * num_points

    word_frames = [f for f in frames if word_start <= f["time"] <= word_end]
    if not word_frames:
        return [None] * num_points

    sampled = []
    for i in range(num_points):
        progress = i / num_points
        target_time = word_start + progress * (word_end - word_start)
        # Pick the frame inside this word closest to target_time
        nearest_frame = min(word_frames, key=lambda f: abs(f["time"] - target_time))
        sampled.append(nearest_frame["semitone_offset"])

    return sampled


def align_pitch_by_words(
    ref_frames: list[dict],
    learner_frames: list[dict],
    ref_words: list[dict],
    learner_words: list[dict],
    points_per_word: int = POINTS_PER_WORD,
) -> dict:
    """
    Associate pitch samples with matching words over relative word progress so both speakers share a common comparison axis.
    """
    axis = []
    reference_curve = []
    learner_curve = []

    for word_idx, (ref_w, lrn_w) in enumerate(zip(ref_words, learner_words)):
        reference_curve.extend(
            _sample_word_pitch(
                ref_frames,
                ref_w.get("start"),
                ref_w.get("end"),
                points_per_word,
            )
        )
        learner_curve.extend(
            _sample_word_pitch(
                learner_frames,
                lrn_w.get("start"),
                lrn_w.get("end"),
                points_per_word,
            )
        )

        for step in range(points_per_word):
            axis.append(round(word_idx + step / points_per_word, 2))


    return {
        "axis": axis,
        "reference": reference_curve,
        "learner": learner_curve,
    }


def compare_recordings(
    reference_path: str | Path,
    learner_path: str | Path,
    transcript: str,
) -> dict:
    clean_transcript = transcript.strip()
    if not clean_transcript:
        raise ValueError("Transcript cannot be empty.")

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        ref_clean = tmp_path / "reference_clean.wav"
        lrn_clean = tmp_path / "learner_clean.wav"

        ref_meta = prepare_audio(reference_path, ref_clean)
        lrn_meta = prepare_audio(learner_path, lrn_clean)
        
        ref_pitch = analyze_pitch(ref_clean)
        lrn_pitch = analyze_pitch(lrn_clean)
        
        ref_align = align_words(ref_clean, clean_transcript)
        lrn_align = align_words(lrn_clean, clean_transcript)
        
        word_comparisons, timing_warnings = compare_word_timings(
            ref_align["words"],
            lrn_align["words"],
        )
        
        pitch_comparison = align_pitch_by_words(
            ref_pitch["frames"],
            lrn_pitch["frames"],
            ref_align["words"],
            lrn_align["words"],
        )

    ref_dur_ms = round(ref_meta["duration_sec"] * 1000)
    lrn_dur_ms = round(lrn_meta["duration_sec"] * 1000)

    all_warnings = (
        [f"Reference: {w}" for w in ref_pitch["warnings"] + ref_align["warnings"]]
        + [f"Learner: {w}" for w in lrn_pitch["warnings"] + lrn_align["warnings"]]
        + timing_warnings
    )

    return {
        "sentence": clean_transcript,
        "reference_duration_ms": ref_dur_ms,
        "learner_duration_ms": lrn_dur_ms,
        "duration_difference_ms": lrn_dur_ms - ref_dur_ms,
        "words": word_comparisons,
        "pitch": pitch_comparison,
        "warnings": all_warnings,
    }