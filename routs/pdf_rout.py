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
