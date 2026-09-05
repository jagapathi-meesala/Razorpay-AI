import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app import models, schemas, auth
from backend.app.services.evidence import evidence_service
from backend.app.services.audit import log_audit_event
from typing import List

router = APIRouter(prefix="/chargebacks", tags=["Chargebacks"])

@router.get("", response_model=List[schemas.ChargebackListItem], dependencies=[Depends(auth.is_viewer)])
def get_chargebacks(db: Session = Depends(get_db)):
    chargebacks = db.query(models.Chargeback).all()
    
    result = []
    for c in chargebacks:
        result.append(schemas.ChargebackListItem(
            id=c.id,
            transaction_id=c.transaction_id,
            amount=c.amount,
            reason=c.reason,
            deadline=c.deadline,
            status=c.status,
            evidence_strength=c.evidence_strength,
            suggested_action=c.suggested_action,
            risk_score=c.transaction.risk_score
        ))
    return result

@router.get("/{case_id}", response_model=schemas.ChargebackDetail, dependencies=[Depends(auth.is_viewer)])
def get_chargeback_detail(case_id: str, db: Session = Depends(get_db)):
    chargeback = db.query(models.Chargeback).filter(models.Chargeback.id == case_id).first()
    if not chargeback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chargeback dispute {case_id} not found"
        )
        
    # Gather live evidence summary and items (combines existing and dynamically formatted data)
    ev_data = evidence_service.gather_and_assess_evidence(chargeback, db)
    
    evidence_items = []
    # If the database has evidence items, we load them. Otherwise we map from generated items.
    db_items = db.query(models.EvidenceItem).filter(models.EvidenceItem.chargeback_id == case_id).all()
    
    if db_items:
        for item in db_items:
            evidence_items.append(schemas.EvidenceItemSchema(
                evidence_type=item.evidence_type,
                status=item.status,
                value=item.value,
                confidence=item.confidence,
                source_record=item.source_record,
                created_at=item.created_at
            ))
    else:
        # Fallback to dynamically assessed items (and cache/seed them if needed)
        for item in ev_data['evidence_items']:
            evidence_items.append(schemas.EvidenceItemSchema(
                evidence_type=item['evidence_type'],
                status=item['status'],
                value=item['value'],
                confidence=item['confidence'],
                source_record=item['source_record'],
                created_at=chargeback.created_at
            ))
            
    return schemas.ChargebackDetail(
        id=chargeback.id,
        transaction_id=chargeback.transaction_id,
        amount=chargeback.amount,
        reason=chargeback.reason,
        deadline=chargeback.deadline,
        status=chargeback.status,
        evidence_strength=chargeback.evidence_strength,
        suggested_action=chargeback.suggested_action,
        created_at=chargeback.created_at,
        evidence_summary=ev_data['evidence_summary'],
        evidence_items=evidence_items
    )

@router.post("/{case_id}/evidence", response_model=schemas.ChargebackDetail, dependencies=[Depends(auth.is_analyst)])
def generate_chargeback_evidence(
    case_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    chargeback = db.query(models.Chargeback).filter(models.Chargeback.id == case_id).first()
    if not chargeback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chargeback dispute {case_id} not found"
        )
        
    # Evaluate evidence metrics
    ev_data = evidence_service.gather_and_assess_evidence(chargeback, db)
    
    # Save/Update in db
    chargeback.evidence_strength = ev_data['evidence_strength']
    chargeback.suggested_action = ev_data['suggested_action']
    chargeback.status = "UNDER_REVIEW"
    
    # Clear existing evidence items in db to prevent duplication
    db.query(models.EvidenceItem).filter(models.EvidenceItem.chargeback_id == case_id).delete()
    
    # Save compiled items
    for item in ev_data['evidence_items']:
        db_item = models.EvidenceItem(
            chargeback_id=case_id,
            evidence_type=item['evidence_type'],
            status=item['status'],
            value=item['value'],
            confidence=item['confidence'],
            source_record=item['source_record']
        )
        db.add(db_item)
        
    # Audit trail
    log_audit_event(
        db=db,
        actor=current_user.username,
        action="GENERATE_EVIDENCE",
        entity="chargeback",
        entity_id=case_id,
        new_state={
            "evidence_strength": ev_data['evidence_strength'],
            "suggested_action": ev_data['suggested_action'],
            "items_count": len(ev_data['evidence_items'])
        },
        reason="Triggered automated AI evidence responder generation"
    )
    
    db.commit()
    db.refresh(chargeback)
    
    return get_chargeback_detail(case_id, db)

@router.post("/{case_id}/decision", response_model=schemas.ChargebackDetail, dependencies=[Depends(auth.is_analyst)])
def submit_chargeback_decision(
    case_id: str,
    decision: schemas.ChargebackDecisionRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    chargeback = db.query(models.Chargeback).filter(models.Chargeback.id == case_id).first()
    if not chargeback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chargeback dispute {case_id} not found"
        )
        
    prev_status = chargeback.status
    
    if decision.action == "RESPOND_TO_CHARGEBACK":
        chargeback.status = "RESPONDED"
        log_action = "RESPOND"
    elif decision.action == "ACCEPT_LOSS":
        chargeback.status = "LOST"
        log_action = "ACCEPT_LOSS"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be RESPOND_TO_CHARGEBACK or ACCEPT_LOSS"
        )
        
    # Create reviewer decision log
    db_decision = models.Decision(
        transaction_id=chargeback.transaction_id,
        chargeback_id=chargeback.id,
        action=decision.action,
        notes=decision.notes,
        actor=current_user.username
    )
    db.add(db_decision)
    
    # Audit log
    log_audit_event(
        db=db,
        actor=current_user.username,
        action=f"DISPUTE_{log_action}",
        entity="chargeback",
        entity_id=chargeback.id,
        previous_state={"status": prev_status},
        new_state={"status": chargeback.status},
        reason=decision.notes
    )
    
    db.commit()
    db.refresh(chargeback)
    
    return get_chargeback_detail(case_id, db)
