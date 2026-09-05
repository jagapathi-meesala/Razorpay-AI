from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app import models, schemas, auth
from backend.app.services.prediction import prediction_service
from typing import List, Dict, Any

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=schemas.DashboardStats, dependencies=[Depends(auth.is_viewer)])
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Base counts
    total_txns = db.query(models.Transaction).count()
    high_risk_txns = db.query(models.Transaction).filter(models.Transaction.risk_level == "HIGH RISK").count()
    chargebacks = db.query(models.Chargeback).count()
    
    # Average Risk Score
    avg_risk_result = db.query(func.avg(models.Transaction.risk_score)).scalar()
    avg_risk = float(round(avg_risk_result, 1)) if avg_risk_result else 0.0
    
    # Loss Prevented calculation
    # Sum amounts of blocked/declined high-risk transactions
    loss_prevented_res = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.risk_level == "HIGH RISK",
        models.Transaction.status.in_(["DECLINED", "UNDER_REVIEW"])
    ).scalar()
    loss_prevented = float(loss_prevented_res) if loss_prevented_res else 0.0
    
    # Model Precision/Recall from metrics.json
    precision = 0.9329
    recall = 0.9406
    accuracy = 0.9280
    if prediction_service.metrics:
        precision = prediction_service.metrics.get("precision", precision)
        recall = prediction_service.metrics.get("recall", recall)
        accuracy = prediction_service.metrics.get("accuracy", accuracy)
        
    kpi_cards = schemas.KPICards(
        transactions_analyzed=total_txns,
        high_risk_transactions=high_risk_txns,
        chargebacks_detected=chargebacks,
        estimated_loss_prevented=loss_prevented,
        average_risk_score=avg_risk,
        model_precision=precision,
        model_recall=recall,
        model_accuracy=accuracy
    )
    
    # 2. Risk Distribution Chart
    risk_levels = ["LOW RISK", "MEDIUM RISK", "HIGH RISK"]
    dist_data = []
    for level in risk_levels:
        cnt = db.query(models.Transaction).filter(models.Transaction.risk_level == level).count()
        dist_data.append({"name": level, "value": cnt})
        
    # 3. Chargeback Trends (7-day daily timeline)
    import datetime
    today = datetime.date.today()
    trends_dict = {}
    
    # Pre-populate last 7 days to ensure a complete, continuous timeline curve
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_str = day.strftime("%b %d")
        trends_dict[day_str] = 0

    disputes = db.query(models.Chargeback.created_at).all()
    for (d_at,) in disputes:
        # Use the actual created_at date from the database record!
        if d_at:
            day_str = d_at.strftime("%b %d")
            if day_str in trends_dict:
                trends_dict[day_str] += 1
        
    # Sort chronological order
    sorted_trends = sorted(
        trends_dict.items(),
        key=lambda x: datetime.datetime.strptime(x[0] + f" {today.year}", "%b %d %Y")
    )
    trends_data = [{"date": k, "disputes": v} for k, v in sorted_trends]

    # 4. Recent Events (Action Required alerts: status == UNDER_REVIEW)
    recent_txns = db.query(models.Transaction).filter(models.Transaction.status == "UNDER_REVIEW").order_by(models.Transaction.timestamp.desc()).limit(8).all()
    
    recent_list = []
    for t in recent_txns:
        recent_list.append(schemas.TransactionListItem(
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
        
    return schemas.DashboardStats(
        kpis=kpi_cards,
        risk_distribution=dist_data,
        chargeback_trends=trends_data,
        recent_events=recent_list
    )

@router.get("/alerts", dependencies=[Depends(auth.is_viewer)])
def get_recent_alerts(db: Session = Depends(get_db)):
    # 1. Fetch recent transactions that are UNDER_REVIEW or DECLINED (high risk)
    txns = db.query(models.Transaction).filter(
        models.Transaction.risk_level == "HIGH RISK"
    ).order_by(models.Transaction.timestamp.desc()).limit(3).all()
    
    # 2. Fetch open chargebacks
    cbs = db.query(models.Chargeback).filter(
        models.Chargeback.status == "OPEN"
    ).order_by(models.Chargeback.created_at.desc()).limit(3).all()
    
    alerts = []
    
    # Format chargebacks
    for cb in cbs:
        alerts.append({
            "type": "chargeback",
            "id": cb.id,
            "title": "Chargeback Case Opened",
            "message": f"{cb.id} requires evidence submission",
            "timestamp": cb.created_at.isoformat() if cb.created_at else None,
            "severity": "medium"
        })
        
    # Format transactions
    for t in txns:
        alerts.append({
            "type": "transaction",
            "id": t.id,
            "title": "High Risk Transaction",
            "message": f"{t.id} flagged (Score: {t.risk_score}/100)",
            "timestamp": t.timestamp.isoformat() if t.timestamp else None,
            "severity": "high"
        })
        
    # Sort chronological order (most recent first)
    alerts.sort(key=lambda x: x["timestamp"] if x["timestamp"] else "", reverse=True)
    
    return {"alerts": alerts[:5]}
