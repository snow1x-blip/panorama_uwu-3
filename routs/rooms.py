from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.room import Apartment
from models.user import User
from schemas.rooms import ApartmentCreate, ApartmentResponse
from services.user_services import get_current_user

router = APIRouter(prefix="/apartments", tags=["apartments"])

@router.post("/", response_model=ApartmentResponse)
async def create_apartment(
    apartment: ApartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создание новой карточки квартиры"""
    db_apartment = Apartment(
        **apartment.dict(),
        user_id=current_user.id
    )
    db.add(db_apartment)
    db.commit()
    db.refresh(db_apartment)
    return db_apartment

@router.get("/", response_model=List[ApartmentResponse])
async def get_user_apartments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получение всех карточек пользователя"""
    apartments = db.query(Apartment).filter(
        Apartment.user_id == current_user.id
    ).order_by(Apartment.created_at.desc()).all()
    return apartments

@router.delete("/{apartment_id}")
async def delete_apartment(
    apartment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удаление карточки"""
    apartment = db.query(Apartment).filter(
        Apartment.id == apartment_id,
        Apartment.user_id == current_user.id
    ).first()
    
    if not apartment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Квартира не найдена"
        )
    
    db.delete(apartment)
    db.commit()
    return {"message": "Квартира удалена"}
