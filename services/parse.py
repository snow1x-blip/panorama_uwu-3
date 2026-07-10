import json
import uuid
import requests
from pathlib import Path
from datetime import datetime
from duckduckgo_search import DDGS
from playwright.async_api import async_playwright

from utils import (
    IMAGE_DIR, log_event,
    append_to_json_array
)

import os
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.environ.get("API_KEY")


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


IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg")


def _is_image_url(url: str) -> bool:
    """Проверяет URL на то, что он может быть изображением."""
    url_lower = url.lower()
    if url_lower.startswith("data:"):
        return False
    path = url_lower.split("?")[0]
    if path.endswith(IMAGE_EXTENSIONS):
        return True
    if any(seg in url_lower for seg in ("/image", "/photo", "/img/", "/ pictures", "/uploads/")):
        return True
    return False


def create_apartment_dirs(apartment_id: str) -> Path:
    """Создаёт директорию {apartment_id}/ для изображений."""
    apartment_dir = IMAGE_DIR / apartment_id
    apartment_dir.mkdir(parents=True, exist_ok=True)
    return apartment_dir


TRASH_URL_SEGMENTS = (
    "/logo", "/icon", "/avatar", "/badge", "/sprite",
    "/button", "/arrow", "/close", "/menu", "/search",
    "/social", "/share", "/print", "/heart", "/like",
    "/footer", "/header", "/banner", "/adv", "/advert",
    "/pixel", "/track", "/analytics", "/counter", "/beacon",
)


def _is_junk_url(url: str) -> bool:
    """Проверяет URL на признаки мусора (лого, иконки, трекеры)."""
    url_lower = url.lower().split("?")[0]
    if url_lower.endswith(".svg"):
        return True
    if url_lower.endswith((".gif",)):
        return True
    for seg in TRASH_URL_SEGMENTS:
        if seg in url_lower:
            return True
    return False


MIN_IMAGE_BYTES = 5_000
MIN_IMAGE_DIM = 150


def _is_junk_file(path: Path) -> bool:
    """Проверяет скачанное изображение на признаки мусора по размеру и геометрии."""
    if not path.exists():
        return True
    if path.stat().st_size < MIN_IMAGE_BYTES:
        return True

    try:
        from PIL import Image
        img = Image.open(path)
        w, h = img.size
        if w < MIN_IMAGE_DIM or h < MIN_IMAGE_DIM:
            return True
    except Exception:
        pass

    return False


async def _download_and_filter_images(
    collected_urls: list[str],
    apartment_id: str,
    apartment_dir: Path,
) -> list[str]:
    """Скачивает изображения, фильтрует мусор, возвращает список URL для ответа."""
    good_images: list[str] = []
    seen: set[str] = set()

    for idx, img_url in enumerate(collected_urls, 1):
        if img_url in seen:
            continue
        seen.add(img_url)

        if _is_junk_url(img_url):
            continue

        url_lower = img_url.lower().split("?")[0]
        ext = ".jpg"
        if url_lower.endswith(".png"):
            ext = ".png"
        elif url_lower.endswith(".webp"):
            ext = ".webp"

        filename = f"{apartment_id}_{idx}{ext}"
        save_path = apartment_dir / filename

        if await download_image(img_url, save_path):
            if _is_junk_file(save_path):
                save_path.unlink(missing_ok=True)
                continue
            good_images.append(f"/static/img/{apartment_id}/{filename}")

    return good_images


async def get_page_content_and_images(url: str, apartment_id: str) -> tuple:
    apartment_dir = create_apartment_dirs(apartment_id)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="ru-RU"
            )
            page = await context.new_page()

            await page.route("**/*", lambda route: route.continue_())
            collected_image_urls: list[str] = []

            def _check_response(response):
                try:
                    ct = response.headers.get("content-type", "")
                    if ct.startswith("image/"):
                        collected_image_urls.append(response.url)
                    elif _is_image_url(response.url):
                        collected_image_urls.append(response.url)
                except Exception:
                    pass

            page.on("response", _check_response)

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

            log_event("INFO", f"Собрано URL изображений: {len(collected_image_urls)}", url)
            images = await _download_and_filter_images(
                collected_image_urls, apartment_id, apartment_dir
            )
            log_event("INFO", f"Оставлено изображений: {len(images)}", url)

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

                    collected_image_urls: list[str] = []

                    def _check_response_retry(response):
                        try:
                            ct = response.headers.get("content-type", "")
                            if ct.startswith("image/"):
                                collected_image_urls.append(response.url)
                            elif _is_image_url(response.url):
                                collected_image_urls.append(response.url)
                        except Exception:
                            pass

                    page.on("response", _check_response_retry)

                    await page.goto(url, timeout=30000, wait_until="commit")
                    await page.wait_for_timeout(8000)

                    text = await page.inner_text('body')

                    images = await _download_and_filter_images(
                        collected_image_urls, apartment_id, apartment_dir
                    )

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


async def process_apartment(url: str) -> dict:
    """Основная функция обработки — вызывается из эндпоинта."""
    if not API_KEY:
        raise ValueError("API_KEY не найден в .env файле")

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

    log_event("SUCCESS", f"Квартира добавлена с ID: {apartment_id}", url, {
        "apartment_id": apartment_id,
        "images_count": len(images),
    })

    return {
        "apartment_id": apartment_id,
        "apartment_card": apartment_card,
    }
