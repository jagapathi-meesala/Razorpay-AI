import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from backend.app.database import get_db
from backend.app import models, schemas, auth
from backend.app.services.explainability import explainability_service
from backend.app.services.prediction import prediction_service
from backend.app.services.audit import log_audit_event
from typing import List, Optional

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=List[schemas.TransactionListItem], dependencies=[Depends(auth.is_viewer)])
def get_transactions(
    db: Session = Depends(get_db),
    offset: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    payment_method: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    sort_by: Optional[str] = "timestamp",
    sort_order: Optional[str] = "desc"
):
    query = db.query(models.Transaction)
    
    # Apply search filter
    if search:
        search_pattern = f"%{search}%"
        # Search by ID, customer name, or customer ID
        query = query.join(models.Customer).filter(
            or_(
                models.Transaction.id.like(search_pattern),
                models.Customer.name.like(search_pattern),
                models.Transaction.customer_id.like(search_pattern)
            )
        )
        
    # Apply categorical filters
    if risk_level:
        query = query.filter(models.Transaction.risk_level == risk_level)
    if status:
        query = query.filter(models.Transaction.status == status)
    if payment_method:
        query = query.filter(models.Transaction.payment_method == payment_method)
        
    # Apply numeric filters
    if min_amount is not None:
        query = query.filter(models.Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(models.Transaction.amount <= max_amount)
        
    # Determine sorting column and order
    actual_sort_by = sort_by
    actual_sort_order = sort_order
    
    # If the user has supplied min_amount or max_amount, default to sorting by amount ascending (min to max)
    # unless they explicitly specified another sort column in the request
    if (min_amount is not None or max_amount is not None) and sort_by == "timestamp" and sort_order == "desc":
        actual_sort_by = "amount"
        actual_sort_order = "asc"

    order_column = models.Transaction.timestamp
    if actual_sort_by == "amount":
        order_column = models.Transaction.amount
    elif actual_sort_by == "risk_score":
        order_column = models.Transaction.risk_score
    elif actual_sort_by == "id":
        order_column = models.Transaction.id
        
    # Apply ordering direction
    if actual_sort_order == "asc":
        query = query.order_by(asc(order_column))
    else:
        query = query.order_by(desc(order_column))
        
    # Execute query
    transactions = query.offset(offset).limit(limit).all()
    
    result = []
    for t in transactions:
        result.append(schemas.TransactionListItem(
            id=t.id,
            customer_name=t.customer.name,
            amount=t.amount,
            currency=t.currency,
            payment_method=t.payment_method,
            customer_country=t.customer_country,
            shipping_country=t.shipping_country,
            risk_score=t.risk_score,
            risk_level=t.risk_level,
            status=t.status,
            timestamp=t.timestamp
        ))
    return result

def _make_transaction_detail_response(transaction: models.Transaction, pred: dict, db: Session) -> schemas.TransactionDetail:
    customer = transaction.customer
    cust_schema = schemas.CustomerSchema(
        id=customer.id,
        name=customer.name,
        email=customer.email,
        account_age_days=customer.account_age_days,
        previous_transaction_count=customer.previous_transaction_count,
        previous_chargeback_count=customer.previous_chargeback_count,
        failed_payment_count=customer.failed_payment_count,
        average_transaction_amount=customer.average_transaction_amount,
        successful_payments=customer.successful_payments,
        average_order_value=customer.average_order_value
    )
    
    risk_factors = []
    for f in pred['risk_factors']:
        risk_factors.append(schemas.RiskFactor(
            feature=f['feature'],
            contribution=f['contribution'],
            severity=f['severity'],
            description=f['description']
        ))
        
    # Query immutable audit logs recorded for this transaction entity sorted chronologically
    audit_logs_db = db.query(models.AuditLog).filter(
        models.AuditLog.entity == "transaction",
        models.AuditLog.entity_id == transaction.id
    ).order_by(models.AuditLog.timestamp.asc()).all()
    
    audit_logs = []
    last_action = None
    last_reason = None
    for log in audit_logs_db:
        # Filter out consecutive duplicate clicks to keep the feed clean
        if log.action == last_action and log.reason == last_reason:
            continue
        last_action = log.action
        last_reason = log.reason
        
        audit_logs.append(schemas.AuditLogSchema(
            id=log.id,
            timestamp=log.timestamp,
            actor=log.actor,
            action=log.action,
            entity=log.entity,
            entity_id=log.entity_id,
            previous_state=str(log.previous_state) if log.previous_state is not None else None,
            new_state=str(log.new_state) if log.new_state is not None else None,
            reason=log.reason
        ))
        
    # Fetch analyst decisions
    decisions_db = db.query(models.Decision).filter(models.Decision.transaction_id == transaction.id).all()
    decisions = []
    for d in decisions_db:
        decisions.append(schemas.DecisionSchema(
            id=d.id,
            transaction_id=d.transaction_id,
            chargeback_id=d.chargeback_id,
            action=d.action,
            notes=d.notes,
            actor=d.actor,
            ai_recommendation=d.ai_recommendation,
            human_decision=d.human_decision,
            override=d.override,
            override_reason=d.override_reason,
            created_at=d.created_at
        ))
        
    return schemas.TransactionDetail(
        id=transaction.id,
        customer_id=transaction.customer_id,
        amount=transaction.amount,
        currency=transaction.currency,
        payment_method=transaction.payment_method,
        device_id=transaction.device_id,
        device_account_count=transaction.device_account_count,
        IP_account_count=transaction.IP_account_count,
        billing_shipping_match=transaction.billing_shipping_match,
        IP_shipping_match=transaction.IP_shipping_match,
        customer_country=transaction.customer_country,
        shipping_country=transaction.shipping_country,
        device_age_days=transaction.device_age_days,
        transaction_frequency=transaction.transaction_frequency,
        average_transaction_amount=transaction.average_transaction_amount,
        amount_deviation=transaction.amount_deviation,
        is_new_device=transaction.is_new_device,
        is_new_location=transaction.is_new_location,
        velocity_1h=transaction.velocity_1h,
        velocity_24h=transaction.velocity_24h,
        previous_fraud_flag=transaction.previous_fraud_flag,
        timestamp=transaction.timestamp,
        risk_score=transaction.risk_score,
        risk_level=transaction.risk_level,
        status=transaction.status,
        customer=cust_schema,
        fraud_probability=pred['probability'],
        model_version=pred['model_version'],
        risk_factors=risk_factors,
        audit_logs=audit_logs,
        decisions=decisions
    )

@router.get("/{txn_id}", response_model=schemas.TransactionDetail, dependencies=[Depends(auth.is_viewer)])
def get_transaction_detail(txn_id: str, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == txn_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {txn_id} not found"
        )
        
    customer = transaction.customer
    
    # Predict to get live factors / verify against saved prediction
    pred_data = {
        'amount': transaction.amount,
        'payment_method': transaction.payment_method,
        'customer_country': transaction.customer_country,
        'shipping_country': transaction.shipping_country,
        'account_age_days': customer.account_age_days,
        'previous_transaction_count': customer.previous_transaction_count,
        'previous_chargeback_count': customer.previous_chargeback_count,
        'failed_payment_count': transaction.failed_payment_count,
        'device_account_count': transaction.device_account_count,
        'IP_account_count': transaction.IP_account_count,
        'billing_shipping_match': int(transaction.billing_shipping_match),
        'IP_shipping_match': int(transaction.IP_shipping_match),
        'device_age_days': transaction.device_age_days,
        'transaction_frequency': transaction.transaction_frequency,
        'average_transaction_amount': transaction.average_transaction_amount,
        'amount_deviation': transaction.amount_deviation,
        'is_new_device': int(transaction.is_new_device),
        'is_new_location': int(transaction.is_new_location),
        'velocity_1h': transaction.velocity_1h,
        'velocity_24h': transaction.velocity_24h,
        'previous_fraud_flag': int(transaction.previous_fraud_flag)
    }
    
    # Run prediction & explainability helper
    pred = prediction_service.predict_risk(pred_data)
    return _make_transaction_detail_response(transaction, pred, db)

@router.post("/{txn_id}/decision", response_model=schemas.TransactionDetail, dependencies=[Depends(auth.is_analyst)])
def submit_transaction_decision(
    txn_id: str,
    decision: schemas.TransactionDecisionRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == txn_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {txn_id} not found"
        )
        
    if decision.override and (not decision.override_reason or not decision.override_reason.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An override reason is required when overriding the AI recommendation."
        )

    # Map request action to database changes
    # APPROVED or DECLINED
    prev_status = transaction.status
    
    if decision.action == "MARK_SAFE":
        transaction.status = "APPROVED"
        log_action = "MARK_SAFE"
    elif decision.action == "ESCALATE":
        transaction.status = "UNDER_REVIEW"
        log_action = "ESCALATE"
    elif decision.action == "DECLINE":
        transaction.status = "DECLINED"
        log_action = "DECLINE"
    elif decision.action == "VERIFY":
        transaction.status = "UNDER_REVIEW"
        log_action = "VERIFY"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be MARK_SAFE, ESCALATE, DECLINE, or VERIFY"
        )
        
    # Record analyst decision
    db_decision = models.Decision(
        transaction_id=transaction.id,
        action=log_action,
        notes=decision.notes,
        actor=current_user.username,
        ai_recommendation=decision.ai_recommendation,
        human_decision=decision.human_decision,
        override=decision.override or False,
        override_reason=decision.override_reason
    )
    db.add(db_decision)
    
    # Audit log
    audit_notes = decision.notes
    if decision.override:
        audit_notes = f"[OVERRIDE: {decision.override_reason}] " + (decision.notes or "")
        
    log_audit_event(
        db=db,
        actor=current_user.username,
        action=f"TRANSACTION_{log_action}",
        entity="transaction",
        entity_id=transaction.id,
        previous_state={"status": prev_status},
        new_state={"status": transaction.status},
        reason=audit_notes
    )
    
    db.commit()
    db.refresh(transaction)
    
    # Return updated detail
    return get_transaction_detail(txn_id, db)

@router.post("/predict", response_model=schemas.TransactionPredictResponse, dependencies=[Depends(auth.is_viewer)])
def run_manual_prediction(payload: schemas.TransactionPredictRequest):
    try:
        # Map payload properties to model predictor
        pred_dict = payload.model_dump()
        pred = prediction_service.predict_risk(pred_dict)
        
        # Classify recommendation based on risk levels
        # LOW RISK -> ALLOW
        # MEDIUM RISK -> VERIFY
        # HIGH RISK -> MANUAL REVIEW
        lvl = pred['risk_level']
        if lvl == "LOW RISK":
            rec = "ALLOW"
        elif lvl == "MEDIUM RISK":
            rec = "VERIFY"
        else:
            rec = "MANUAL REVIEW"
            
        factors = []
        for f in pred['risk_factors']:
            factors.append(schemas.PredictRiskFactor(
                feature=f['feature'],
                contribution=f['contribution'],
                severity=f['severity'],
                description=f['description']
            ))
            
        return schemas.TransactionPredictResponse(
            probability=pred['probability'],
            risk_score=pred['risk_score'],
            risk_level=pred['risk_level'],
            confidence=pred['model_confidence'],
            recommendation=rec,
            risk_factors=factors,
            model_version=pred['model_version']
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )
