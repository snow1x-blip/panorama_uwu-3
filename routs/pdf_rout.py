import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from models.user import User
from models.pdf import Pdf
from database import engine, get_db, Base
from services.user_services import get_current_user

UPLOAD_DIR = Path("uploads/pdfs")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
BASE_DIR_PRESENTON = "/home/snow1x/presenton_ai/presenton/"

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
    user_identifier = current_user.email if hasattr(current_user, 'email') else current_user.username
    
    query = select(Pdf).where(
        Pdf.user_name == user_identifier,
        Pdf.path_to_pdf.like(f"%{filename}") 
    )
    result = db.execute(query)
    doc = result.scalars().first()
    
    if not doc or not os.path.exists(doc.path_to_pdf):
        raise HTTPException(status_code=404, detail="Файл не найден или у вас нет к нему доступа")
        
    return FileResponse(
        path=doc.path_to_pdf,
        filename=filename,
        media_type='application/pdf'
    )

@router.post("/upload/pdf/{filename}")
async def upload_pdf(
    filename: str, 
    file: UploadFile = File(...),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Неверный формат файла. Разрешен только PDF."
        )

    if not filename.lower().endswith('.pdf'):
        filename += '.pdf'
        
    file_path = UPLOAD_DIR / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при сохранении файла: {str(e)}"
        )

    user_identifier = current_user.email if hasattr(current_user, 'email') else current_user.username

    new_pdf = Pdf(
        user_name=user_identifier,
        path_to_pdf=str(file_path) 
    )
    
    db.add(new_pdf)
    db.commit()
    db.refresh(new_pdf)

    return {
        "message": "Файл успешно загружен",
        "filename": filename,
        "path": str(file_path),
        "id": new_pdf.id
    }


@router.get("/download_presenton/{filename}")
async def download_pdf(
    filename: str,
):
    filepath = f"{BASE_DIR_PRESENTON}/{filename}"

    if not str(file_path).startswith(str(BASE_DIR_PRESENTON)):
        raise HTTPException(
            status_code=400, 
            detail="Ошибка: недопустимый путь к файлу"
        )

    if not filepath.is_file():
        raise HTTPException(status_code=404, detail="Файл не найден")    
        
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type='application/pdf'
    )
