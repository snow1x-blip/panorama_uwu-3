import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routs.point_rout import router as point_router
from routs.user_rout import router as user_router
from routs.pdf_rout import router as pdf_router
from routs.link_rout import router as link_router
from routs.rooms_rout import router as rooms_router
from routs.presa_pr_rout import router as presa_router
from database import Base, engine
from utils import ensure_dirs_exist


Base.metadata.create_all(bind=engine)
ensure_dirs_exist()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_IMG_DIR = Path("esoft_front/static/img")
STATIC_IMG_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/esoft_front", StaticFiles(directory="esoft_front"), name="esoft_front")
app.mount("/static", StaticFiles(directory="esoft_front/static"), name="static")
app.mount("/front", StaticFiles(directory="front"), name="front")

app.include_router(point_router)
app.include_router(user_router)
app.include_router(pdf_router)
app.include_router(link_router)
app.include_router(rooms_router)
app.include_router(presa_router)


@app.get("/")
async def root():
    return FileResponse("front/index.html")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

