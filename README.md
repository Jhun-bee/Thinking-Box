# 🧠 Thinking Box AI

> 실시간 회의 분석 및 의사결정 추적 시스템

**Thinking Box**는 회의 중 발생하는 의사결정을 실시간으로 추적하고, "말 바꾸기(Turnback)"를 감지하여 회의 효율성을 높여주는 AI 기반 회의 도우미입니다.

![Version](https://img.shields.io/badge/version-v0.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ 주요 기능

### 🎤 실시간 음성 인식
- Web Speech API 기반 실시간 한국어 STT
- 화자 구분 (수동/AI 자동)
- 중간 결과 즉시 표시

### 📊 3-패널 실시간 분석
| 패널 | 기능 |
|------|------|
| 실시간 자막 | 발화 내용 표시 + 화자 색상 구분 |
| 즉시 감지 | 결정사항/Turnback 즉시 알림 |
| 회의 진행 요약 | 주제별 누적 정리 |

### ⚠️ Turnback 감지
- **단일 변경**: "아, 3시 말고 4시로 하자"
- **복귀**: "역시 처음 아이디어가 나았어"
- **주제 전환**: 갑작스러운 의제 변경

### Thinking Box AI (v0.1.0)

Thinking Box AI is a real-time meeting analysis tool that provides live transcription, **speaker identification**, and AI-driven summarization.

## 🚀 Features (v0.1.0)
- **Real-time Transcription**: Powered by Web Speech API.
- **Speaker Identification**: Identifies registered speakers using `SpeechBrain` & `ECAPA-TDNN`.
- **Hallucination Filter**: Filters out background noise and silence to prevent incorrect transcripts.
- **Meeting Summary**: Generates topic-based summaries, decisions, and turnbacks.
- **Responsive UI**: 3-panel layout with independent scrolling for efficient monitoring.

## 🛠️ Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **FFmpeg**: Required for audio processing.
  - Windows: `winget install ffmpeg` (or download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH).
  - Mac: `brew install ffmpeg`

### 📋 회의 요약
- 회의 종료 시 자동 요약 생성
- 클립보드 복사 (노션/슬랙 붙여넣기)
- 결정사항 + Turnback 히스토리

---

## 🛠️ 기술 스택

### Backend
- **Python 3.11+**
- **FastAPI** - WebSocket 서버
- **LangChain** - AI 에이전트 프레임워크
- **Google Gemini 2.5** - LLM 분석

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Web Speech API** - 브라우저 내장 음성 인식

---

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/YOUR_USERNAME/Thinking_Box.git
cd Thinking_Box
```

### 2. 백엔드 설정
```bash
cd thinking_box_backend

# 가상환경 생성 (선택)
conda create -n thinking_box python=3.11
conda activate thinking_box

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일에 GOOGLE_API_KEY 입력

# 서버 실행
python main.py
```

### 3. 프론트엔드 설정
```bash
cd thinking_box_frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 4. 접속
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000

---

## 📁 프로젝트 구조

```
Thinking_Box/
├── thinking_box_backend/
│   ├── app/
│   │   ├── api/endpoints/stream.py    # WebSocket 엔드포인트
│   │   ├── core/config.py             # 설정
│   │   ├── models/agent_schema.py     # Pydantic 스키마
│   │   └── services/
│   │       ├── stt_service.py         # STT 서비스
│   │       └── meaning_filter.py      # AI 분석 에이전트
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── thinking_box_frontend/
│   ├── app/
│   │   ├── page.tsx                   # 메인 페이지 (3-패널 UI)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── hooks/
│   │   └── useAudioStream.ts          # 음성 스트리밍 훅
│   ├── package.json
│   └── tailwind.config.ts
│
├── README.md
├── CHANGELOG.md
└── WALKTHROUGH.md
```

---

## 🔑 환경 변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `GOOGLE_API_KEY` | Google AI Studio API 키 | ✅ |

---

## 📜 라이선스

MIT License

---

## 🙏 감사의 말

- Fast Builderthon 2026
- "Oh My Mistake" 논문 기반 Turnback 로직 설계
