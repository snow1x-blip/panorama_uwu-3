from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional, Union
from datetime import datetime


def _normalize_images(value) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        result = []
        for v in value.values():
            if isinstance(v, list):
                result.extend(v)
        return result
    return []


class ApartmentCreate(BaseModel):
    title: str
    price: int
    price_per_sqm: Optional[int] = None
    address: str
    rooms: Optional[str] = None
    floor: Optional[str] = None
    area: Optional[float] = None
    description: Optional[str] = None
    images: list = []
    source: Optional[str] = None
    url: str

    @field_validator("images", mode="before")
    @classmethod
    def normalize_images(cls, v):
        return _normalize_images(v)

class ApartmentResponse(BaseModel):
    id: str
    title: str
    price: int
    price_per_sqm: Optional[int]
    address: str
    rooms: Optional[str]
    floor: Optional[str]
    area: Optional[float]
    description: Optional[str]
    images: list
    source: Optional[str]
    url: str
    created_at: datetime

    @field_validator("images", mode="before")
    @classmethod
    def normalize_images(cls, v):
        return _normalize_images(v)

    class Config:
        from_attributes = True
