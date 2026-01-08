from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from app.core.config import get_settings
from app.models.agent_schema import MeaningAnalysis

settings = get_settings()

class MeaningFilterAgent:
    def __init__(self):
        # Initialize Gemini 2.5 Flash for analysis
        self.llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0,
            convert_system_message_to_human=True
        )
        
        self.parser = PydanticOutputParser(pydantic_object=MeaningAnalysis)

        # Prompt Design based on 'Oh My Mistake' Thesis concepts - KOREAN
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """
            당신은 실시간 회의 도우미의 'Meaning Filter' AI입니다.
            회의 내용을 분석하여 구조화된 정보를 추출하세요.
            
            **모든 응답은 반드시 한국어로 작성하세요.**

            핵심 역할: 'Turnback' (수정/마음 변경) 감지
            - 화자가 이전 결정을 바꾸면 (예: "아 잠깐, X 말고 Y로 하자"), 반드시 TurnbackEvent로 기록하세요.
            - 유형:
              1. SINGLE_CHANGE: 단일 값 변경
              2. RETURN: 이전 아이디어로 복귀
              3. TOPIC_SWITCH: 주제 자체 변경

            순수한 잡담은 제외하되, 결정 사항이 포함되면 추출하세요.
            주제(topic)와 결정값(value)은 모두 한국어로 작성하세요.
            
            Format instructions: {format_instructions}
            """),
            ("human", "회의 내용: {text}\n\n현재 맥락 주제: {context_topics}")
        ])

        self.chain = self.prompt | self.llm | self.parser

    async def analyze_text(self, text: str, context_topics: list = []) -> MeaningAnalysis:
        """
        Analyzes the text segment and returns structured data.
        """
        try:
            result = await self.chain.ainvoke({
                "text": text,
                "context_topics": ", ".join(context_topics) if context_topics else "None",
                "format_instructions": self.parser.get_format_instructions()
            })
            return result
        except Exception as e:
            print(f"Error in Meaning Filter Analysis: {e}")
            # Return empty/safe result in case of parsing error
            return MeaningAnalysis(main_topics=[], decisions=[], is_chitchat=False, turnback=None)

meaning_filter = MeaningFilterAgent()
