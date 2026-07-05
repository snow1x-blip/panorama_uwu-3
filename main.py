import requests
import json
import os
import uuid
import sys
from datetime import datetime
from pathlib import Path
from typing import Union, Tuple, List
from duckduckgo_search import DDGS
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY")
JSON_DIR = Path("json")
IMAGE_DIR = Path("image")

def ensure_dirs_exist():
    JSON_DIR.mkdir(exist_ok=True)
    IMAGE_DIR.mkdir(exist_ok=True)

def log_event(status: str, message: str, url: str = "", data: dict = None):
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "status": status,
        "url": url,
        "message": message
    }
    
    if data:
        log_data["data"] = data
    
    log_file = JSON_DIR / "log.json"
    logs = []
    
    if log_file.exists():
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                logs = json.load(f)
        except:
            logs = []
    
    logs.append(log_data)
    
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)

def load_json_file(filename: str) -> Union[dict, list]:
    file_path = JSON_DIR / filename
    
    if not file_path.exists():
        error_msg = f"Файл {filename} не найден в директории json/"
        log_event("ERROR", error_msg)
        raise FileNotFoundError(error_msg)
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        error_msg = f"Ошибка парсинга JSON в {filename}: {e}"
        log_event("ERROR", error_msg)
        raise ValueError(error_msg)

def validate_client_data(client: dict):
    required_fields = ["age", "family_status", "profession", "pain_points", "goals", "fears"]
    missing = [f for f in required_fields if f not in client]
    
    if missing:
        error_msg = f"В client.json отсутствуют поля: {', '.join(missing)}"
        log_event("ERROR", error_msg)
        raise ValueError(error_msg)

def validate_manager_data(manager: dict):
    required_fields = ["name", "phone", "telegram", "whatsapp"]
    missing = [f for f in required_fields if f not in manager]
    
    if missing:
        error_msg = f"В manager_con.json отсутствуют поля: {', '.join(missing)}"
        log_event("ERROR", error_msg)
        raise ValueError(error_msg)

def format_list_as_string(items: list) -> str:
    if isinstance(items, list):
        return ", ".join(str(item) for item in items)
    return str(items)

def replace_placeholders(template: str, client: dict, manager: dict) -> str:
    replacements = {
        "{client_age}": str(client.get("age", "")),
        "{client_family_status}": client.get("family_status", ""),
        "{client_profession}": client.get("profession", ""),
        "{client_income}": client.get("income", "не указан"),
        "{client_pain_points}": format_list_as_string(client.get("pain_points", [])),
        "{client_goals}": format_list_as_string(client.get("goals", [])),
        "{client_fears}": format_list_as_string(client.get("fears", [])),
        "{manager_name}": manager.get("name", ""),
        "{manager_phone}": manager.get("phone", ""),
        "{manager_telegram}": manager.get("telegram", ""),
        "{manager_whatsapp}": manager.get("whatsapp", ""),
        "{manager_email}": manager.get("email", "")
    }
    
    result = template
    for key, value in replacements.items():
        result = result.replace(key, value)
    
    return result

def download_image(url: str, save_path: Path) -> bool:
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, timeout=30, headers=headers, stream=True)
        response.raise_for_status()
        
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        return False

def extract_images_from_page(page, apartment_id: str) -> List[str]:
    """Извлекает и скачивает изображения в подпапку image/{apartment_id}/"""
    try:
        images = page.eval_on_selector_all(
            'img[src*="http"]',
            'elements => elements.map(el => el.src).filter(src => src && !src.includes("data:image") && !src.includes("icon") && !src.includes("logo") && !src.includes("avatar") && !src.includes("1x1"))'
        )
        
        unique_images = []
        seen = set()
        for img_url in images:
            if img_url not in seen and len(unique_images) < 10:
                seen.add(img_url)
                unique_images.append(img_url)
        
        # Создаём подпапку для этой квартиры
        apartment_image_dir = IMAGE_DIR / apartment_id
        apartment_image_dir.mkdir(exist_ok=True)
        
        downloaded_paths = []
        for idx, img_url in enumerate(unique_images, 1):
            ext = ".jpg"
            if ".png" in img_url.lower():
                ext = ".png"
            elif ".webp" in img_url.lower():
                ext = ".webp"
            
            filename = f"{idx}{ext}"
            save_path = apartment_image_dir / filename
            
            if download_image(img_url, save_path):
                # Сохраняем относительный путь для FastAPI
                downloaded_paths.append(f"image/{apartment_id}/{filename}")
        
        return downloaded_paths
    except Exception as e:
        log_event("ERROR", f"Ошибка при извлечении изображений: {e}")
        return []

def get_page_via_jina(url: str, apartment_id: str) -> Tuple[str, List[str]]:
    """Использует Jina Reader как запасной вариант."""
    try:
        jina_url = f"https://r.jina.ai/{url}"
        headers = {
            "Accept": "text/plain",
            "X-No-Cache": "true",
            "X-With-Generated-Alt": "true"
        }
        response = requests.get(jina_url, headers=headers, timeout=60)
        response.raise_for_status()
        
        text = response.text
        
        # Извлекаем URL изображений из markdown Jina
        import re
        image_urls = re.findall(r'!\[.*?\]\((https?://[^\s\)]+)\)', text)
        
        # Создаём подпапку для этой квартиры
        apartment_image_dir = IMAGE_DIR / apartment_id
        apartment_image_dir.mkdir(exist_ok=True)
        
        downloaded_paths = []
        seen = set()
        for idx, img_url in enumerate(image_urls, 1):
            if img_url not in seen and len(downloaded_paths) < 10:
                seen.add(img_url)
                ext = ".jpg"
                if ".png" in img_url.lower():
                    ext = ".png"
                elif ".webp" in img_url.lower():
                    ext = ".webp"
                
                filename = f"{idx}{ext}"
                save_path = apartment_image_dir / filename
                
                if download_image(img_url, save_path):
                    downloaded_paths.append(f"image/{apartment_id}/{filename}")
        
        return text, downloaded_paths
    except Exception as e:
        return f"Ошибка Jina: {e}", []

def get_page_content_and_images(url: str, apartment_id: str) -> Tuple[str, List[str]]:
    """Основной парсер с fallback на Jina."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            )
            
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="ru-RU",
                bypass_csp=True,
            )
            
            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
                Object.defineProperty(navigator, 'languages', {get: () => ['ru-RU', 'ru', 'en']});
            """)
            
            page = context.new_page()
            page.goto(url, timeout=120000, wait_until="domcontentloaded")
            page.wait_for_timeout(10000)
            
            try:
                page.wait_for_selector("h1", timeout=15000)
            except PlaywrightTimeout:
                pass
            
            text = page.inner_text('body')
            images = extract_images_from_page(page, apartment_id)
            
            browser.close()

            if "подтвердите, что вы не робот" in text.lower():
                log_event("WARNING", "Playwright: обнаружена капча, переключаемся на Jina", url)
                return get_page_via_jina(url, apartment_id)
            
            if "request id" in text.lower() or "ip address" in text.lower():
                log_event("WARNING", "Playwright: блокировка по IP, переключаемся на Jina", url)
                return get_page_via_jina(url, apartment_id)
            
            if len(text) < 500:
                log_event("WARNING", "Playwright: слишком мало данных, переключаемся на Jina", url)
                return get_page_via_jina(url, apartment_id)
            
            return text, images
            
    except PlaywrightTimeout as e:
        log_event("WARNING", f"Playwright timeout, fallback на Jina Reader: {e}", url)
        return get_page_via_jina(url, apartment_id)
        
    except Exception as e:
        log_event("WARNING", f"Playwright ошибка, fallback на Jina Reader: {e}", url)
        return get_page_via_jina(url, apartment_id)

def search_additional_info(query: str) -> str:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
            return "\n".join([f"{r['title']}: {r['body']}" for r in results])
    except Exception:
        return ""

def call_llm(prompt_text: str, max_tokens: int = 2500) -> str:
    url = "https://api.aitunnel.ru/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek/deepseek-v4-flash",
        "messages": [
            {"role": "system", "content": "Ты эксперт по недвижимости. Работай ТОЛЬКО с предоставленными данными. НИКОГДА не выдумывай информацию."},
            {"role": "user", "content": prompt_text}
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens
    }

    response = requests.post(url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    
    return response.json()["choices"][0]["message"]["content"]

def extract_apartment_data(page_text: str, extra_search: str) -> dict:
    prompt = f"""
Извлеки информацию о квартире из текста объявления и верни СТРОГО в формате JSON.
Если какой-то информации НЕТ в тексте - пиши null (не "Нет данных").
НИКОГДА не выдумывай данные. Используй ТОЛЬКО факты из текста.

Верни JSON точно в таком формате (без markdown, просто JSON):
{{
  "address": "полный адрес или null",
  "price": число_в_рублях_или_null,
  "rooms": "количество_комнат_строкой_или_null",
  "floor": "этаж/всего_этажей_строкой_или_null",
  "area": число_площадь_или_null,
  "description": "краткое_описание_2_3_предложения_или_null"
}}

ТЕКСТ ОБЪЯВЛЕНИЯ:
{page_text[:8000]}

ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:
{extra_search[:2000]}

Верни ТОЛЬКО JSON, без объяснений:
"""
    
    response = call_llm(prompt, max_tokens=1000)
    
    try:
        response_clean = response.strip()
        if response_clean.startswith("```"):
            lines = response_clean.split('\n')
            response_clean = '\n'.join(lines[1:-1])
        
        data = json.loads(response_clean)
        return data
    except Exception as e:
        log_event("ERROR", f"Не удалось распарсить JSON от LLM: {e}")
        return {
            "address": None,
            "price": None,
            "rooms": None,
            "floor": None,
            "area": None,
            "description": None
        }

def determine_source(url: str) -> str:
    if "avito.ru" in url:
        return "avito"
    elif "cian.ru" in url:
        return "cian"
    elif "domclick.ru" in url:
        return "domclick"
    elif "etagi.com" in url:
        return "etagi"
    else:
        return "unknown"

def generate_presentation_prompt(apartment_data: dict, prompt_template: str) -> str:
    apartment_text = "\n".join([f"{k}: {v}" for k, v in apartment_data.items() if v is not None])
    
    full_prompt = f"""
{prompt_template}

ДАННЫЕ О КВАРТИРЕ:
{apartment_text}

Сгенерируй полный промт для Gamma.app на основе этих данных.
"""
    
    return call_llm(full_prompt, max_tokens=2500)

def main():
    url = ""
    try:
        if not API_KEY:
            raise ValueError("API_KEY не найден в .env файле")
        
        ensure_dirs_exist()
        
        url_data = load_json_file("url_input.json")
        url = url_data.get("url", "").strip()
        
        if not url:
            raise ValueError("URL не указан в url_input.json")
        
        log_event("START", "Начало обработки", url)
        
        client = load_json_file("client.json")
        validate_client_data(client)
        
        manager = load_json_file("manager_con.json")
        validate_manager_data(manager)
        
        prompt_data = load_json_file("present_promt_input.json")
        prompt_template = prompt_data.get("prompt_template", "")
        
        if not prompt_template:
            raise ValueError("prompt_template пуст в present_promt_input.json")
        
        apartment_id = str(uuid.uuid4())
        
        page_text, images = get_page_content_and_images(url, apartment_id)
        
        if "Ошибка" in page_text and "Jina" in page_text:
            log_event("ERROR", f"Критическая ошибка парсинга: {page_text}", url)
            # Выводим ошибку в JSON формате для FastAPI
            error_response = {
                "status": "error",
                "error": page_text,
                "url": url
            }
            print(json.dumps(error_response, ensure_ascii=False))
            return
        
        extra_info = ""
        if "район" not in page_text.lower() and "жк" not in page_text.lower():
            search_query = page_text[:200].replace('\n', ' ')
            extra_info = search_additional_info(f"ЖК или район {search_query} инфраструктура отзывы")
        
        apartment_raw_data = extract_apartment_data(page_text, extra_info)
        
        source = determine_source(url)
        created_at = datetime.now().isoformat()
        
        rooms = apartment_raw_data.get("rooms")
        area = apartment_raw_data.get("area")
        floor = apartment_raw_data.get("floor")
        
        rooms_text = f"{rooms}-комн" if rooms else ""
        area_text = f"{area} м²" if area else ""
        floor_text = f"{floor} эт." if floor else ""
        title_parts = [p for p in [rooms_text, area_text, floor_text] if p]
        title = ", ".join(title_parts) if title_parts else "Квартира"
        
        price = apartment_raw_data.get("price")
        price_per_sqm = None
        if price and area and area > 0:
            price_per_sqm = round(price / area)
        
        # Объект квартиры для FastAPI
        apartment_card = {
            "id": apartment_id,
            "title": title,
            "price": price,
            "price_per_sqm": price_per_sqm,
            "address": apartment_raw_data.get("address"),
            "rooms": rooms,
            "floor": floor,
            "area": area,
            "description": apartment_raw_data.get("description"),
            "images": images,
            "source": source,
            "url": url,
            "created_at": created_at
        }
        
        filled_prompt = replace_placeholders(prompt_template, client, manager)
        
        presentation_prompt = generate_presentation_prompt(apartment_raw_data, filled_prompt)
        
        # Объект презентации для FastAPI
        presentation_data = {
            "id": apartment_id,
            "timestamp": created_at,
            "status": "success",
            "url": url,
            "apartment_data": apartment_raw_data,
            "client": client,
            "manager": manager,
            "presentation_prompt": presentation_prompt
        }
        
        # Выводим JSON на stdout для FastAPI
        response = {
            "status": "success",
            "apartment_card": apartment_card,
            "presentation_data": presentation_data
        }
        
        print(json.dumps(response, ensure_ascii=False))
        
        log_event("SUCCESS", f"Квартира добавлена с ID: {apartment_id}", url, {
            "apartment_id": apartment_id,
            "images_count": len(images),
            "prompt_length": len(presentation_prompt)
        })
        
    except Exception as e:
        error_data = {
            "error_type": type(e).__name__,
            "error_message": str(e)
        }
        log_event("ERROR", str(e), url, error_data)
        
        # Выводим ошибку в JSON формате для FastAPI
        error_response = {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "url": url if 'url' in locals() else ""
        }
        print(json.dumps(error_response, ensure_ascii=False))
        raise

if __name__ == "__main__":
    main()