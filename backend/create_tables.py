import os
from backend.database import engine, Base
from backend.models import User, Estate, EstateMember

print("Creating database tables...")
try:
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")
except Exception as e:
    print(f"Error creating tables: {e}")
