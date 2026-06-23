import librosa
import numpy as np
import os
import json
from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import torch
import whisper
import soundfile as sf
import uuid
from qwen_tts import Qwen3TTSModel

app = FastAPI(title="NeuroVoice AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_PATH = "Qwen/Qwen3-TTS-12Hz-0.6B-Base"
VOICES_DIR = "voices_library"
VOICES_META = "voices_meta.json"
OUTPUT_DIR = "."

os.makedirs(VOICES_DIR, exist_ok=True)


# ── Metadata helpers ──────────────────────────────────────────────────────────

def load_meta() -> list:
    if os.path.exists(VOICES_META):
        with open(VOICES_META, "r") as f:
            return json.load(f)
    return []


def save_meta(data: list):
    with open(VOICES_META, "w") as f:
        json.dump(data, f, indent=2)


# ── Model loading ─────────────────────────────────────────────────────────────

print(f"Using device: {DEVICE}")
print("Loading Qwen3-TTS model…")
tts = Qwen3TTSModel.from_pretrained(
    MODEL_PATH,
    device_map=DEVICE,
    dtype=torch.bfloat16 if DEVICE == "cuda" else torch.float32,
    attn_implementation="sdpa",
)
print("TTS model ready.")

print("Loading Whisper model…")
whisper_model = whisper.load_model("base", device=DEVICE)
print("Whisper ready.")


def backfill_voice_transcriptions():
    """Transcribe any existing voices that are missing ref_text for ICL accent matching."""
    meta = load_meta()
    updated = False
    for entry in meta:
        if "ref_text" not in entry or not entry.get("ref_text", "").strip():
            file_path = entry.get("path")
            if file_path and os.path.exists(file_path):
                print(f"Backfilling transcription for existing voice: {entry['name']}")
                try:
                    import librosa
                    data, sr = librosa.load(file_path, sr=16000)
                    result = whisper_model.transcribe(data, fp16=(DEVICE == "cuda"))
                    entry["ref_text"] = result.get("text", "").strip()
                    print(f"Transcribed successfully: {len(entry['ref_text'])} characters.")
                    updated = True
                except Exception as e:
                    print(f"Failed to transcribe {file_path}: {e}")
                    entry["ref_text"] = ""
                    updated = True
    if updated:
        save_meta(meta)


backfill_voice_transcriptions()


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "NeuroVoice AI backend running"}


@app.get("/generate")
def generate(
    text: str = Query(...),
    speed: float = Query(1.0),
    voice_id: str = Query(None),
    language: str = Query("English"),
):
    """Generate speech from text using Qwen3-TTS with reference voice cloning."""

    # Resolve reference audio and text for ICL
    ref_audio = None
    ref_text = None
    if voice_id:
        meta = load_meta()
        entry = next((v for v in meta if v["id"] == voice_id), None)
        if entry and os.path.exists(entry["path"]):
            ref_audio = entry["path"]
            ref_text = entry.get("ref_text", None)

    # Fallback: last uploaded voice
    if ref_audio is None and os.path.exists("uploaded_voice.wav"):
        ref_audio = "uploaded_voice.wav"

    if ref_audio is None:
        return {"error": "No reference voice found. Upload a voice sample first."}

    # Map input language to Qwen3-TTS supported languages (or 'auto')
    lang_map = {
        "english": "english",
        "chinese": "chinese",
        "japanese": "japanese",
        "korean": "korean",
        "spanish": "spanish",
        "french": "french",
        "german": "german",
        "italian": "italian",
        "portuguese": "portuguese",
        "russian": "russian",
        "cantonese": "chinese",
        "hindi": "auto",
        "telugu": "auto",
    }
    target_lang = lang_map.get(language.lower(), "auto")

    # Use In-Context Learning (ICL) if reference text transcript is available
    use_icl = ref_audio is not None and ref_text is not None and len(ref_text.strip()) > 0

    wavs, sr = tts.generate_voice_clone(
        text=text,
        language=target_lang,
        ref_audio=ref_audio,
        ref_text=ref_text if use_icl else None,
        x_vector_only_mode=not use_icl,
    )

    audio = wavs[0]

    if speed != 1.0:
        audio = librosa.effects.time_stretch(audio, rate=float(speed))

    file_path = f"output_{uuid.uuid4()}.wav"
    sf.write(file_path, audio, sr)

    return FileResponse(file_path, media_type="audio/wav")


@app.post("/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    """Transcribe audio using OpenAI Whisper.
    Uses PyAV to decode any browser-recorded format (webm, ogg, wav, mp3).
    """
    import av as pyav

    tmp_in = f"temp_{uuid.uuid4()}.audio"
    content = await file.read()
    with open(tmp_in, "wb") as f:
        f.write(content)
    # save a copy for debugging
    with open("last_recording.audio", "wb") as f:
        f.write(content)
    print(f"[STT] received {len(content)} bytes, filename={file.filename}, content_type={file.content_type}")

    try:
        # Decode with PyAV (handles webm/opus, ogg, wav, mp3, etc.)
        frames = []
        with pyav.open(tmp_in) as container:
            stream = container.streams.audio[0]
            sample_rate = stream.codec_context.sample_rate
            fmt = str(stream.codec_context.format)
            for frame in container.decode(stream):
                arr = frame.to_ndarray()  # shape: (channels, samples)
                if arr.ndim == 2:
                    arr = arr.mean(axis=0)  # stereo/planar -> mono
                frames.append(arr)

        if not frames:
            raise HTTPException(status_code=400, detail="No audio data found")

        data = np.concatenate(frames).astype(np.float32)

        # Only normalize if integer PCM (fltp/flt are already -1..1)
        if "fltp" not in fmt and "flt" not in fmt:
            max_val = max(abs(data.max()), abs(data.min()), 1e-9)
            if max_val > 1.0:
                data = data / max_val

        # Resample to 16 kHz (Whisper requirement)
        if sample_rate != 16000:
            data = librosa.resample(data, orig_sr=sample_rate, target_sr=16000)

        result = whisper_model.transcribe(data, fp16=(DEVICE == "cuda"))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_in):
            os.remove(tmp_in)

    return {"text": result["text"]}


@app.post("/clone-voice")
async def clone_voice(
    file: UploadFile = File(...),
    name: str = Query("My Voice"),
):
    """Upload and store a reference voice sample."""
    voice_id = str(uuid.uuid4())
    original_ext = os.path.splitext(file.filename or "voice.wav")[1] or ".wav"
    file_path = os.path.join(VOICES_DIR, f"{voice_id}{original_ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Also store as fallback active voice
    with open("uploaded_voice.wav", "wb") as f:
        f.write(content)

    # Automatically transcribe reference voice using Whisper to save ref_text for ICL mode
    ref_text = ""
    try:
        import librosa
        data, sr = librosa.load(file_path, sr=16000)
        result = whisper_model.transcribe(data, fp16=(DEVICE == "cuda"))
        ref_text = result.get("text", "").strip()
        print(f"[CLONE] Transcribed reference voice text size: {len(ref_text)} characters.")
    except Exception as e:
        print(f"[CLONE] Whisper transcription failed for voice sample: {e}")

    meta = load_meta()
    meta.append({"id": voice_id, "name": name, "path": file_path, "favorite": False, "ref_text": ref_text})
    save_meta(meta)

    return {"id": voice_id, "name": name, "message": "Voice uploaded successfully"}


@app.get("/voices")
def get_voices():
    """Return all saved voice profiles."""
    return load_meta()


@app.delete("/voice/{voice_id}")
def delete_voice(voice_id: str):
    """Delete a saved voice."""
    meta = load_meta()
    entry = next((v for v in meta if v["id"] == voice_id), None)
    if not entry:
        return {"error": "Voice not found"}
    if os.path.exists(entry["path"]):
        os.remove(entry["path"])
    save_meta([v for v in meta if v["id"] != voice_id])
    return {"message": "Voice deleted"}


@app.patch("/voice/{voice_id}")
def update_voice(
    voice_id: str,
    name: str = Query(None),
    favorite: bool = Query(None),
):
    """Rename or toggle favorite on a voice."""
    meta = load_meta()
    for v in meta:
        if v["id"] == voice_id:
            if name is not None:
                v["name"] = name
            if favorite is not None:
                v["favorite"] = favorite
            save_meta(meta)
            return v
    return {"error": "Voice not found"}
