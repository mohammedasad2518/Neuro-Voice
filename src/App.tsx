import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, MicOff, Upload, Trash2, Star, Play, Square, Loader2, Volume2, 
  ChevronDown, Sparkles, BookOpen, Music, Settings, Info, RefreshCw, 
  Scissors, Copy, ZoomIn, ZoomOut, FileText, CheckCircle2, AlertTriangle,
  PlayCircle, PauseCircle, VolumeX
} from "lucide-react";

const API = "http://localhost:8000";

// ── Helpers ──────────────────────────────────────────────────────────────────

function preprocessText(raw: string): string {
  let t = raw.trim().replace(/\s+/g, " ");
  const abbr: Record<string, string> = {
    "Dr.": "Doctor", "Mr.": "Mister", "Mrs.": "Misses", "Ms.": "Miss",
    "Prof.": "Professor", "Sr.": "Senior", "Jr.": "Junior",
    "e.g.": "for example", "i.e.": "that is", "etc.": "etcetera",
  };
  Object.entries(abbr).forEach(([k, v]) => { t = t.replaceAll(k, v); });
  t = t.replace(/\b\d+\b/g, (n) => {
    const words = ["zero","one","two","three","four","five","six","seven","eight","nine","ten",
      "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
    const num = parseInt(n);
    return num < words.length ? words[num] : n;
  });
  return t;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Voice { 
  id: string; 
  name: string; 
  path: string; 
  favorite: boolean; 
  ref_text?: string;
}

type Step = "idle" | "preprocessing" | "inference" | "done";

// ── Pipeline Indicator ────────────────────────────────────────────────────────

const STEPS = ["Text Input", "Preprocessing", "Neural Inference", "Audio Output"];

function Pipeline({ step }: { step: Step }) {
  const idx = step === "idle" ? 0 : step === "preprocessing" ? 1 : step === "inference" ? 2 : 3;
  return (
    <div className="flex items-center justify-between w-full bg-secondary/30 border border-border/40 rounded-xl p-4 mb-6">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        ML Pipeline
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-500
              ${i < idx ? "bg-primary/10 text-primary border border-primary/30" :
                i === idx ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" :
                "bg-secondary/50 text-muted-foreground border border-border/50"}`}>
              {i === idx && step !== "idle" && step !== "done" && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              {i < idx && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
              {s}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-0.5 transition-all duration-500 ${i < idx ? "bg-primary" : "bg-border/60"}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Voice Card ────────────────────────────────────────────────────────────────

function VoiceCard({ voice, selected, onSelect, onDelete, onToggleFav, onRename }: {
  voice: Voice; selected: boolean;
  onSelect: () => void; onDelete: () => void;
  onToggleFav: () => void; onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(voice.name);

  return (
    <div onClick={onSelect} className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300
      ${selected ? "border-primary bg-primary/10 shadow-lg shadow-primary/5" : "border-border bg-card/50 hover:border-primary/40 hover:bg-card"}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border font-bold text-xs uppercase
        ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"}`}>
        {voice.name.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            className="bg-transparent border-b border-primary text-sm text-foreground outline-none w-full"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => { setEditing(false); onRename(name); }}
            onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onRename(name); } }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
            className="text-sm font-semibold text-foreground truncate">{voice.name}</p>
        )}
        <p className="text-xs text-muted-foreground truncate">{voice.favorite ? "★ Favorite Profile" : "Double-click to rename"}</p>
      </div>
      <button onClick={e => { e.stopPropagation(); onToggleFav(); }}
        className={`p-1.5 rounded-lg transition-colors ${voice.favorite ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-secondary"}`}>
        <Star className="w-4 h-4" fill={voice.favorite ? "currentColor" : "none"} />
      </button>
      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1.0);
  const [language, setLanguage] = useState("English");
  const [step, setStep] = useState<Step>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [showVoices, setShowVoices] = useState(true);

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [useLocalWhisper, setUseLocalWhisper] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const originalTextRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);

  // Load initial voices on mount
  useEffect(() => {
    loadVoices();
  }, []);

  async function loadVoices() {
    try {
      const res = await fetch(`${API}/voices`);
      const data: Voice[] = await res.json();
      setVoices(data);
      if (data.length > 0 && !selectedVoice) setSelectedVoice(data[0].id);
      setVoicesLoaded(true);
    } catch { 
      setError("Cannot reach backend server. Please verify uvicorn is running on port 8000."); 
    }
  }

  async function generate() {
    if (!text.trim()) return;
    setError(null);
    setAudioUrl(null);
    setStep("preprocessing");
    const processed = preprocessText(text);
    await new Promise(r => setTimeout(r, 600));
    setStep("inference");
    try {
      const params = new URLSearchParams({ text: processed, speed: String(speed) });
      if (selectedVoice) params.append("voice_id", selectedVoice);
      params.append("language", language);

      const res = await fetch(`${API}/generate?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const generatedUrl = URL.createObjectURL(blob);
      setAudioUrl(generatedUrl);
      setStep("done");



    } catch (e: any) {
      setError(e.message);
      setStep("idle");
    }
  }

  // Support standard and webkit prefixes for browser native SpeechRecognition API
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  async function startLocalWhisperRecording() {
    setError(null);
    setTranscribing(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const totalBytes = chunksRef.current.reduce((s, c) => s + c.size, 0);
        if (totalBytes < 100) {
          setError("Recording too short or empty. Please speak clearly.");
          setTranscribing(false);
          return;
        }

        setTranscribing(true);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("ogg") ? "ogg" : "webm";

        try {
          const fd = new FormData();
          fd.append("file", blob, `recording.${ext}`);
          const res = await fetch(`${API}/speech-to-text`, { method: "POST", body: fd });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.detail || `Server error ${res.status}`);
          }
          const { text: t } = await res.json();
          if (t?.trim()) {
            setText(prev => prev ? prev.trim() + " " + t.trim() : t.trim());
          } else {
            setError("Nothing was transcribed. Please speak clearly and try again.");
          }
        } catch (err: any) {
          setError("Transcription failed: " + err.message);
        } finally {
          setTranscribing(false);
        }
      };

      mr.start(100);
      mediaRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      setError("Microphone access denied or unavailable: " + e.message);
      setRecording(false);
    }
  }

  async function startRecording() {
    setError(null);
    if (useLocalWhisper) {
      await startLocalWhisperRecording();
      return;
    }

    if (!SpeechRecognition) {
      setError("Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      originalTextRef.current = text;

      rec.onstart = () => {
        setRecording(true);
      };

      rec.onerror = (e: any) => {
        if (e.error === "network") {
          console.warn("Web Speech API network error. Falling back to local Whisper model.");
          setError("Browser speech recognition network error. Switching to local Whisper AI model...");
          rec.stop();
          setUseLocalWhisper(true);
          startLocalWhisperRecording();
        } else if (e.error !== "no-speech") {
          setError("Speech recognition error: " + e.error);
        }
      };

      rec.onend = () => {
        setRecording(false);
        setTranscribing(false);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptChunk;
          } else {
            interimTranscript += transcriptChunk;
          }
        }

        const sessionTranscript = (finalTranscript + interimTranscript).trim();
        const baseText = originalTextRef.current.trim();
        setText(baseText ? `${baseText} ${sessionTranscript}` : sessionTranscript);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e: any) {
      setError("Failed to start speech recognition: " + e.message);
    }
  }

  function stopRecording() {
    if (useLocalWhisper) {
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
      setRecording(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setRecording(false);
    }
  }

  async function uploadVoice(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/clone-voice?name=${encodeURIComponent(file.name.replace(/\.[^.]+$/, ""))}`, { method: "POST", body: fd });
      const v: Voice = await res.json();
      
      // Request updated list to grab Whisper generated transcript context
      await loadVoices();
      setSelectedVoice(v.id);
    } catch { 
      setError("Voice upload failed. Please verify files are valid audio clips."); 
    } finally { 
      setUploading(false); 
    }
  }

  async function deleteVoice(id: string) {
    await fetch(`${API}/voice/${id}`, { method: "DELETE" });
    setVoices(prev => prev.filter(v => v.id !== id));
    if (selectedVoice === id) setSelectedVoice(voices.find(v => v.id !== id)?.id ?? null);
  }

  async function toggleFav(id: string) {
    const v = voices.find(x => x.id === id)!;
    await fetch(`${API}/voice/${id}?favorite=${!v.favorite}`, { method: "PATCH" });
    setVoices(prev => prev.map(x => x.id === id ? { ...x, favorite: !x.favorite } : x));
  }

  async function renameVoice(id: string, name: string) {
    await fetch(`${API}/voice/${id}?name=${encodeURIComponent(name)}`, { method: "PATCH" });
    setVoices(prev => prev.map(x => x.id === id ? { ...x, name } : x));
  }



  const busy = step === "preprocessing" || step === "inference";

  return (
    <div className="flex h-screen bg-[#0B0B0C] text-[#EBEBEF] overflow-hidden select-none">
      
      {/* ── Left Sidebar ──────────────────────────────────────────────────────── */}
      <div className="w-16 bg-[#111113] border-r border-[#1C1C1F] flex flex-col items-center py-6 justify-between flex-shrink-0">
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-5 h-5 text-[#0B0B0C]" />
          </div>

          <div className="w-8 h-px bg-[#1C1C1F] my-2" />

          {/* Studio Workspace Tab (Active indicator) */}
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5">
            <Music className="w-5 h-5" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-[#18181B] flex items-center justify-center font-bold text-xs border border-border text-primary">
            AD
          </div>
        </div>
      </div>

      {/* ── Main Content Container ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header Bar */}
        <div className="h-14 border-b border-[#1C1C1F] bg-[#111113] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-wider text-primary">NeuroVoice</span>
            <span className="h-4 w-px bg-[#1C1C1F]" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-[#18181B] px-2.5 py-1 rounded-full border border-border/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>GPU Acceleration (CUDA Active)</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setError(null); loadVoices(); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors hover:bg-secondary/40 border border-border/20"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT PANE: Synthesizer Editor */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Pipeline */}
              <Pipeline step={step} />

              {/* Professional Unified Synthesize Box */}
              <div className="bg-[#111113] border border-[#1C1C1F] rounded-2xl shadow-xl shadow-[#000]/40 overflow-hidden">
                <div className="p-4 border-b border-[#1C1C1F]/60 flex items-center justify-between bg-card/10">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Synthesizer Input</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border/30">
                    {text.length} characters
                  </span>
                </div>

                <div className="p-1">
                  <textarea
                    className="w-full h-36 bg-transparent border-0 outline-none focus:ring-0 p-4 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none font-sans leading-relaxed"
                    placeholder="Enter text here to generate neural speech..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                  />
                </div>

                {/* Bottom Toolbar - "In line with the box" */}
                <div className="px-4 py-3 bg-[#131316] border-t border-[#1C1C1F] flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                    
                    {/* Dictate Button */}
                    <button
                      onClick={recording ? stopRecording : startRecording}
                      disabled={transcribing}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                        ${recording ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse" : "bg-[#18181B] text-foreground hover:bg-secondary border-border/60"}`}
                    >
                      {transcribing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : recording ? (
                        <MicOff className="w-3.5 h-3.5" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-primary" />
                      )}
                      {transcribing ? "Transcribing..." : recording ? "Stop" : "Dictate"}
                    </button>

                    {/* Speed Controls */}
                    <div className="flex items-center gap-2 bg-[#18181B] border border-border/40 px-3 py-1.5 rounded-lg">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Speed: {speed.toFixed(1)}x</span>
                      <input 
                        type="range" min="0.5" max="2" step="0.1" value={speed}
                        onChange={e => setSpeed(parseFloat(e.target.value))}
                        className="w-16 accent-primary cursor-pointer h-1 rounded-lg" 
                      />
                    </div>

                    {/* Language Selection */}
                    <div className="flex items-center gap-2 bg-[#18181B] border border-border/40 px-3 py-1.5 rounded-lg">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Language:</span>
                      <select
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        className="bg-transparent text-foreground text-xs outline-none cursor-pointer font-medium border-0 p-0 focus:ring-0"
                      >
                        <option value="English" className="bg-[#111113]">English</option>
                        <option value="Hindi" className="bg-[#111113]">Hindi (हिन्दी)</option>
                        <option value="Telugu" className="bg-[#111113]">Telugu (తెలుగు)</option>
                        <option value="Chinese" className="bg-[#111113]">Chinese (中文)</option>
                        <option value="Japanese" className="bg-[#111113]">Japanese (日本語)</option>
                        <option value="Korean" className="bg-[#111113]">Korean (한국어)</option>
                        <option value="Spanish" className="bg-[#111113]">Spanish (Español)</option>
                        <option value="French" className="bg-[#111113]">French (Français)</option>
                        <option value="German" className="bg-[#111113]">German (Deutsch)</option>
                        <option value="Cantonese" className="bg-[#111113]">Cantonese (粤语)</option>
                      </select>
                    </div>

                  </div>

                  {/* Generate Button - Placed at bottom-right of box */}
                  <button
                    onClick={generate}
                    disabled={busy || !text.trim()}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-[#0B0B0C] text-xs font-bold
                      hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/10 flex-shrink-0"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {step === "preprocessing" ? "Preprocessing..." : step === "inference" ? "Generating..." : "Generate Speech"}
                  </button>
                </div>
              </div>

              {/* Dictation Mode Selector */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground px-1 bg-[#111113]/30 border border-[#1C1C1F]/60 rounded-xl p-3.5">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-primary/75">Dictation Engine:</span>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                  <input
                    type="radio"
                    name="stt-mode"
                    checked={!useLocalWhisper}
                    onChange={() => setUseLocalWhisper(false)}
                    className="accent-primary"
                  />
                  Real-time Browser Dictation (Cloud)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                  <input
                    type="radio"
                    name="stt-mode"
                    checked={useLocalWhisper}
                    onChange={() => setUseLocalWhisper(true)}
                    className="accent-purple-500"
                  />
                  Local Whisper AI Model (Offline & Private)
                </label>
              </div>

              {/* Live Audio output preview */}
              {audioUrl && (
                <div className="bg-[#111113] border border-primary/30 rounded-2xl p-5 space-y-3 shadow-lg shadow-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-primary" /> Recent Generation Preview
                    </span>
                  </div>
                  <audio ref={audioRef} src={audioUrl} controls autoPlay className="w-full rounded-lg accent-primary" />
                </div>
              )}

              {/* Error log container */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

            </div>

            {/* RIGHT PANE: Voice Library Profiles */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#111113] border border-[#1C1C1F] rounded-2xl overflow-hidden shadow-xl shadow-[#000]/40">
                <div 
                  onClick={() => setShowVoices(v => !v)}
                  className="w-full flex items-center justify-between p-5 text-sm font-semibold text-foreground hover:bg-secondary/20 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Volume2 className="w-4 h-4 text-primary" />
                    <span>Voice Library Profiles</span>
                    {voices.length > 0 && (
                      <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold">
                        {voices.length} Available
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showVoices ? "rotate-180" : ""}`} />
                </div>

                {showVoices && (
                  <div className="px-5 pb-5 space-y-4 border-t border-[#1C1C1F]/40 pt-4">
                    
                    {/* Drag-and-drop Upload Area */}
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-3.5 p-4 border border-dashed border-[#1C1C1F] rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-all duration-300 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                        {uploading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Upload Voice Profile</p>
                        <p className="text-xs text-muted-foreground truncate">WAV / MP3 sample (5–30 seconds recommended)</p>
                      </div>
                    </div>
                    <input ref={fileRef} type="file" accept="audio/*" className="hidden"
                      onChange={e => e.target.files?.[0] && uploadVoice(e.target.files[0])} />

                    {/* Profiles List */}
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                      {voices.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">No voice profiles loaded. Add one to begin.</p>
                      ) : (
                        [...voices].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)).map(v => (
                          <div key={v.id} className="space-y-1">
                            <VoiceCard
                              voice={v}
                              selected={selectedVoice === v.id}
                              onSelect={() => setSelectedVoice(v.id)}
                              onDelete={() => deleteVoice(v.id)}
                              onToggleFav={() => toggleFav(v.id)}
                              onRename={name => renameVoice(v.id, name)}
                            />
                            {/* Display transcribed reference text if available for clarity in ICL mode */}
                            {v.ref_text && selectedVoice === v.id && (
                              <div className="text-[10px] text-muted-foreground/80 bg-secondary/20 p-2.5 rounded-lg border border-border/30 mt-1 mx-1 font-mono italic">
                                <span className="font-bold text-primary not-italic">Ref Text (ICL Prompt): </span>
                                "{v.ref_text}"
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
