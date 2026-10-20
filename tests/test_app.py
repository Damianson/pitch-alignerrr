import io
import app as flask_app


def test_health_endpoint():
    client = flask_app.app.test_client()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_compare_rejects_missing_transcript():
    client = flask_app.app.test_client()
    response = client.post("/api/compare", data={})
    assert response.status_code == 400
    assert "transcript" in response.get_json()["error"]


def test_compare_rejects_unsupported_file_extension():
    client = flask_app.app.test_client()
    data = {
        "transcript": "Tu viens demain ?",
        "reference_audio": (io.BytesIO(b"fake data"), "ref.txt"),
        "learner_audio": (io.BytesIO(b"fake data"), "learner.wav"),
    }
    response = client.post(
        "/api/compare",
        data=data,
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    assert "Unsupported audio format" in response.get_json()["error"]


def test_compare_returns_json_on_valid_request(monkeypatch):
    client = flask_app.app.test_client()

    mock_payload = {
        "sentence": "Tu viens demain ?",
        "reference_duration_ms": 1800,
        "learner_duration_ms": 2300,
        "duration_difference_ms": 500,
        "words": [{"text": "Tu", "start_difference_ms": 20, "duration_difference_ms": 20}],
        "pitch": {"axis": [0.0], "reference": [0.1], "learner": [-0.2]},
        "warnings": [],
    }
    monkeypatch.setattr(flask_app, "compare_recordings", lambda ref, lrn, text: mock_payload)

    data = {
        "transcript": "Tu viens demain ?",
        "reference_audio": (io.BytesIO(b"RIFF....WAVE"), "reference.wav"),
        "learner_audio": (io.BytesIO(b"RIFF....WAVE"), "learner.wav"),
    }
    response = client.post(
        "/api/compare",
        data=data,
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    assert response.get_json() == mock_payload