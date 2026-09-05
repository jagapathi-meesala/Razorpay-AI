from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app import models, schemas, auth
from backend.app.services.audit import log_audit_event

router = APIRouter(prefix="/settings", tags=["System Settings"])

def _get_or_create_settings(db: Session) -> models.SystemSettings:
    settings_obj = db.query(models.SystemSettings).first()
    if not settings_obj:
        settings_obj = models.SystemSettings(
            high_risk_threshold=80,
            medium_risk_threshold=40,
            false_positive_cost=1200.0,
            false_negative_cost=12000.0,
            updated_by="SYSTEM"
        )
        db.add(settings_obj)
        db.commit()
        db.refresh(settings_obj)
    return settings_obj

@router.get("", response_model=schemas.SystemSettingsResponse, dependencies=[Depends(auth.is_viewer)])
def get_system_settings(db: Session = Depends(get_db)):
    return _get_or_create_settings(db)

@router.post("", response_model=schemas.SystemSettingsResponse, dependencies=[Depends(auth.is_admin)])
@router.put("", response_model=schemas.SystemSettingsResponse, dependencies=[Depends(auth.is_admin)])
def update_system_settings(
    settings_data: schemas.SystemSettingsSchema,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if settings_data.medium_risk_threshold >= settings_data.high_risk_threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Medium risk threshold must be strictly lower than high risk threshold."
        )

    settings_obj = _get_or_create_settings(db)
    
    prev_state = {
        "high_risk_threshold": settings_obj.high_risk_threshold,
        "medium_risk_threshold": settings_obj.medium_risk_threshold,
        "false_positive_cost": settings_obj.false_positive_cost,
        "false_negative_cost": settings_obj.false_negative_cost,
    }

    settings_obj.high_risk_threshold = settings_data.high_risk_threshold
    settings_obj.medium_risk_threshold = settings_data.medium_risk_threshold
    settings_obj.false_positive_cost = settings_data.false_positive_cost
    settings_obj.false_negative_cost = settings_data.false_negative_cost
    settings_obj.updated_by = current_user.username

    new_state = {
        "high_risk_threshold": settings_obj.high_risk_threshold,
        "medium_risk_threshold": settings_obj.medium_risk_threshold,
        "false_positive_cost": settings_obj.false_positive_cost,
        "false_negative_cost": settings_obj.false_negative_cost,
    }

    db.commit()
    db.refresh(settings_obj)

    log_audit_event(
        db=db,
        actor=current_user.username,
        action="SYSTEM_SETTINGS_UPDATE",
        entity="system_settings",
        entity_id=str(settings_obj.id),
        previous_state=str(prev_state),
        new_state=str(new_state),
        reason=f"System risk thresholds and cost configuration updated by Admin {current_user.username}"
    )

    return settings_obj
