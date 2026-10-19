from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np


def _extract_series(frames: list[dict], key: str) -> tuple[list[float], list[float]]:
    """
    Helper that extracts time and a target pitch metric ('pitch_hz' or 'semitone_offset'),
    converting None into np.nan so Matplotlib leaves gaps for unvoiced frames.
    """
    times = [f["time"] for f in frames]
    values = [np.nan if f[key] is None else f[key] for f in frames]
    return times, values


def plot_pitch_contours(
    ref_analysis: dict,
    learner_analysis: dict,
    output_path: str | Path | None = None,
    show: bool = True,
) -> Path | None:
    ref_t, ref_hz = _extract_series(ref_analysis["frames"], "pitch_hz")
    ref_t, ref_st = _extract_series(ref_analysis["frames"], "semitone_offset")

    lrn_t, lrn_hz = _extract_series(learner_analysis["frames"], "pitch_hz")
    lrn_t, lrn_st = _extract_series(learner_analysis["frames"], "semitone_offset")


    fig, (ax_hz, ax_st) = plt.subplots(2, 1, figsize=(10, 7), sharex=True)

    ax_hz.plot(
    ref_t,
    ref_hz,
    label=f"Reference (median: {ref_analysis['median_hz']} Hz)",
    )
    ax_hz.plot(
        lrn_t,
        lrn_hz,
        label=f"Learner (median: {learner_analysis['median_hz']} Hz)",
    )
    ax_hz.set_title("Raw Pitch")
    ax_hz.set_ylabel("Frequency (Hz)")
    ax_hz.grid(True)
    ax_hz.legend()

    ax_st.plot(ref_t, ref_st, label="Reference")
    ax_st.plot(lrn_t, lrn_st, label="Learner")
    ax_st.axhline(0, color="gray", linestyle="--", linewidth=0.8)
    ax_st.set_title("Pitch Relative to Median")
    ax_st.set_xlabel("Time (seconds)")
    ax_st.set_ylabel("Semitones from Median")
    ax_st.grid(True)
    ax_st.legend()


    fig.tight_layout()

    saved_path = None
    if output_path is not None:
        saved_path = Path(output_path)
        saved_path.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(saved_path, dpi=150)

    if show:
        plt.show()

    plt.close(fig)
    return saved_path