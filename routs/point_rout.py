import shutil
from fastapi import APIRouter, UploadFile, File


router = APIRouter(
    tags=["upload"],
    responses={404: {"description": "Not found"}},
)

@router.post("/upload")
async def upload_home(file: UploadFile = File()):
    with open(f"upload_photo/{file.filename}", "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"filename": file.filename, "message": "Succes"}
