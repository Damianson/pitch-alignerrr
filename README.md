# PitchAlignerrr — French Prosody & Intonation Diagnostic Workbench

PitchAlignerrr is a full-stack acoustic phonetics and forced-alignment tool designed to help language learners practice French sentence intonation, rhythm, and cadence. Given a written French transcript, a native reference recording, and a learner recording, the system extracts fundamental frequency ($F_0$) contours, normalizes speaker vocal ranges into relative semitones, aligns word boundaries via WhisperX, and generates actionable vocal coaching feedback alongside word-aligned pitch and timing visualizations.

---

## Why This Exists

Standard language-learning applications evaluate pronunciation using speech-to-text word recognition—meaning a learner can pronounce every French word intelligibly while still speaking with a flat melody or uneven cadence.

Comparing two speakers' intonation directly on a raw frequency-over-time graph fails for two acoustic reasons:

1. **Different Baseline Vocal Ranges:** A reference speaker with a $233.86\text{ Hz}$ median voice and a learner with a $108.03\text{ Hz}$ median voice sit more than an octave apart on a raw Hertz scale, even when producing the exact same relative melody.
2. **Cumulative Timing Drift:** If a learner stretches a single early word, every subsequent word shifts to the right on an elapsed-seconds axis, making direct visual pitch comparison impossible.

PitchAlignerrr solves both problems by normalizing pitch into **semitones relative to each speaker's median voiced pitch** and warping the comparison axis onto **relative word progress** using forced phoneme alignment.

---

## System Architecture & Signal Pipeline

The backend is structured as a modular five-stage pipeline inside `src/`, exposed via a stateless Flask API (`app.py`) and consumed by a React, Vite, and Recharts frontend (`frontend/`).

```text
Raw Audio (.wav, .mp3, .m4a, .ogg, .flac, .webm)
  │
  ├─► 1. src/audio.py     ──► FFmpeg WAV conversion, mono mixdown, 16 kHz resampling, silence trimming
  │
  ├─► 2. src/pitch.py     ──► Praat F0 extraction (75–500 Hz), median semitone normalization, outlier filtering
  │
  ├─► 3. src/aligner.py   ──► WhisperX French forced alignment (wav2vec2) against known written transcript
  │
  ├─► 4. src/comparer.py  ──► Word duration/start deltas (ms) & 10-point per-word pitch contour warping
  │
  └─► 5. app.py / React   ──► JSON telemetry + deterministic plain-English vocal coaching & Recharts UI
```

### 1. Audio Standardization (`src/audio.py`)
* Converts uploaded `.mp3`, `.m4a`, `.ogg`, `.flac`, or `.webm` files into standard `.wav` format via FFmpeg (`convert_to_wav`).
* Mixes stereo channels to mono, resamples audio to $16\text{ kHz}$ using polyphase filtering (`scipy.signal.resample_poly`), and trims leading and trailing silence using an amplitude threshold (`SILENCE_THRESHOLD = 0.05`) tuned on raw user recordings to strip trailing mic clicks and exhale noise.
* Enforces duration guardrails ($0.5\text{ s}$ minimum, $30.0\text{ s}$ maximum) and rejects silent recordings before downstream processing.

### 2. $F_0$ Pitch Extraction & Semitone Normalization (`src/pitch.py`)
* Uses `praat-parselmouth` (`Sound.to_pitch_ac`) with a $10\text{ ms}$ time step ($0.01\text{ s}$) across a $75\text{ Hz}$ to $500\text{ Hz}$ human speech frequency range.
* **Unvoiced Frame Preservation:** Consonants and pauses where the vocal cords do not vibrate are preserved as `None` (`null` in JSON) rather than interpolated or zero-filled, preventing false downward spikes on the chart.
* **Median Semitone Normalization:** Converts voiced frequencies $F_0(t)$ into semitone offsets $P(t)$ relative to the speaker's own median voiced frequency:
  $$P(t) = 12 \times \log_2\left(\frac{F_0(t)}{\text{median}(F_0)}\right)$$
* **Harmonic Outlier Filtering:** Rejects implausible single-frame octave jumps exceeding $\pm 12.0$ semitones from the speaker's median (`MAX_SEMITONE_DEVIATION = 12.0`) and logs a diagnostic warning.

### 3. Forced Word Alignment (`src/aligner.py`)
* Uses **WhisperX** (`whisperx.load_align_model` with `language_code="fr"`) to map the known written French transcript directly onto the prepared audio waveform without running heavy speech-to-text transcription.
* Caches the loaded French `wav2vec2` alignment model in memory (`_MODEL_CACHE`) so subsequent requests execute in approximately $1\text{ s}$ on CPU.
* Flags low-confidence word alignments (`score < 0.4`) or unaligned words in a structured `warnings` array so uncertain timestamps are never silently presented as high-confidence facts.

### 4. Word-Progress Pitch Warping & Timing Deltas (`src/comparer.py`)
* Computes word-level duration differences (`duration_difference_ms`) and cumulative start-time drift (`start_difference_ms`) in integer milliseconds.
* Samples `POINTS_PER_WORD = 10` evenly spaced relative progress steps ($0\%$ to $90\%$) across each aligned word window (`[start, end]`), mapping both speakers onto a shared word-indexed horizontal axis (`0.0..0.9` for Word $0$, `1.0..1.9` for Word $1$, etc.).

### 5. Web API & Coaching Interface (`app.py` & `frontend/`)
* **`GET /api/health`**: Returns `{"status": "ok"}` for service readiness checks.
* **`POST /api/compare`**: Accepts multipart form uploads (`transcript`, `reference_audio`, `learner_audio`) with a $15\text{ MB}$ upload limit, extension whitelisting, automatic non-WAV conversion, and guaranteed temporary directory cleanup (`shutil.rmtree` inside a `finally` block).
* **Frontend Workbench:** Built with React, Vite, and Recharts.
  * **Actionable Vocal Coaching (*"How to improve your next take"*):** Deterministically analyzes word duration ratios and per-word semitone spans to give beginner-friendly coaching advice (e.g., which specific words to shorten to fix rhythm drift, where to lift pitch for French continuation rises, and where to drop pitch at sentence-final cadences), paired with exact millisecond and semitone metrics.
  * **Word-Aligned Pitch Contour:** Plots reference and learner semitone trajectories across aligned word boundaries with `connectNulls={false}` so unvoiced segments render as clean acoustic gaps.
  * **Word Timing Log:** Displays tabular-nums millisecond breakdowns for reference duration, learner duration, duration difference, and cumulative start drift.

---

## API Contract (`POST /api/compare`)

### Request (`multipart/form-data`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `transcript` | `string` | Exact written French sentence spoken in both recordings |
| `reference_audio` | `File` | Native reference audio file (`.wav`, `.mp3`, `.m4a`, `.ogg`, `.flac`, `.webm`) |
| `learner_audio` | `File` | Learner recording file (`.wav`, `.mp3`, `.m4a`, `.ogg`, `.flac`, `.webm`) |

### Response (`200 OK` JSON)
```json
{
  "sentence": "Vont jouer là, vers l'heure où le soleil se montre",
  "reference_duration_ms": 2796,
  "learner_duration_ms": 3539,
  "duration_difference_ms": 743,
  "words": [
    {
      "text": "Vont",
      "reference_start_ms": 141,
      "learner_start_ms": 281,
      "reference_duration_ms": 221,
      "learner_duration_ms": 282,
      "start_difference_ms": 140,
      "duration_difference_ms": 61
    }
  ],
  "pitch": {
    "axis": [0.0, 0.1, 0.2, 0.3],
    "reference": [0.12, 3.45, 6.81, null],
    "learner": [1.85, 2.91, 4.12, null]
  },
  "warnings": [
    "Reference: Low alignment confidence (0.26) for word 'Vont'."
  ]
}
```

---

## Engineering & Debugging Highlights

During early verification on raw, unedited recordings using our CLI inspection tool (`plot_pitch.py`), Matplotlib charts revealed brief $+25\text{ semitone}$ spikes ($\approx 480\text{ Hz}$) at the end of a $108\text{ Hz}$ male learner recording, compressing the Y-axis scale.

Inspecting the raw waveform and Praat pitch frames uncovered two root causes:
1. **Trailing Breath & Mic Artifacts:** Low-amplitude trailing breath noise ($0.01$ to $0.04$ amplitude) kept the tail of the raw recording above the initial `0.01` silence threshold, and Praat's autocorrelation tracker mistook high-frequency breath hiss for a $\approx 480\text{ Hz}$ harmonic.
2. **Two-Part Fix:** We tuned `SILENCE_THRESHOLD` to `0.05` in `src/audio.py` to strip trailing breath artifacts and introduced a `MAX_SEMITONE_DEVIATION = 12.0` ($\pm 1\text{ octave}$) outlier filter in `src/pitch.py`, eliminating false harmonic jumps while recording transparent diagnostic warnings.

---

## Project Structure

```text
pitch-alignerrr/
├── app.py                  # Flask API (/api/health, /api/compare) with upload safeguards
├── plot_pitch.py           # CLI tool for generating Matplotlib pitch inspection charts
├── requirements.txt        # Python backend dependencies
├── src/
│   ├── audio.py            # FFmpeg conversion, mono mixdown, 16 kHz resampling, silence trimming
│   ├── pitch.py            # Parselmouth F0 extraction, semitone normalization, outlier filtering
│   ├── plotter.py          # Matplotlib dual-subplot inspection visualizer
│   ├── aligner.py          # WhisperX French forced word alignment with model caching
│   └── comparer.py         # Word timing deltas & relative word-progress pitch interpolation
├── tests/                  # Offline pytest suite (13 unit & API tests)
│   ├── test_audio.py
│   ├── test_pitch.py
│   ├── test_aligner.py
│   ├── test_comparer.py
│   └── test_app.py
└── frontend/               # React + Vite + Recharts acoustic comparison & coaching UI
```

---

## Local Setup & Quickstart

### Prerequisites
* **Python 3.10+** (tested with Python 3.12 on Ubuntu WSL2 / Linux)
* **Node.js 18+** and `npm`
* **FFmpeg** installed on your system path:
  ```bash
  sudo apt update && sudo apt install -y ffmpeg
  ```

### 1. Backend Installation
Create a virtual environment and install the CPU build of PyTorch alongside the project requirements:

```bash
python3 -m venv .venv-whisperx
source .venv-whisperx/bin/activate

# Install CPU-only PyTorch and torchaudio
python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install project dependencies
python -m pip install -r requirements.txt
```

### 2. Run the Automated Test Suite
All 13 unit and API tests run offline in under a second using synthetic sine waves and mocked alignment outputs:

```bash
pytest
```

### 3. Optional: Run the CLI Pitch Inspector
To generate a two-panel Matplotlib comparison chart (`pitch_comparison.png`) directly from two audio files without starting the web server:

```bash
python plot_pitch.py samples/sample_33594624/reference.wav samples/sample_33594624/learner.wav --no-show
```

### 4. Start the Flask Backend API
```bash
python app.py
```
The API server will start on `http://127.0.0.1:5000`. You can verify readiness with:
```bash
curl http://127.0.0.1:5000/api/health
```

### 5. Start the React Frontend
Open a second terminal window and launch the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown in your terminal (typically `http://localhost:5173`), upload a native reference clip and your recording (or click **Load example**), enter the French transcript, and click **Compare**.