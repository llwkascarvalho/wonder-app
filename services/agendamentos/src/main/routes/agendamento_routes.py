from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.main.dependencies.db import get_db

router = APIRouter(tags=["Agendamentos"])

# Os endpoints ainda serão implementados.