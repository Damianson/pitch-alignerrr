import shutil
import tempfile
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

from src.audio import convert_to_wav
from src.comparer import compare_recordings


ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm"}
MAX_UPLOAD_MB = 15

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024


def _is_allowed_file(filename: str) -> bool:
    """Checks whether the uploaded filename has a supported audio extension."""
    return bool(filename) and Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def _save_and_ensure_wav(file_storage, dest_dir: Path, prefix: str) -> Path:
    """Saves an uploaded file safely and converts it to WAV if needed."""
    safe_name = secure_filename(file_storage.filename or "")
    ext = Path(safe_name).suffix.lower()
    saved_path = dest_dir / f"{prefix}{ext}"
    file_storage.save(str(saved_path))

    if ext != ".wav":
        return convert_to_wav(saved_path)
    return saved_path


@app.get("/")
def index():
    return jsonify({
        "service": "PitchAlignerrr Acoustic Phonetics API",
        "status": "online",
        "health": "/api/health",
        "compare": "/api/compare"
    })


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/compare")
def compare():
    transcript = request.form.get("transcript", "").strip()
    if not transcript:
        return jsonify({"error": "Missing 'transcript' field."}), 400

    ref_file = request.files.get("reference_audio")
    lrn_file = request.files.get("learner_audio")

    if (
        ref_file is None
        or not ref_file.filename
        or lrn_file is None
        or not lrn_file.filename
    ):
        return jsonify({
            "error": "Both 'reference_audio' and 'learner_audio' files are required."
        }), 400

    if (
        not _is_allowed_file(ref_file.filename)
        or not _is_allowed_file(lrn_file.filename)
    ):
        return jsonify({"error": "Unsupported audio format."}), 400


    tmp_dir = Path(tempfile.mkdtemp(prefix="pitchalignerrr_"))
    try:
        ref_wav = _save_and_ensure_wav(ref_file, tmp_dir, "reference")
        lrn_wav = _save_and_ensure_wav(lrn_file, tmp_dir, "learner")
        
        result = compare_recordings(ref_wav, lrn_wav, transcript)
        return jsonify(result), 200


    except ValueError as exc:
        # Useful 400 error for silent audio, invalid duration, or unreadable files
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Comparison failed: {exc}"}), 500
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        pass


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 7860 if os.environ.get("SPACE_ID") else 5000))
    app.run(host="0.0.0.0", port=port)