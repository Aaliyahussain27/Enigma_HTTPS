from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import documents, classification, estates

app = FastAPI(title="EstateClear API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(classification.router)
app.include_router(estates.router)

@app.get("/")
def read_root():
    return {"message": "EstateClear API is running"}
