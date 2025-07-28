from crewai import LLM
import os, dotenv

# Load environment variables from .env file
dotenv.load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def make_gemini_llm():
    """Create a Gemini LLM instance using CrewAI's expected format"""
    # Use the string format that CrewAI's litellm integration expects
    return LLM(
        model="gemini/gemini-2.5-flash",
        api_key=GOOGLE_API_KEY,
        temperature=0.2,
    )