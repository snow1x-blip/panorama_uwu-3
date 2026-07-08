import os
import json
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

PROMPTS_DIR = Path(__file__).parent.parent / "parser/json"
PROMPT_FILE = PROMPTS_DIR / "presa_prompt.json"


def load_prompt_config():
    if not PROMPT_FILE.exists():
        raise FileNotFoundError(f"Файл с промптами не найден: {PROMPT_FILE}")
    
    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_pres_prompt(mess):
    client = OpenAI(
        api_key=os.environ.get("API_KEY"),
        base_url="https://api.aitunnel.ru/v1/"
    )
    
    config = load_prompt_config()
    
    messages = []
    for msg in config.get("messages", []):
        content = msg.get("content", "")
        content = content.format(mess=mess)
        messages.append({
            "role": msg.get("role", "user"),
            "content": content
        })
    
    response = client.chat.completions.create(
        model="deepseek-v4-flash",
        messages=messages,
        temperature=config.get("temperature", 0.7),
        max_tokens=config.get("max_tokens", 1000)
    )
    
    return response.choices[0].message.content
