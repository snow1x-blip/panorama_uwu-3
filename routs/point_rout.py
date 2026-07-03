import shutil
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from models.point import Photo
from models.user import User
from database import engine, get_db, Base
from services.user_services import get_current_user


router = APIRouter(
    tags=["upload"],
    responses={404: {"description": "Not found"}},
)

@router.post("/upload")
async def upload_home(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Получаем текущего пользователя
):
    # Сохраняем файл на диск
    file_path = f"upload_photo/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Сохраняем информацию о файле в БД с именем пользователя
    db_photo = Photo(
        filename=file.filename,
        path_to_photo=file_path,
        user_name=current_user.email  # Записываем email текущего пользователя
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)

    return {
        "id": db_photo.id,
        "filename": db_photo.filename,
        "file_path": db_photo.path_to_photo,
        "user_name": db_photo.user_name,
        "message": "Success"
    }
