<<<<<<< HEAD
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import documents, classification, estates

app = FastAPI(title="EstateClear API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
=======
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

base_dir = Path(__file__).resolve().parent
load_dotenv(base_dir / ".env", override=False)
load_dotenv(base_dir / "venv" / ".env", override=False)

from backend.auth.router import router as auth_router
from backend.database import init_db
from backend.estates.router import router as estates_router

app = FastAPI(title="EstateClear Backend API - Person 1")

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
>>>>>>> chondu
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

<<<<<<< HEAD
app.include_router(documents.router)
app.include_router(classification.router)
app.include_router(estates.router)

@app.get("/")
def read_root():
    return {"message": "EstateClear API is running"}
=======
from backend.documents.router import router as documents_router

app.include_router(auth_router)
app.include_router(estates_router)
app.include_router(documents_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
>>>>>>> chondu
