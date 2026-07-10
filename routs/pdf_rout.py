import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from models.user import User
from models.pdf import Pdf
from database import engine, get_db, Base
from services.user_services import get_current_user


router = APIRouter(
    tags=["pdf"],
    responses={404: {"description": "Not found"}},
)


@router.get("/files/{pdf_user}") 
async def get_pdf(pdf_user: str, db: Session = Depends(get_db)):
    query = select(Pdf).where(Pdf.user_name == pdf_user)
    result = db.execute(query)
    
    documents = result.scalars().all() 
    
    if not documents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Документы пользователя не найдены"
        )

    files_info = []
    for doc in documents:
        if os.path.exists(doc.path_to_pdf):
            files_info.append({
                "path": doc.path_to_pdf
            })

    return files_info


@router.get("/download/{filename}")
async def download_pdf(
    filename: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Эндпоинт для скачивания конкретного PDF файла.
    Проверяет, что файл действительно принадлежит текущему пользователю.
    """
    # Ищем файл в БД по имени и пользователю (защита от скачивания чужих файлов)
    # Примечание: если user_name в БД это email, используем current_user.email
    user_identifier = current_user.email if hasattr(current_user, 'email') else current_user.username
    
    query = select(Pdf).where(
        Pdf.user_name == user_identifier,
        Pdf.path_to_pdf.like(f"%{filename}") # Ищем по вхождению имени файла в путь
    )
    result = db.execute(query)
    doc = result.scalars().first()
    
    if not doc or not os.path.exists(doc.path_to_pdf):
        raise HTTPException(status_code=404, detail="Файл не найден или у вас нет к нему доступа")
        
    # Отдаем файл браузеру
    return FileResponse(
        path=doc.path_to_pdf,
        filename=filename,
        media_type='application/pdf'
    )


@router.post("/upload/pdf/{filename}")
def upload_pdf(
    filename: str, 
    db: Session = Depends(get_db), 
    current_user: Session = Depends(get_current_user)
):
    pass