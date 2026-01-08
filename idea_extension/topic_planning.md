# 2026 Fast Builderthon 주제 기획안

## 1. 심사위원 성향 및 대회 성격 분석

*   **대회 성격:** "Builderthon" - 실제 동작하는 프로덕트(Builder) 중심, AI 기술 활용 필수.
*   **심사위원 구성:**
    *   **박지혁(Product):** OpenAI 해커톤 우승자 출신. **실제 구현 완성도**와 **UX/Product Market Fit**을 중요하게 볼 가능성.
    *   **박지웅(Market):** VC 대표. **비즈니스 모델(BM)**, **시장성**, **확장 가능성(Scalability)** 중시. 단순 장난감(Toy Project)보다는 실제 돈을 벌 수 있는 SaaS 선호.
    *   **테디노트(Tech):** LangChain 엠배서더. **RAG(검색 증강 생성)**, **LangChain 활용**, **최신 LLM 기술의 정확하고 효과적인 적용**을 기술적 평가 기준으로 삼을 것.
    *   **이엽(Tech - Anthropic):** Anthropic(Claude) APAC 파트너십 헤드. **Claude 3.5 Sonnet 등의 Anthropic 모델 활용도**, **Context Window 활용**, **Prompt Engineering** 등을 눈여겨볼 것.

## 2. 핵심 전략 (Winning Strategy)

*   **Target:** B2B SaaS 또는 명확한 니즈가 있는 Vertical B2C 서비스.
*   **Tech Stack:** RAG 필수 (테디노트), Claude 3.5 Sonnet 활용 (이엽), Agentic Workflow 도입.
*   **Focus:** "이게 기술적으로 되나요?" 보다 "이걸로 돈을 벌 수 있나요? & 사람들이 진짜 쓰나요?"에 초점.

## 3. 추천 주제 제안 (Top 3)

### 아이디어 1: Corporate Intelligence Agent (기업용 마켓 인텔리전스 에이전트)
*   **컨셉:** 특정 산업군의 뉴스, 보고서, 경쟁사 동향을 실시간으로 수집(RAG)하고, CEO/기획자에게 "오늘의 중요 의사결정 포인트"를 브리핑해주는 AI 비서.
*   **Target Judge:** 박지웅(시장성 - B2B 니즈 확실), 테디노트(RAG 기술적 난이도 - 정확성), 이엽(긴 문맥 처리 - Claude 강점).
*   **기능:**
    *   신뢰할 수 있는 소스 기반 RAG (할루시네이션 최소화).
    *   Claude의 긴 Context Window를 활용한 다량의 문서 요약 및 인사이트 도출.
    *   Slack/Teams 연동.

### 아이디어 2: Hyper-Personalized Edu-Tech (초개인화 기술 교육 튜터)
*   **컨셉:** 학습자의 코드 스타일과 실력을 분석하여, "나에게 딱 맞는 예제"와 "코드 리뷰"를 제공하는 코딩 튜터. (패스트캠퍼스 주최 대회와의 연관성 어필)
*   **Target Judge:** 박지혁(Product - 교육 경험 개선), 테디노트(LangChain을 통한 코드 분석 체인).
*   **기능:**
    *   사용자의 GitHub 저장소를 분석하여 선호하는 변수명, 디자인 패턴 파악.
    *   강의 영상을 보고 모르는 부분을 질문하면, 영상의 해당 타임스탬프와 함께 답변 제공 (Multi-modal).

### 아이디어 3: Legal/Contract Review Assistant for SMBs (소상공인을 위한 계약서 검토 에이전트)
*   **컨셉:** 비싼 변호사 비용이 부담스러운 소상공인/스타트업을 위해, 계약서의 독소 조항을 찾고 수정안을 제안하는 법률 AI.
*   **Target Judge:** 박지웅(시장성 - 명확한 Pain Point), 이엽(Claude의 논리적 추론 및 긴 문맥 이해 능력 활용).
*   **기능:**
    *   복잡한 법률 용어를 쉬운 말로 풀이.
    *   "이 조항은 을에게 불리합니다"라고 경고 및 대안 제시.
    *   PDF/OCR 문서 처리.

## 4. 추가 브레인스토밍 (Round 2)

### 아이디어 4: Legacy Code Modernizer Agent (레거시 코드 현대화 에이전트)
*   **컨셉:** 오래된 언어(Java 6, jQuery 등)로 작성된 코드를 입력하면, 최신 스택(Kotlin, React, Next.js)으로 변환해주고 "마이그레이션 보고서"를 자동 생성하는 개발자 도구.
*   **Target Judge:** 테디노트(LLM의 Code Understanding 능력 극한 활용), 박지혁(명확한 Product 효용).
*   **차별점:** 단순 변환이 아니라, 비즈니스 로직을 보존하면서 'Refactoring'까지 제안. 테디노트의 LangChain Graph를 활용한 코드 의존성 분석 어필 가능.

### 아이디어 5: AI RFP/Bid Proposal Generator (제안서 자동 생성 및 입찰 분석기)
*   **컨셉:** 나라장터나 기업 입찰 공고(RFP) 파일을 업로드하고, 우리 회사의 포트폴리오를 연동하면 "이기기 위한 제안서 초안"을 1분 만에 PPT/PDF로 생성.
*   **Target Judge:** 박지웅(B2B에서 돈이 되는 확실한 Business Model), 이엽(긴 문맥 처리).
*   **BM:** 수주 성공 시 수수료, 혹은 월 구독료. 시장성이 매우 큼.

### 아이디어 6: Voice-First Shopping Assistant for Digital Vulnerable (디지털 소외계층을 위한 음성 쇼핑 비서)
*   **컨셉:** 복잡한 UI 조작이 힘든 노년층/시각장애인을 위해, 전화 통화하듯이 "쌀 20kg 싼 걸로 보내줘"라고 말하면, 최저가를 찾아서 주문 결제까지 대행.
*   **Target Judge:** 박지혁(UX 혁신), 사회적 가치(Impact) 어필.
*   **기술:** VAPI(Voice API), STT/TTS, Agentic Workflow(Function Calling으로 쇼핑몰 API 제어).

## 5. (User Idea) Real-time Meeting Copilot (실시간 회의 생각 정리 파트너)

### 아이디어: Chat-based Ideation & Consolidation Agent
*   **사용자 제안:** 카카오톡, Slack 등에서 산발적으로 쏟아지는 아이디어를 **실시간으로 구조화하고 리포트화**해주는 프로그램.
*   **심사위원 맞춤 전략 (Refinement):**
    *   **단순 요약(X) -> 구조적 시각화(O):** 텍스트를 단순히 줄이는 게 아니라, Mermaid.js나 Whimsical 같은 마인드맵 형태로 **실시간 시각화** (Product 점수).
    *   **Actionable Item 추출:** "누가, 언제까지, 무엇을" 해야 하는지 자동으로 표로 정리 (Market/PM 효율성).
    *   **Conflict Resolution:** 의견이 충돌할 때 AI가 "중재안"이나 "데이터 기반 근거"를 제시 (Agentic Workflow).
    *   **기술 스택 (Hybrid Memory Architecture):**
        *   **Short-term (Rolling Summary):** 슬라이딩 윈도우 상단에 이전 대화의 **'실시간 요약본'**을 지속적으로 주입하여 전체 흐름 유지 (Conversation Summary Buffer).
        *   **Long-term (Auto-Triggered Retrieval):** 사용자의 아이디어가 **"키워드(Index)"** 기반으로 저장되며, 대화 중 특정 키워드 등장 시 과거의 관련 윈도우를 자동으로 호출하여 연결 (Keyword-based Retrieval).
        *   **Benefit:** "Sliding Window의 망각 문제"와 "단순 RAG의 부정확성"을 동시에 해결하는 세련된 아키텍처로 테디노트(기술), 이엽(Context 활용) 심사위원 동시 공략.

### 평가
*   **장점:** 누구나 겪는 Pain Point 해결. UI/UX를 예쁘게 뽑으면 시연 효과(Demo)가 매우 좋음.
*   **단점:** 기술적 난이도가 평범해 보일 수 있음. -> **"실시간성"과 "시각화"로 차별화 필요.**

## 6. 최종 제안 및 추천
가장 추천하는 방향은 기존 Top 3 중 **"B2B Intelligence"**와 이번에 추가된 **"AI RFP Generator"**입니다.
이유: **"돈이 되는가?"(박지웅) + "기술적으로 어려운가?"(테디노트) + "Context를 잘 쓰는가?"(이엽)** 세 가지를 모두 만족시키는 고난이도 B2B 주제이기 때문입니다.
단기간에 시각적 임팩트를 주려면 **"Legacy Code Modernizer"**의 Before/After 코드 비교 화면도 매우 강력합니다.
협업 툴을 선호하신다면 **"Real-time Meeting Copilot"**도 훌륭하지만, 단순 텍스트 요약을 넘어선 **시각적 산출물(Mindmap, Action Plan Table)**이 반드시 따라와야 우승권입니다.

