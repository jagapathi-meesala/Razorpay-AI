from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app import models, auth
from typing import List, Dict, Any

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("", dependencies=[Depends(auth.is_viewer)])
def get_analytics(db: Session = Depends(get_db)):
    # 1. Total and Exposure metrics
    total_amount_res = db.query(func.sum(models.Transaction.amount)).scalar()
    total_amount = float(total_amount_res) if total_amount_res else 0.0
    
    exposure_res = db.query(func.sum(models.Chargeback.amount)).filter(
        models.Chargeback.status.in_(["OPEN", "UNDER_REVIEW"])
    ).scalar()
    exposure = float(exposure_res) if exposure_res else 0.0
    
    prevented_res = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.risk_level == "HIGH RISK",
        models.Transaction.status.in_(["DECLINED", "UNDER_REVIEW"])
    ).scalar()
    prevented = float(prevented_res) if prevented_res else 0.0
    
    # 2. Risk by Payment Method
    pm_stats = db.query(
        models.Transaction.payment_method,
        func.count(models.Transaction.id).label("count"),
        func.sum(models.Transaction.amount).label("total_amount"),
        func.avg(models.Transaction.risk_score).label("avg_risk")
    ).group_by(models.Transaction.payment_method).all()
    
    pm_data = []
    for pm, cnt, amt, avg_r in pm_stats:
        pm_data.append({
            "payment_method": pm.replace('_', ' ').title(),
            "count": cnt,
            "amount": float(amt) if amt else 0.0,
            "avg_risk": float(round(avg_r, 1)) if avg_r else 0.0
        })
        
    # 3. Risk by Country
    country_stats = db.query(
        models.Transaction.customer_country,
        func.count(models.Transaction.id).label("count"),
        func.avg(models.Transaction.risk_score).label("avg_risk"),
        func.sum(models.Transaction.amount).label("total_amount")
    ).group_by(models.Transaction.customer_country).order_by(func.count(models.Transaction.id).desc()).limit(10).all()
    
    country_data = []
    for cc, cnt, avg_r, amt in country_stats:
        country_data.append({
            "country": cc,
            "count": cnt,
            "avg_risk": float(round(avg_r, 1)) if avg_r else 0.0,
            "amount": float(amt) if amt else 0.0
        })
        
    # 4. Daily Volume and Risk Trends (aggregate for chart visualization)
    import datetime
    today = datetime.date.today()
    daily_stats = {}
    
    # Pre-populate last 10 days to ensure a complete, continuous timeline curve
    for i in range(9, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_str = day.strftime("%b %d")
        daily_stats[day_str] = {"volume": 0.0, "count": 0, "sum_risk": 0.0}

    txns = db.query(models.Transaction.timestamp, models.Transaction.amount, models.Transaction.risk_score).all()
    for t_at, amt, score in txns:
        # Use the actual timestamp from the database record!
        if t_at:
            day_str = t_at.strftime("%b %d")
            # If the transaction date falls within our 10-day range, aggregate it
            if day_str in daily_stats:
                daily_stats[day_str]["volume"] += amt
                daily_stats[day_str]["count"] += 1
                daily_stats[day_str]["sum_risk"] += score
        
    # Sort chronological order
    sorted_days = sorted(
        daily_stats.items(),
        key=lambda x: datetime.datetime.strptime(x[0] + f" {today.year}", "%b %d %Y")
    )
    # Calculate global overall average risk score as fallback for zero-activity days
    overall_avg_risk = db.query(func.avg(models.Transaction.risk_score)).scalar()
    overall_avg = float(round(overall_avg_risk, 1)) if overall_avg_risk else 45.0

    trend_data = []
    last_known_risk = overall_avg
    for day, metrics in sorted_days:
        if metrics["count"] > 0:
            avg_risk = float(round(metrics["sum_risk"] / metrics["count"], 1))
            last_known_risk = avg_risk
        else:
            avg_risk = last_known_risk

        trend_data.append({
            "date": day,
            "volume": float(round(metrics["volume"], 2)),
            "avg_risk": avg_risk
        })
        
    return {
        "total_volume": total_amount,
        "loss_exposure": exposure,
        "prevented_loss": prevented,
        "payment_method_distribution": pm_data,
        "country_distribution": country_data,
        "volume_trends": trend_data
    }
