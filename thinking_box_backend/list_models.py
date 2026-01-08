from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

print("Available Models:")
print("-" * 50)
for model in client.models.list():
    print(f"- {model.name}")
