from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.presa_prompt import generate_pres_prompt

router = APIRouter(
    prefix="/ai_gen",
    tags=["ai_gen"],
)

class ApartmentData(BaseModel):
    id: str
    title: str
    address: str
    price: str
    source: str

@router.post("/presa")
async def prompt_presa(apartment: ApartmentData):
    try:
        # Форматируем данные квартиры в строку для AI
        apartment_text = (
            f"ID: {apartment.id}\n"
            f"Название: {apartment.title}\n"
            f"Адрес: {apartment.address}\n"
            f"Цена: {apartment.price}\n"
            f"Источник: {apartment.source}"
        )
        
        # Генерируем презентацию
        result = generate_pres_prompt(apartment_text)
        
        return {"text": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации: {str(e)}")
