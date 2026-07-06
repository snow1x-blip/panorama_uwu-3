from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class ApartmentCreate(BaseModel):
    title: str
    price: int
    price_per_sqm: Optional[int] = None
    address: str
    rooms: Optional[str] = None
    floor: Optional[str] = None
    area: Optional[float] = None
    description: Optional[str] = None
    images: List[str] = []
    source: Optional[str] = None
    url: str

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
    images: List[str]
    source: Optional[str]
    url: str
    created_at: datetime  # Изменено с str на datetime
    
    class Config:
        from_attributes = True
