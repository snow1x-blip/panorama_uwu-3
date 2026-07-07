from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.parse_response import ProcessUrlRequest, ProcessUrlResponse, ErrorResponse
from models.room import Apartment
from models.user import User
from services.parse import process_apartment
from services.user_services import get_current_user
from utils import log_event, validate_apartment_url


router = APIRouter(
    tags=["link"],
    responses={404: {"description": "Not found"}},
)


@router.post(
    "/process",
    response_model=ProcessUrlResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    },
    summary="Обработать URL объявления",
    description="Парсит страницу объявления, извлекает данные о квартире, сохраняет карточку в БД и генерирует промт для презентации"
)
async def process_url(
    request: ProcessUrlRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = request.url.strip()

    if not url:
        raise HTTPException(status_code=400, detail="URL не может быть пустым")

    try:
        validate_apartment_url(url)
    except ValueError as e:
        log_event("ERROR", str(e), url)
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = await process_apartment(url)

        # Сразу сохраняем карточку в БД, привязав к текущему пользователю,
        # чтобы не было расхождения между JSON-архивом и БД
        card = result["apartment_card"]
        db_apartment = Apartment(
            title=card["title"],
            price=card["price"] or 0,
            price_per_sqm=card["price_per_sqm"],
            address=card["address"] or "Адрес не указан",
            rooms=card["rooms"],
            floor=card["floor"],
            area=card["area"],
            description=card["description"],
            images=card["images"],
            source=card["source"],
            url=card["url"],
            user_id=current_user.id,
        )
        db.add(db_apartment)
        db.commit()
        db.refresh(db_apartment)

        result["apartment_card"] = db_apartment.to_dict()

        return ProcessUrlResponse(
            status="success",
            apartment_id=db_apartment.id,
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
        raise HTTPException(status_code=500, detail="Ошибка обработки запроса")

