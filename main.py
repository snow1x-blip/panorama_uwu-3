import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routs.point_rout import router as point_router
from routs.user_rout import router as user_router
from routs.pdf_rout import router as pdf_router
from database import Base, engine


Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(point_router)
app.include_router(user_router)
app.include_router(pdf_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
