from google import genai
from google.genai import types
from app.core.config import get_settings
import base64

settings = get_settings()

# List of common hallucination patterns to filter out
HALLUCINATION_KEYWORDS = [
    "안녕하세요", "소개", "오늘", "주제", "발표", "선생님", "감사합니다",
    "좋은 질문", "말씀드리", "시작하겠습니다", "이번", "다음"
]

class STTService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        self.last_transcript = ""  # Track last transcript to detect repetition

    async def transcribe_audio(self, audio_data: bytes) -> str:
        """
        Transcribes audio bytes to text using Google Gemini 2.5 Flash.
        Handles silence/noise by filtering hallucinated responses.
        """
        try:
            # Create inline audio part
            audio_part = types.Part.from_bytes(
                data=audio_data,
                mime_type="audio/webm"
            )
            
            # Simplified prompt - native audio model handles STT better
            prompt = """Transcribe this audio to Korean text. 
If there is no speech, respond with exactly: [SILENCE]
Only output the spoken words, nothing else."""
            
            response = self.client.models.generate_content(
                model="models/gemini-2.5-flash-native-audio-latest",
                contents=[prompt, audio_part]
            )
            
            transcript = response.text.strip() if response.text else ""
            
            # Filter out "NO_SPEECH" or "SILENCE" responses
            if "[NO_SPEECH]" in transcript or "[SILENCE]" in transcript or "SILENCE" in transcript:
                return ""
            
            # Filter out empty or very short responses
            if len(transcript) < 2:
                return ""
            
            # Check for repetition (same as last transcript)
            if transcript == self.last_transcript:
                return ""
            
            self.last_transcript = transcript
            return transcript

        except Exception as e:
            print(f"Error in Gemini transcription: {e}")
            return ""

stt_service = STTService()
