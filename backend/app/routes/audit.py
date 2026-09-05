from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.database import get_db
from backend.app import models, schemas, auth
from typing import List

router = APIRouter(prefix="/audit", tags=["Audit Log"])

@router.get("", response_model=List[schemas.AuditLogSchema], dependencies=[Depends(auth.is_viewer)])
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(models.AuditLog).order_by(desc(models.AuditLog.timestamp)).all()
    return logs
