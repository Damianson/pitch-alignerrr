import argparse
import tempfile
from pathlib import Path
from src.audio import prepare_audio
from src.pitch import analyze_pitch
from src.plotter import plot_pitch_contours


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare two recordings and plot their raw and normalized pitch contours."
    )
    parser.add_argument("reference", type=Path, help="Path to the reference audio file")
    parser.add_argument("learner", type=Path, help="Path to the learner audio file")
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("pitch_comparison.png"),
        help="Path to save the output PNG chart (default: pitch_comparison.png)",
    )
    parser.add_argument(
        "--no-show",
        action="store_true",
        help="Save the plot to a file without opening an interactive window",
    )
    args = parser.parse_args()

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        ref_clean = tmp_path / "reference_clean.wav"
        lrn_clean = tmp_path / "learner_clean.wav"

        ref_meta = prepare_audio(args.reference, ref_clean)
        lrn_meta = prepare_audio(args.learner, lrn_clean)

        ref_pitch = analyze_pitch(ref_clean)
        lrn_pitch = analyze_pitch(lrn_clean)

    print(f"Reference: duration={ref_meta['duration_sec']}s, median={ref_pitch['median_hz']} Hz, voiced={ref_pitch['voiced_ratio']*100:.1f}%")
    print(f"Learner:   duration={lrn_meta['duration_sec']}s, median={lrn_pitch['median_hz']} Hz, voiced={lrn_pitch['voiced_ratio']*100:.1f}%")

    saved = plot_pitch_contours(
        ref_pitch,
        lrn_pitch,
        output_path=args.output,
        show=not args.no_show,
    )
    if saved:
        print(f"Saved pitch contour plot to: {saved}")


if __name__ == "__main__":
    main()