import av as pyav, numpy as np, librosa, whisper, torch, sys

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
fname = sys.argv[1] if len(sys.argv) > 1 else "temp.wav"
print("file:", fname, "device:", DEVICE)

frames = []
container = pyav.open(fname)
stream = container.streams.audio[0]
sr = stream.codec_context.sample_rate
fmt = str(stream.codec_context.format)
print("sample_rate:", sr, "format:", fmt)
for frame in container.decode(stream):
    arr = frame.to_ndarray()
    if arr.ndim == 2:
        arr = arr.mean(axis=0)
    frames.append(arr)
container.close()

data = np.concatenate(frames).astype(np.float32)
print("shape:", data.shape, "min:", round(float(data.min()),4), "max:", round(float(data.max()),4), "rms:", round(float(np.sqrt(np.mean(data**2))),6))

if "fltp" not in fmt and "flt" not in fmt:
    mv = max(abs(data.max()), abs(data.min()), 1e-9)
    if mv > 1.0:
        data = data / mv

if sr != 16000:
    data = librosa.resample(data, orig_sr=sr, target_sr=16000)

wm = whisper.load_model("base", device=DEVICE)
result = wm.transcribe(data, fp16=(DEVICE=="cuda"))
print("transcription:", repr(result["text"]))
