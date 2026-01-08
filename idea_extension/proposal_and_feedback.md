# Fast Builderthon 참가 제안서 내용 및 피드백

## 1. Fast Builderthon 포트폴리오 제안서 (요약 본)

요청하신 `/references/fast_builderthon_portpolio.jpg` 양식에 맞추어 구성한 내용입니다.

### 1) 니즈 파악 (Needs Analysis)
*   **문제점 (Pain Point)**:
    *   **"생각은 많지만 결정은 미뤄진다"**: 회의에서 수많은 아이디어가 쏟아지지만, 이를 실행 가능한 '결정'으로 전환하는 과정에서 병목 현상 발생.
    *   **요약 도구의 한계**: 기존 회의록 툴(Zoom 요약, Notion AI 등)은 텍스트를 '요약'할 뿐, "그래서 무엇을 해야 하는가?(Action Item)"와 "어떤 결정을 내렸는가?(Decision)"를 명확히 구조화하여 곧바로 산출물(PPT, 문서)로 연결하지 못함.
    *   **실행 지연**: 회의 후 다시 문서를 정리하고 기획하는 데 소요되는 인지적 비용과 시간 낭비.
*   **해결책 (Needs)**: 회의 중 나오는 발언을 실시간으로 분석하여 **'단순 기록'이 아닌 '결정 및 실행(Task)' 단계로 직행**시키는 "Decision-Centric" 에이전트 필요.

### 2) STP 전략
*   **S (Segmentation)**:
    *   아이디어 발산은 활발하나 정리에 취약한 초기 스타트업.
    *   빠른 실행(Agile)이 생명인 해커톤 팀, TF 팀.
    *   회의 빈도가 높고 비대면 협업이 잦은 IT 기업.
*   **T (Targeting)**:
    *   **Core Target**: "10인 이하의 린(Lean) 스타트업 및 프로젝트 팀". (즉시 도입 가능하며, 실행 속도에 가장 민감한 집단)
*   **P (Positioning)**:
    *   **Existing**: "회의 기록/요약 비서" (예: Clova Note, Otter.ai)
    *   **Thinking Box**: **"아이디어를 제품으로 바꾸는 실행 파트너(Execution Partner)"**.
        *   *Difference*: 단순 Text Summary가 아닌, **MCP(Model Context Protocol) 기술을 활용한 실시간 산출물(PPT, Notion) 생성**.

### 3) 비즈니스 모델 (Business Model)
*   **B2B SaaS 구독 모델**:
    *   **Lite (무료/저가)**: 기본 회의 텍스트 변환, 단순 요약, 월 제한된 시간 제공.
    *   **Pro (팀 요금)**: MCP 기반 문서(PPT, Notion) 자동 생성 무제한, 프로젝트 관리 도구 연동(Jira, Linear).
    *   **Enterprise**: 사내 구축형(On-Premise) 지원, 보안 강화, 커스텀 템플릿 제작.
*   **API Licensing**:
    *   다른 협업 툴(Slack, Discord)에 'Thinking Box Agent'를 플러그인 형태로 공급하여 수익 창출.

### 4) 향후 발전 방향 및 추가 비즈니스 모델
*   **멀티모달 확장 (Multimodal Expansion)**: 현재의 음성/텍스트 분석을 넘어, 화이트보드 사진이나 스케치를 인식하여 UI/UX 초안 코드로 변환하는 기능 추가.
*   **버티컬 특화 에이전트 (Vertical Agents)**:
    *   '디자이너 모드': 회의 내용을 바탕으로 Figma 와이어프레임 생성.
    *   '개발자 모드': 기능 명세서를 바탕으로 스켈레톤 코드 및 디렉토리 구조 생성.
*   **Marketplace**: 유저가 직접 만든 '회의 템플릿(예: 디자인 씽킹, 스프린트 회고)'과 '산출물 양식'을 사고팔 수 있는 에이전트 마켓플레이스 구축.

---

## 2. 'Thinking Box' 개발 내용에 대한 피드백 (Thesis 'Oh My Mistake' 적용)

보내주신 논문 **"Oh My Mistake!: Toward Realistic Dialogue State Tracking including Turnback Utterances"**는 현재 개발 중인 **Thinking Box**의 핵심 경쟁력을 높이는 데 결정적인 역할을 할 수 있습니다.

### 현재 구현의 우수성 (Thinking Box PDF 기반)
*   **체계적인 에이전트 파이프라인**: `Meaning Filter(의미 필터)` -> `Idea State(상태 분석)` -> `Planner(계획)` -> `MCP(실행)`으로 이어지는 구조는 매우 논리적입니다. 단순 LLM 호출이 아니라, 단계별로 정보를 정제하여 환각(Hallucination)을 줄이고 실행력을 높인 점이 훌륭합니다.

### 논문을 통해 본 개선 제안: "Turnback(말 바꾸기)에 강한 의사결정 에이전트"

**문제 의식**:
논문에서는 기존 DST(대화 상태 추적) 모델들이 사람들이 대화 도중 **"아, 잠깐만요. 그거 말고 이걸로 할게요."**라고 말을 바꾸는(Turnback/Correction) 상황을 제대로 반영하지 못한다고 지적합니다.
회의에서는 이런 상황이 빈번합니다.
> *"A 기능부터 개발하죠. ... (5분 뒤) ... 아니, 다시 생각해보니 B가 먼저인 것 같네요. A는 나중으로 미룹시다."*

만약 AI가 앞의 "A 개발"만 기억하거나 A와 B를 모두 Task로 등록해버리면, 이는 잘못된 의사결정 지원입니다.

**구체적인 적용 아이디어**:

1.  **Meaning Filter Agent에 'Turnback Detection' 모듈 추가**:
    *   단순히 중요한 키워드를 뽑는 것을 넘어, **"이전 발언을 취소/수정하는 발화"**를 탐지하는 로직을 강화해야 합니다.
    *   논문의 *Dual-Slot Turnback*(값 뿐만 아니라 슬롯 자체를 바꾸는 경우) 시나리오처럼, 주제 자체가 바뀌는 흐름을 놓치지 않아야 정확한 최종 산출물이 나옵니다.

2.  **'결정의 신뢰도' 점수화 (Idea State Agent)**:
    *   아이디어가 '결정(Decision)' 단계로 넘어갈 때, 해당 주제에 대해 **Turnback(수정 번복)이 얼마나 일어났는지**를 기반으로 *Confidence Score*를 매깁니다.
    *   번복이 많았던 결정이라면, 최종 산출물 생성 전 사용자에게 "이 부분에 대해 논의가 많았는데, 최종적으로 B로 결정된 것이 맞나요?"라고 한 번 더 확인(Confirmation)하는 UX를 제공합니다.

3.  **마케팅 포인트로 활용**:
    *   *"다른 AI 요약 툴은 당신이 취소한 말까지 기억하지만, Thinking Box는 당신의 **최종 의도(Last Intent)**만을 정확히 실행합니다."*
    *   이것은 단순한 요약 기술을 넘어선, **"진짜 사람 비서 같은 맥락 파악 능력"**을 강조하는 강력한 차별점이 될 것입니다.
