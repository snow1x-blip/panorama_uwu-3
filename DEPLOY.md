# Деплой panorama на Debian 11 (Docker + Nginx)

## Шаг 1: Подготовка VPS

```bash
# Подключаемся к серверу
ssh root@ВАШ_IP

# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# Устанавливаем Docker Compose
apt install docker-compose-plugin -y

# Устанавливаем Nginx
apt install nginx -y
systemctl enable nginx
```

## Шаг 2: Копируем проект на сервер

**Вариант А: через git (рекомендуется)**
```bash
# На сервере:
mkdir -p /opt/panorama
cd /opt/panorama
git clone <URL_ВАШЕГО_РЕПО> .

# Или если репозиторий приватный:
git clone https://<TOKEN>@github.com/user/repo .
```

**Вариант Б: через scp**
```bash
# На локальной машине:
scp -r /home/neutrino/Documents/panorama_uwu-3/* root@ВАШ_IP:/opt/panorama/
```

## Шаг 3: Настройка окружения

```bash
cd /opt/panorama

# Создаём .env файл
cp .env.example .env

# Генерируем секретный ключ
python3 -c "import secrets; print(secrets.token_hex(32))"

# Подставляем сгенерированный ключ в .env
nano .env
# Замените your-secret-key-here-change-me на сгенерированный ключ
```

## Шаг 4: Сборка Docker образа

```bash
cd /opt/panorama

# Собираем образ и запускаем
docker compose up -d --build

# Проверяем логи
docker compose logs -f
```

**Если看到 ошибку с Python 3.14:**
Python 3.14 может быть недоступен в официальном образе. В этом случае:
```bash
# Используйте более стабильную версию
# В Dockerfile замените:
FROM python:3.14-slim-bookworm
# На:
FROM python:3.12-slim-bookworm
```

## Шаг 5: Настройка Nginx

```bash
# Копируем конфигурацию
cp nginx.conf /etc/nginx/sites-available/panorama

# Активируем сайт
ln -sf /etc/nginx/sites-available/panorama /etc/nginx/sites-enabled/

# Удаляем дефолтный конфиг (опционально)
rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
nginx -t

# Перезагружаем Nginx
systemctl reload nginx
```

## Шаг 6: Проверка работы

```bash
# Проверяем контейнер
docker compose ps

# Проверяем приложение напрямую
curl http://localhost:8000

# Проверяем через Nginx
curl http://localhost

# Проверяем статус сервисов
systemctl status nginx
docker compose logs app
```

## Шаг 7: Настройка SSL (опционально, но рекомендуется)

```bash
# Устанавливаем Certbot
apt install certbot python3-certbot-nginx -y

# Получаем сертификат (замените domain.com на ваш домен)
certbot --nginx -d domain.com

# Автообновление сертификата
systemctl enable certbot.timer
```

## Полезные команды

```bash
# Остановить приложение
docker compose down

# Перезапустить
docker compose restart

# Посмотреть логи
docker compose logs -f app

# Обновить код и пересобрать
docker compose up -d --build

# Проверить диск
docker system df
```

## Структура файлов на сервере

```
/opt/panorama/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .env
├── .env.example
├── .dockerignore
├── main.py
├── database.py
├── auth.py
├── utils.py
├── pyproject.toml
├── uv.lock
├── front/
├── esoft_front/
├── models/
├── routs/
├── parser/
└── pdf/
```

## Устранение проблем

**Контейнер не стартует:**
```bash
docker compose logs app
# Частые проблемы:
# 1. Python 3.14 не найден → понизить версию в Dockerfile
# 2. Playwright не установился → проверить интернет в контейнере
# 3. Нет прав на запись → проверить volumes
```

**Nginx 502 Bad Gateway:**
```bash
# Проверяем что контейнер работает
docker compose ps
# Проверяем порт
netstat -tlnp | grep 8000
```

**База данных не сохраняется:**
```bash
# Проверяем volume
docker volume inspect panorama_app_data
# Проверяем путь в контейнере
docker compose exec app ls -la /app/data/
```
