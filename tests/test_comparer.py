from src.comparer import compare_word_timings, align_pitch_by_words


def test_compare_word_timings_calculates_differences_and_handles_missing():
    ref_words = [
        {"word": "Tu", "start": 0.12, "end": 0.28},
        {"word": "viens", "start": 0.29, "end": 0.62},
        {"word": "demain", "start": 0.76, "end": 1.41},
    ]
    lrn_words = [
        {"word": "Tu", "start": 0.14, "end": 0.32},
        {"word": "viens", "start": 0.33, "end": 0.74},
        {"word": "demain", "start": None, "end": None},
    ]

    comparisons, warnings = compare_word_timings(ref_words, lrn_words)

    assert len(comparisons) == 3
    # "Tu": ref_dur=160ms, lrn_dur=180ms -> +20ms duration diff, +20ms start diff
    assert comparisons[0]["reference_duration_ms"] == 160
    assert comparisons[0]["learner_duration_ms"] == 180
    assert comparisons[0]["duration_difference_ms"] == 20
    assert comparisons[0]["start_difference_ms"] == 20

    # "demain" has missing learner timestamps -> None values and a warning
    assert comparisons[2]["duration_difference_ms"] is None
    assert len(warnings) == 1
    assert "demain" in warnings[0]


def test_align_pitch_by_words_builds_common_axis():
    ref_frames = [
        {"time": 0.10, "pitch_hz": 200.0, "semitone_offset": -1.0},
        {"time": 0.20, "pitch_hz": 220.0, "semitone_offset": 0.5},
        {"time": 0.30, "pitch_hz": None, "semitone_offset": None},
    ]
    lrn_frames = [
        {"time": 0.20, "pitch_hz": 100.0, "semitone_offset": -0.8},
        {"time": 0.40, "pitch_hz": 110.0, "semitone_offset": 0.4},
    ]
    ref_words = [{"word": "Tu", "start": 0.10, "end": 0.30}]
    lrn_words = [{"word": "Tu", "start": 0.20, "end": 0.40}]

    pitch_data = align_pitch_by_words(
        ref_frames,
        lrn_frames,
        ref_words,
        lrn_words,
        points_per_word=4,
    )

    assert pitch_data["axis"] == [0.0, 0.25, 0.5, 0.75]
    assert len(pitch_data["reference"]) == 4
    assert len(pitch_data["learner"]) == 4
    assert pitch_data["reference"][0] == -1.0
    assert pitch_data["learner"][0] == -0.8