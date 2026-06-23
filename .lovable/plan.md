

# NeuroVoice — Neural Text-to-Speech Web App

A clean, academic-focused TTS application that converts text into human-like speech using a pre-trained neural network model (ElevenLabs).

---

## 1. Landing Page & Text Input
- App title "NeuroVoice" with a subtitle explaining it's a neural TTS demo
- A large, centered textarea for entering text (with character count)
- A prominent "Generate Voice" button below the input
- Simple, clean layout with a modern academic feel

## 2. Text Preprocessing
- Before sending text to the TTS model, apply preprocessing:
  - Trim whitespace and normalize spacing
  - Expand common abbreviations (e.g., "Dr." → "Doctor", "Mr." → "Mister")
  - Handle numbers (convert digits to words)
  - Display a brief "preprocessing" step indicator so the ML pipeline is visible

## 3. Neural TTS Generation (Backend)
- Set up a Supabase edge function that calls the ElevenLabs TTS API (a pre-trained neural network model)
- Connect the ElevenLabs API key via the connector system
- The edge function receives preprocessed text and returns generated audio

## 4. Audio Playback
- After generation, display a built-in audio player to play the speech
- Show a loading/spinner animation while audio is being generated
- Allow replaying the generated audio

## 5. ML Pipeline Visualization
- Show a simple step-by-step indicator: **Text Input → Preprocessing → Neural Inference → Audio Output**
- Each step highlights as it completes, making the ML workflow clear for academic demonstration

