import json
from sqlalchemy.orm import Session
from backend.app import models

def log_audit_event(
    db: Session,
    actor: str,
    action: str,
    entity: str,
    entity_id: str,
    previous_state: dict = None,
    new_state: dict = None,
    reason: str = None
):
    prev_str = json.dumps(previous_state) if previous_state else None
    new_str = json.dumps(new_state) if new_state else None
    
    db_log = models.AuditLog(
        actor=actor,
        action=action,
        entity=entity,
        entity_id=entity_id,
        previous_state=prev_str,
        new_state=new_str,
        reason=reason
    )
    
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
