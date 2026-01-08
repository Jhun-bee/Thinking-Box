# 'Thinking Box' 고도화를 위한 Turnback(발화 수정) 통합 설계안

본 문서는 논문 *"Oh My Mistake!: Toward Realistic Dialogue State Tracking including Turnback Utterances"*의 핵심 개념인 **Turnback(발화 수정/번복)** 처리 로직을 'Thinking Box'의 멀티 에이전트 시스템에 구체적으로 적용하기 위한 기술 설계안입니다.

## 1. 설계 목표 (Design Goal)
*   **목표**: 회의 중 빈번하게 발생하는 "말 바꾸기(Self-Correction)", "의견 철회", "조건 변경"을 정확히 인식하여, **최종적으로 유효한 의사결정(Last Valid Decision)**만을 산출물로 변환한다.
*   **기대 효과**: 잘못된 정보나 취소된 아이디어가 최종 PPT/문서에 포함되는 것을 방지하여 결과물의 신뢰도 획기적 향상.

---

## 2. 시스템 아키텍처 변경안 (System Architecture)

기존 파이프라인(Meaning Filter -> Idea State -> Planner -> MCP) 사이에 **Turnback Resolver (맥락 교정기)** 모듈을 신규 배치하거나, Meaning Filter의 기능을 확장합니다.

### [Before]
> Input(음성/Text) -> **Meaning Filter(요약/추출)** -> Idea State(상태판단) -> Planner -> Action

### [After]
> Input(음성/Text) -> **Meaning Filter & Turnback Detector(수정 감지)** -> **Context Manager(상태 갱신/롤백)** -> Idea State(최종 상태판단) -> Planner -> Action

---

## 3. 상세 구현 로직 (Implementation Logic)

### A. Turnback 4가지 유형의 적용 (Thesis Application)
논문에서 제시한 4가지 유형을 회의 시나리오에 맞춰 재정의하고 프롬프트 엔지니어링에 활용합니다.

| 논문 모델 (Thesis Model) | 회의 상황 적용 (Meeting Context) | 감지 및 처리 로직 (Logic) |
| :--- | :--- | :--- |
| **1. Single Turnback**<br>(값 1회 변경) | "A 기능 말고 B 기능으로 합시다." | 직전 슬롯(Target)의 값을 새로운 값(Value)으로 **Overwrite** |
| **2. Return Turnback**<br>(원복) | "아니, 그냥 아까 말한 A가 낫겠네요." | History를 조회하여 이전 상태값(A)을 **Restore** |
| **3. Dual-Value Turnback**<br>(연쇄 변경) | "B도 좀 그렇고, 차라리 C로 가죠." | 짧은 턴 내에 값이 연속 변경될 경우, 중간 값(B)을 무시하고 **Final Value(C)**만 확정 |
| **4. Dual-Slot Turnback**<br>(주제+값 변경) | "기능 개발 얘기는 나중에 하고, 디자인부터 정하죠." | 현재 활성화된 Active Context(기능)를 **Pause**하고, 새로운 Context(디자인)로 **Switch** |

### B. 데이터 구조 설계 (Data Structure)

단순 텍스트 누적이 아닌, **State Management** 형태(Redux/React 상태 관리와 유사)로 대화 내용을 관리해야 "수정"이 가능합니다.

`json
// Context State Example
{
  "current_topic": "기능 기획",
  "active_slots": {
    "login_method": {
      "value": "Google OAuth",
      "history": ["Email", "Kakao", "Google OAuth"], // 변경 이력 추적
      "confidence": 0.85,
      "last_updated_turn": 15
    },
    "development_deadline": {
      "value": "2026-02-01",
      "status": "CONFIRMED"
    }
  },
  "turnback_detected_count": 3 // 번복 횟수 (신뢰도 산정용)
}
`

### C. 에이전트 프롬프트 설계 (Prompt Engineering)

**Meaning Filter Agent**에게 "수정 탐지" 역할을 부여하는 프롬프트 예시입니다.

`markdown
# Role
당신은 회의 내용을 분석하여 구조화된 데이터로 변환하는 'Meaning Filter'입니다.
특히, 화자가 이전에 한 말을 '취소', '수정', '보류'하는 Turnback(회귀) 발언을 예민하게 감지해야 합니다.

# Instruction
1. 입력된 텍스트에서 '결정 사항'을 추출하십시오.
2. 만약 화자가 "아니", "잠깐", "취소", "그게 아니라", "변경" 등의 표현을 사용하여 이전 발언을 수정한다면, 이를 [UPDATE] 태그로 명시하십시오.
3. 수정 대상이 되는 이전 키워드(Target)와 변경된 새로운 내용(Value)을 정확히 매핑하십시오.

# Example
User: "로그인 페이지는 파란색 테마로 가죠. 아, 근데 생각해보니 우리 로고랑 안 맞네. 그냥 무난하게 흰색 배경으로 합시다."
Output:
- [DECISION] 로그인 페이지 테마: 흰색 배경 (Original: 파란색 -> CANCELED by user logic "로고 불일치")
`

---

## 4. UX/UI 설계안 (User Experience)

### 1) Confidence Indicator (신뢰도 신호등)
*   **Green**: 수정 없이 만장일치로 결정된 사항 (-> 즉시 문서화)
*   **Yellow**: 1회 정도 번복되었으나 최종 결론이 난 사항
*   **Red**: 수차례 번복되거나(Dual-Value Turnback 다수), 아직 결론이 모호한 사항
    *   *Action*: "이 주제(로그인 방식)에 대해 논의가 여러 번 바뀌었습니다. **'소셜 로그인'**으로 결정된 것이 맞습니까?"라고 챗봇이 역질문(Confirmation).

### 2) Diff View (변경 이력)
*   회의록 생성 시, 최종 결정 사항 밑에 작게 (History: A -> B -> C)를 남겨두어, 왜 이런 결정이 나왔는지 맥락을 추적할 수 있게 함.

---

## 5. 예상 개발 로드맵 (Roadmap)

1.  **Phase 1 (기초)**: Meaning Filter 프롬프트에 Turnback 감지 로직 추가. (단순 텍스트 수정 반영)
2.  **Phase 2 (구조화)**: 대화 상태를 관리하는 Context Manager DB/메모리 구조 설계. (Slot-Filling 방식 도입)
3.  **Phase 3 (고도화)**: 논문의 4가지 시나리오에 대한 테스트 케이스(Test Set)를 구축하여 에이전트 성능 검증.

이 설계안은 Thinking Box가 단순 "받아적기" 툴을 넘어 **"문맥을 이해하고 정제해주는 똑똑한 비서"**로 포지셔닝하는 데 핵심적인 기술 기반이 될 것입니다.
