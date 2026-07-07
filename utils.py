import json
import socket
import ipaddress
from urllib.parse import urlparse
from pathlib import Path
from datetime import datetime
from typing import Union

JSON_DIR = Path("parser/json")
IMAGE_DIR = Path("esoft_front/static/img")

# Домены объявлений, которые разрешено парсить
ALLOWED_DOMAINS = ["avito.ru", "cian.ru", "domofond.ru", "etagi.com"]


def ensure_dirs_exist():
    JSON_DIR.mkdir(exist_ok=True, parents=True)
    IMAGE_DIR.mkdir(exist_ok=True, parents=True)


def validate_apartment_url(url: str) -> None:
    """
    Проверяет, что ссылка ведет на разрешенный домен объявлений
    и не указывает на внутренние/приватные адреса (защита от SSRF).
    Бросает ValueError с понятным сообщением при любой проблеме.
    """
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL должен начинаться с http:// или https://")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Не удалось определить домен ссылки")

    hostname_lower = hostname.lower()
    is_allowed = any(
        hostname_lower == domain or hostname_lower.endswith(f".{domain}")
        for domain in ALLOWED_DOMAINS
    )
    if not is_allowed:
        raise ValueError(
            f"Поддерживаются только сайты: {', '.join(ALLOWED_DOMAINS)}"
        )

    # SSRF-защита: не даем сходить на localhost / приватные сети,
    # даже если злоумышленник подделает домен через DNS rebinding
    try:
        resolved = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise ValueError("Не удалось разрешить домен ссылки")

    for entry in resolved:
        ip_str = entry[4][0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        ):
            raise ValueError("Ссылка ведет на недопустимый адрес")



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
        except Exception:
            logs = []

    logs.append(log_data)

    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)


def load_json_file(filename: str) -> Union[dict, list]:
    file_path = JSON_DIR / filename
    if not file_path.exists():
        raise FileNotFoundError(f"Файл {filename} не найден в директории json/")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Ошибка парсинга JSON в {filename}: {e}")


def load_json_array(filename: str) -> list:
    file_path = JSON_DIR / filename
    if not file_path.exists():
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def save_json_file(filename: str, data):
    file_path = JSON_DIR / filename
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def append_to_json_array(filename: str, item: dict):
    array = load_json_array(filename)
    array.append(item)
    save_json_file(filename, array)


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
