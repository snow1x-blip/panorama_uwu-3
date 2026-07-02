# auth.py
import bcrypt
import os # Импортируем bcrypt напрямую вместо passlib
from dotenv import load_dotenv
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone

load_dotenv()
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- Убираем passlib.context, используем bcrypt напрямую ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt работает с байтами, поэтому кодируем строки в utf-8
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt() # Генерируем соль (по умолчанию 12 раундов)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    # Декодируем байты обратно в строку для сохранения в БД
    return hashed.decode('utf-8')

# --- Функция создания JWT токена остается без изменений ---
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
