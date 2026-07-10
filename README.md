<div align="center">

# 🧠 NeuroVoice AI

### Intelligent Voice Cloning • Text-to-Speech • Speech-to-Text

Create realistic AI-generated voices, clone any voice from a short sample, and convert speech to text using state-of-the-art Transformer models.

<img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript"/>
<img src="https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css"/>
<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi"/>
<img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch"/>
<img src="https://img.shields.io/badge/OpenAI-Whisper-black?style=for-the-badge&logo=openai"/>
<img src="https://img.shields.io/badge/Qwen3--TTS-AI-orange?style=for-the-badge"/>
<img src="https://img.shields.io/badge/CUDA-GPU-green?style=for-the-badge&logo=nvidia"/>
<img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge"/>

---

*A modern AI-powered speech platform that combines Voice Cloning, Neural Text-to-Speech and Speech Recognition into one application.*

</div>

---

# 📖 Overview

NeuroVoice AI is a modern web-based speech generation platform powered by Transformer-based Deep Learning models.

The application enables users to clone voices from short audio samples, generate highly natural speech, and convert spoken audio into text using advanced Artificial Intelligence.

Unlike traditional Text-to-Speech systems, NeuroVoice preserves speaker characteristics such as tone, accent and speaking style, producing realistic human-like audio.

---

# ✨ Features

| Feature | Description |
|---------|-------------|
| 🎙 Voice Cloning | Clone voices from 5–30 second audio samples |
| 🗣 Text-to-Speech | Generate realistic speech from text |
| 🎤 Speech-to-Text | Browser STT + Offline Whisper |
| 🌍 Multi-language | Supports multiple languages |
| ❤️ Voice Library | Save, rename and manage voices |
| ⚡ GPU Acceleration | CUDA support with CPU fallback |
| 🎵 Playback Speed | 0.5x – 2x playback |
| 📥 Audio Download | Export generated speech |
| 🔄 Real-time Processing | Fast inference pipeline |
| 🎨 Modern UI | Glassmorphism Dark Theme |

---


# 🏗 System Architecture

```
                User
                  │
                  ▼
        React + TypeScript UI
                  │
            REST API Requests
                  │
                  ▼
            FastAPI Backend
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
 Qwen3-TTS Model     Whisper Model
        │                   │
 Voice Generation     Speech Recognition
        │                   │
        └─────────┬─────────┘
                  ▼
            Audio Processing
                  │
                  ▼
          Final Audio Output
```

---

# ⚙ AI Workflow

```
User Input
     │
     ▼
Text Preprocessing
     │
     ▼
Voice Profile Loading
     │
     ▼
Qwen3-TTS
     │
     ▼
Speech Generation
     │
     ▼
Librosa Audio Processing
     │
     ▼
Generated Audio
```

---

# 🤖 AI Models

## Qwen3-TTS

- Neural Text-to-Speech
- Voice Cloning
- Speaker Adaptation
- Transformer Architecture

---

## OpenAI Whisper

- Speech Recognition
- Audio Transcription
- Offline STT
- Transformer Architecture

---

# 🌍 Supported Languages

- 🇺🇸 English
- 🇮🇳 Hindi
- 🇮🇳 Telugu
- 🇯🇵 Japanese
- 🇨🇳 Chinese
- 🇰🇷 Korean
- 🇪🇸 Spanish
- 🇫🇷 French
- 🇩🇪 German
- 🇭🇰 Cantonese

---

# 🛠 Tech Stack

## Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Lucide React

## Backend

- FastAPI
- Python

## AI Models

- Qwen3-TTS-12Hz-0.6B-Base
- OpenAI Whisper

## Deep Learning

- PyTorch
- CUDA

## Audio Processing

- Librosa
- PyAV

---

# 📂 Project Structure

```
NeuroVoice
│
├── frontend
│
├── backend
│
├── models
│
├── voices_library
│
├── uploads
│
├── outputs
│
├── assets
│
└── README.md
```

---

# ⚡ Installation

## Clone Repository

```bash
git clone https://github.com/mohammedasad2518/Neuro-Voice.git
```

```
cd Neuro-Voice
```

---

## Install Frontend

```bash
cd frontend
npm install
```

---

## Install Backend

```bash
cd backend
pip install -r requirements.txt
```

---

## Run Backend

```bash
uvicorn main:app --reload
```

---

## Run Frontend

```bash
npm run dev
```

---

# 📊 Technologies Used

| Category | Technology |
|----------|------------|
| Programming | Python |
| Frontend | React, TypeScript |
| Backend | FastAPI |
| AI | Qwen3-TTS |
| STT | Whisper |
| Deep Learning | PyTorch |
| GPU | CUDA |
| Audio | Librosa, PyAV |

---

# 🎯 Applications

- AI Voice Assistants
- Accessibility Tools
- Podcast Generation
- YouTube Voiceovers
- Audiobook Creation
- Customer Support
- Content Creation
- Language Learning
- Education
- Smart Assistants

---

# 🔮 Future Enhancements

- Voice Emotion Control
- Speaker Separation
- Real-time Voice Conversion
- More Languages
- Mobile Application
- Cloud Deployment
- Fine-tuned Custom Models

---

---

# 📜 License

This project is intended for educational and research purposes.

---

<div align="center">

## ⭐ If you like this project, consider giving it a Star!


</div>
