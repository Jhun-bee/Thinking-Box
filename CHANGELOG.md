# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.0.0] - 2026-01-08

### 🎉 Initial Release

첫 번째 알파 버전 릴리즈. 핵심 기능 구현 완료.

### Added
- **실시간 음성 인식**
  - Web Speech API 기반 한국어 STT
  - 중간 결과(interim) 즉시 표시
  - 🎤 아이콘으로 말하는 중 표시

- **화자 구분 (Speaker Diarization)**
  - 수동 모드: 버튼 클릭으로 화자 전환
  - AI 모드: 자동 감지 (Beta, UI만 구현)
  - 화자별 색상 구분

- **AI 분석 (Meaning Filter)**
  - LangChain + Google Gemini 2.5 Flash
  - 결정사항 추출
  - Turnback (말 바꾸기) 감지
  - 한국어 응답

- **3-패널 실시간 UI**
  - 실시간 자막 패널
  - 즉시 감지 패널 (Decisions/Turnback)
  - 회의 진행 요약 패널 (주제별 그룹핑)

- **회의 요약**
  - 회의 종료 시 요약 팝업
  - 클립보드 복사 기능
  - 회의 시간 타이머

- **백엔드 서버**
  - FastAPI WebSocket 서버
  - 텍스트 기반 실시간 분석 엔드포인트

### Known Issues
- AI 자동 화자 감지는 UI만 구현됨 (실제 로직 미구현)
- 시스템 오디오 캡처는 VB-Audio 별도 설치 필요
- 긴 회의 시 메모리 사용량 증가 가능

---

## Roadmap

### v0.1.0 (예정)
- [ ] AI 기반 화자 자동 감지
- [ ] Supabase 연동 (회의 기록 저장)
- [ ] 회의 내보내기 (PDF/노션)

### v0.2.0 (예정)
- [ ] 다중 사용자 지원 (각자 기기로 접속)
- [ ] 실시간 공동 편집
- [ ] Zoom/Teams 통합
