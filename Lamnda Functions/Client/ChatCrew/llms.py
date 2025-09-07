from crewai import LLM
import os, dotenv

# Load environment variables from .env file
dotenv.load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print(f"GEMINI_API_KEY={GEMINI_API_KEY}")

def make_gemini_llm(response_format=None, model_name="gemini/gemini-2.5-flash-lite"):
    """Create a Gemini LLM instance using CrewAI's expected format"""
    # Use the string format that CrewAI's litellm integration expects
    return LLM(
        model=model_name,
        api_key=GEMINI_API_KEY,
        temperature=0.2,
        max_tokens=1024,
        response_format=response_format,
    )

def make_openai_llm(response_format=None, model_name="gpt-4o-mini"):
    """Create an OpenAI LLM instance using CrewAI's expected format"""
    if '5' in model_name:
        #print("Using GPT-5 specific parameters")
        return LLM(
            model=model_name,
            api_key=os.getenv("OPENAI_GPT5_API_KEY"),
            #temperature=0.2,
            #max_completion_tokens=1024,
            response_format=response_format,
        )

    return LLM(
        model=model_name,
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.2,
        max_tokens=1024,
        response_format=response_format,
    )

def get_llm(response_format=None, llm_model=None):
    if llm_model is None:
        llm_model = os.getenv("LLM_MODEL", "gemini")

    if "gemini" in llm_model:
        return make_gemini_llm(response_format=response_format, model_name="gemini-2.5-flash-lite")


    elif "gpt" in llm_model or "openai" in llm_model:
        return make_openai_llm(response_format=response_format,model_name=llm_model)

    else:
        raise ValueError(f"Invalid LLM vendor: {llm_model}")