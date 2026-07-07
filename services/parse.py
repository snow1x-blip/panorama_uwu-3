import json
import uuid
import requests
from pathlib import Path
from datetime import datetime
from typing import Optional
from duckduckgo_search import DDGS
from playwright.async_api import async_playwright

from utils import (
    IMAGE_DIR, log_event, load_json_file,
    validate_client_data, validate_manager_data,
    replace_placeholders, append_to_json_array
)

import os
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.environ.get("API_KEY")


def validate_input_data():
    """Проверяет наличие и валидность всех входных JSON файлов."""
    client = load_json_file("client.json")
    validate_client_data(client)

    manager = load_json_file("manager_con.json")
    validate_manager_data(manager)

    prompt_data = load_json_file("present_promt_input.json")
    prompt_template = prompt_data.get("prompt_template", "")
    if not prompt_template:
        raise ValueError("prompt_template пуст в present_promt_input.json")

    return client, manager, prompt_template


async def download_image(url: str, save_path: Path) -> bool:
    try:
        response = requests.get(url, timeout=30, stream=True)
        response.raise_for_status()
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception:
        return False


async def extract_and_download_images(page, apartment_id: str) -> list:
    try:
        images = await page.eval_on_selector_all(
            'img[src*="http"]',
            'elements => elements.map(el => el.src).filter(src => src && !src.includes("data:image") && !src.includes("icon") && !src.includes("logo") && !src.includes("avatar"))'
        )

        unique_images = []
        seen = set()
        for img_url in images:
            if img_url not in seen and len(unique_images) < 10:
                seen.add(img_url)
                unique_images.append(img_url)

        downloaded_paths = []
        for idx, img_url in enumerate(unique_images, 1):
            ext = ".jpg"
            if ".png" in img_url.lower():
                ext = ".png"
            elif ".webp" in img_url.lower():
                ext = ".webp"

            filename = f"{apartment_id}_{idx}{ext}"
            save_path = IMAGE_DIR / filename

            if await download_image(img_url, save_path):
                downloaded_paths.append(f"static/img/{filename}")

        return downloaded_paths
    except Exception as e:
        log_event("ERROR", f"Ошибка при извлечении изображений: {e}")
        return []


async def get_page_content_and_images(url: str, apartment_id: str) -> tuple:
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="ru-RU"
            )
            page = await context.new_page()

            await page.goto(url, timeout=90000, wait_until="domcontentloaded")

            try:
                await page.wait_for_selector(
                    "h1, [class*='price'], [class*='Price'], [data-name='Price']",
                    timeout=15000
                )
            except Exception:
                pass

            await page.wait_for_timeout(5000)

            text = await page.inner_text('body')
            images = await extract_and_download_images(page, apartment_id)

            await browser.close()

            if "подтвердите, что вы не робот" in text.lower():
                return "Ошибка: Сайт показал капчу", []
            if "request id" in text.lower() or "ip address" in text.lower():
                return "Ошибка: Сайт заблокировал доступ", []
            if len(text) < 500:
                return f"Ошибка: Получено слишком мало данных ({len(text)} символов)", []

            return text, images

    except Exception as e:
        error_msg = str(e)
        if "Timeout" in error_msg:
            try:
                log_event("WARNING", "Таймаут при загрузке, пытаемся извлечь загруженный контент", url)
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    context = await browser.new_context(
                        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        viewport={"width": 1920, "height": 1080},
                        locale="ru-RU"
                    )
                    page = await context.new_page()
                    await page.goto(url, timeout=30000, wait_until="commit")
                    await page.wait_for_timeout(8000)

                    text = await page.inner_text('body')
                    images = await extract_and_download_images(page, apartment_id)
                    await browser.close()

                    if len(text) > 500:
                        log_event("INFO", f"Удалось извлечь контент после таймаута: {len(text)} символов", url)
                        return text, images
                    else:
                        return "Ошибка: Сайт заблокировал доступ или не загрузился", []
            except Exception as retry_error:
                log_event("ERROR", f"Повторная попытка не удалась: {retry_error}", url)
                return f"Ошибка загрузки: {retry_error}", []

        return f"Ошибка загрузки: {e}", []


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
        return json.loads(response_clean)
    except Exception as e:
        log_event("ERROR", f"Не удалось распарсить JSON от LLM: {e}")
        return {
            "address": None, "price": None, "rooms": None,
            "floor": None, "area": None, "description": None
        }


def determine_source(url: str) -> str:
    result = url.split(".")
    return result[1]


def generate_presentation_prompt(apartment_data: dict, prompt_template: str) -> str:
    apartment_text = "\n".join([f"{k}: {v}" for k, v in apartment_data.items() if v is not None])
    full_prompt = f"""
{prompt_template}

ДАННЫЕ О КВАРТИРЕ:
{apartment_text}

Сгенерируй полный промт для Gamma.app на основе этих данных.
"""
    return call_llm(full_prompt, max_tokens=2500)


async def process_apartment(url: str) -> dict:
    """Основная функция обработки — вызывается из эндпоинта."""
    if not API_KEY:
        raise ValueError("API_KEY не найден в .env файле")

    client, manager, prompt_template = validate_input_data()

    apartment_id = str(uuid.uuid4())
    log_event("START", "Начало обработки", url)

    page_text, images = await get_page_content_and_images(url, apartment_id)

    if "Ошибка" in page_text:
        log_event("ERROR", f"Ошибка парсинга: {page_text}", url)
        raise Exception(page_text)

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

    append_to_json_array("cvartiry.json", apartment_card)

    filled_prompt = replace_placeholders(prompt_template, client, manager)
    presentation_prompt = generate_presentation_prompt(apartment_raw_data, filled_prompt)

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

    append_to_json_array("present_promt_output.json", presentation_data)

    log_event("SUCCESS", f"Квартира добавлена с ID: {apartment_id}", url, {
        "apartment_id": apartment_id,
        "images_count": len(images),
        "prompt_length": len(presentation_prompt)
    })

    return {
        "apartment_id": apartment_id,
        "apartment_card": apartment_card,
        "presentation_prompt": presentation_prompt
    }
