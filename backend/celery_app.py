"""
backend/celery_app.py
---------------------
Celery application instance for EstateClear.

Broker  : Redis  (REDIS_URL env var, default localhost:6379)
Backend : Redis  (same URL, db 1 for results)

Start the worker locally:
  celery -A backend.celery_app worker --loglevel=info -Q documents
"""

import os
from pathlib import Path

from celery import Celery
from dotenv import load_dotenv

_base = Path(__file__).resolve().parent
load_dotenv(_base / ".env", override=False)
load_dotenv(_base / "venv" / ".env", override=False)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_RESULT_BACKEND = REDIS_URL.rsplit("/", 1)[0] + "/1"

celery_app = Celery(
    "estateclear",
    broker=REDIS_URL,
    backend=REDIS_RESULT_BACKEND,
    include=["backend.tasks.document_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
   
    timezone="UTC",
    enable_utc=True,
  
    task_routes={
        "backend.tasks.document_tasks.run_document_analysis": {"queue": "documents"},
    },
 
    task_acks_late=True,                  
    worker_prefetch_multiplier=1,         
    task_track_started=True,
    result_expires=3600,                 
)
