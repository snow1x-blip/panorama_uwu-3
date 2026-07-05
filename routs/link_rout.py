import asyncio
from contextlib import asynccontextmanager
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from models.parse_response import ProcessUrlRequest, ProcessUrlResponse, ErrorResponse
from services.parse import process_apartment
from utils import ensure_dirs_exist, log_event


router = APIRouter(
    tags=["link"],
    responses={404: {"description": "Not found"}},
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_dirs_exist()
    yield


@router.post(
    "/process",
    response_model=ProcessUrlResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Обработать URL объявления",
    description="Парсит страницу объявления, извлекает данные о квартире и генерирует промт для презентации"
)
async def process_url(request: ProcessUrlRequest):
    url = request.url.strip()

    if not url:
        raise HTTPException(status_code=400, detail="URL не может быть пустым")

    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL должен начинаться с http:// или https://")

    try:
        result = await process_apartment(url)
        return ProcessUrlResponse(
            status="success",
            apartment_id=result["apartment_id"],
            message="Квартира успешно обработана",
            data=result
        )
    except FileNotFoundError as e:
        log_event("ERROR", str(e), url)
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        log_event("ERROR", str(e), url)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log_event("ERROR", str(e), url, {"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail=f"Ошибка обработки: {str(e)}")
