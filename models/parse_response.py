from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProcessUrlRequest(BaseModel):
    url: str = Field(..., description="Ссылка на объявление")


class ProcessUrlResponse(BaseModel):
    status: str
    apartment_id: str
    message: str
    data: Optional[dict] = None


class ApartmentCard(BaseModel):
    id: str
    title: str
    price: Optional[int] = None
    price_per_sqm: Optional[int] = None
    address: Optional[str] = None
    rooms: Optional[str] = None
    floor: Optional[str] = None
    area: Optional[float] = None
    description: Optional[str] = None
    images: list[str] = []
    source: str
    url: str
    created_at: str


class PresentationOutput(BaseModel):
    id: str
    timestamp: str
    status: str
    url: str
    apartment_data: dict
    client: dict
    manager: dict
    presentation_prompt: str


class ErrorResponse(BaseModel):
    detail: str
    error_type: Optional[str] = None
