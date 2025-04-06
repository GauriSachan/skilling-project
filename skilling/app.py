import os
from huggingface_hub import login
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("HUGGINGFACE_TOKEN")

if not token:
    raise ValueError("❌ Hugging Face token not loaded from .env!")

login(token)
