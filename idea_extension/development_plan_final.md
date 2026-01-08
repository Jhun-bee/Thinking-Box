# Thinking Box 개발 설계 및 기술 스택 가이드

## 1. 사용자 흐름 (User Flow)

사용자가 서비스를 경험하는 흐름에 따라 필요한 기술적 처리를 정의합니다.

1.  **Meeting Start (입력 단계)**
    *   사용자가 "새 회의 시작" 버튼 클릭.
    *   마이크 권한 획득 및 실시간 음성 스트림 전송 (또는 텍스트 입력).
    *   **Tech**: Web Audio API, WebSocket.

2.  **Real-time Processing (처리 단계 - STT & Filtering)**
    *   음성을 텍스트로 변환(STT).
    *   Meaning Filter가 잡담을 제거하고 핵심 키워드 추출.
    *   Turnback Detector가 발언 수정/취소 감지.
    *   **Tech**: OpenAI Whisper (or Deepgram), LLM (Gemini/GPT), Vector DB (이전 맥락 검색).

3.  **State Management (상태 관리 단계)**
    *   대화 내용을 '줄글'이 아닌 '구조화된 JSON State'로 변환.
    *   안건별로 아이디어의 상태(발산/수렴/결정) 추적.
    *   **Tech**: LangGraph (Stateful Agent management), Redis (실시간 상태 캐싱).

4.  **Decision & Execution (실행 단계)**
    *   결정된 사항(Green Signal)에 대해 사용자 확정.
    *   Planner Agent가 산출물(PPT/Notion) 구조 설계.
    *   MCP Executor가 외부 툴 API를 호출하여 실제 문서 생성.
    *   **Tech**: MCP (Model Context Protocol) Server, Notion API, Google Slides API.

5.  **Review & Output (결과 단계)**
    *   생성된 문서 링크 제공 및 대시보드에 요약 카드 생성.
    *   **Tech**: Next.js UI, Markdown Rendering.

---

## 2. 권장 기술 스택 (Technology Stack)

빠른 프로토타이핑과 "Thinking Box"의 핵심 기능(실시간성, AI 처리)을 고려한 스택입니다.

### Frontend
*   **Framework**: **Next.js 14+ (App Router)** - React 기반, 빠른 렌더링 및 API 라우트 통합 용이.
*   **Language**: **TypeScript** - 복잡한 상태 관리 시 안정성 확보.
*   **State Management**: **Zustand** - 에이전트로부터 오는 실시간 상태 스트림을 가볍게 관리.
*   **UI Library**: **TailwindCSS** + **Shadcn/UI** - 세련되고 현대적인 대시보드 디자인(Glassmorphism 등) 구축.
*   **Real-time**: **Socket.io-client** - AI 분석 결과를 실시간으로 프론트에 표시.

### Backend (AI Core)
*   **Framework**: **FastAPI (Python)** - 비동기 처리(Async)에 강하며, AI 라이브러리(LangChain 등)와의 호환성 최상.
*   **Agent Framework**: **LangChain** & **LangGraph** - 순환형(Cyclic) 에이전트 흐름 및 State 관리에 필수.
*   **LLM Model**:
    *   Reasoning Engine: **GPT-4o** or **Gemini 1.5 Pro** (복잡한 맥락 파악).
    *   Simple Task: **GPT-4o-mini** (단순 요약, 비용 절감).
*   **STT (Speech-to-Text)**: **OpenAI Whisper API** (높은 정확도) 또는 **Deepgram** (초저지연 실시간 처리).

### Database & Infra
*   **Main DB**: **Supabase (PostgreSQL)** - 관계형 데이터(사용자, 회의, Task) 저장 + Realtime 구독 지원.
*   **Vector DB**: **Supabase pgvector** - 별도 구축 없이 PostgreSQL 내부에서 벡터 검색 처리.
*   **Cache**: **Redis** (Optional) - 대화 세션 상태의 고속 입출력.

---

## 3. 시스템 아키텍처 및 DB 설계 (Development Design)

### 3.1. Database Schema (ERD Draft)

Turnback 로직과 아이디어 상태 관리를 위한 핵심 테이블 구조입니다.

`sql
-- 1. Meetings (회의 세션)
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MeetingTranscripts (실시간 대화 로그)
CREATE TABLE meeting_transcripts (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id),
    speaker_id VARCHAR(100),
    content TEXT, -- 원본 발화
    timestamp TIMESTAMP
);

-- 3. IdeaContexts (아이디어/안건 상태 - 핵심)
CREATE TABLE idea_contexts (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id),
    topic VARCHAR(200), -- 예: "로그인 페이지 디자인"
    current_value TEXT, -- 현재 합의된 내용 (예: "화이트 테마")
    status VARCHAR(50), -- DIVERGENCE(발산), CONVERGENCE(수련), DECISION_READY(결정준비), CONFIRMED(확정)
    turnback_count INT DEFAULT 0, -- 번복 횟수 (신뢰도 지표)
    last_updated_at TIMESTAMP
);

-- 4. ContextHistory (변경 이력 - Turnback 추적용)
CREATE TABLE context_history (
    id UUID PRIMARY KEY,
    context_id UUID REFERENCES idea_contexts(id),
    previous_value TEXT,
    update_reason VARCHAR(255), -- 예: "사용자 요청으로 변경", "맥락 전환"
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. ActionItems (실행 계획)
CREATE TABLE action_items (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id),
    description TEXT,
    platform VARCHAR(50), -- NOTION, PPT, JIRA
    status VARCHAR(50) DEFAULT 'PENDING'
);
`

### 3.2. API Design (Key Endpoints)

**FastAPI Backend**

*   POST /api/meetings/start: 세션 시작, Socket 연결 준비.
*   WS /ws/audio-stream/{meeting_id}: (WebSocket) 실시간 음성 청크 수신 -> STT 처리 -> 텍스트 반환.
*   WS /ws/agent-stream/{meeting_id}: (WebSocket) 텍스트 분석 결과(Meaning Filter) 및 상태 변경(Idea State)을 프론트로 푸시.
    *   *Return Data*: { type: "STATE_UPDATE", topic: "디자인", value: "B안", status: "YELLOW" }
*   POST /api/meetings/{meeting_id}/confirm: 사용자가 특정 아이디어 상태를 최종 확정. -> Planner 트리거.
*   GET /api/meetings/{meeting_id}/summary: 최종 산출물 및 요약 조회.

---

## 4. 개발 우선순위 (Development Phase)

1.  **Phase 1 (Core)**:
    *   Next.js + FastAPI 기본 세팅.
    *   Web Audio API -> Whisper STT -> 텍스트 출력 파이프라인 연결.
    *   기본적인 LangChain 에이전트(단순 요약) 연동.

2.  **Phase 2 (Turnback Logic)**:
    *   IdeaContexts 테이블 구현.
    *   Meaning Filter에 Turnback 감지 프롬프트 적용.
    *   프론트엔드에 '신호등(Confidence)' UI 구현.

3.  **Phase 3 (MCP & Output)**:
    *   결정된 사항을 Notion API로 쏘는 Planner 구현.
    *   PPT 생성 모듈 연동.
