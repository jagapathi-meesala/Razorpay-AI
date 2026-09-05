from fastapi import APIRouter, Depends, HTTPException, status
from backend.app import schemas, auth, models
from backend.app.services.prediction import prediction_service
from backend.app.database import get_db
from sqlalchemy.orm import Session
import numpy as np

router = APIRouter(prefix="/model", tags=["Model Monitoring"])

@router.get("/metrics", dependencies=[Depends(auth.is_viewer)])
def get_model_metrics(db: Session = Depends(get_db)):
    # Query actual count of transactions in the sandbox database
    sandbox_count = db.query(models.Transaction).count()
    
    if not prediction_service.metrics:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model metrics are not available. Please run the model training pipeline to generate metrics."
        )
    
    # Return metrics without large raw lists of test predictions
    m = prediction_service.metrics.copy()
    if "test_predictions" in m:
        del m["test_predictions"]
    if "test_labels" in m:
        del m["test_labels"]
        
    m["sandbox_txns_count"] = sandbox_count
    return m

@router.post("/threshold", response_model=schemas.ThresholdMetricsResponse, dependencies=[Depends(auth.is_viewer)])
def simulate_threshold(request: schemas.ThresholdMetricsRequest):
    if not prediction_service.metrics or "test_predictions" not in prediction_service.metrics:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Simulation data is not available. Please ensure metrics.json contains test predictions and labels."
        )
        
    probs = np.array(prediction_service.metrics["test_predictions"])
    labels = np.array(prediction_service.metrics["test_labels"])
    
    # Calculate predictions based on threshold
    preds = (probs >= request.threshold).astype(int)
    
    # Compute confusion elements
    tp = int(np.sum((preds == 1) & (labels == 1)))
    tn = int(np.sum((preds == 0) & (labels == 0)))
    fp = int(np.sum((preds == 1) & (labels == 0)))
    fn = int(np.sum((preds == 0) & (labels == 1)))
    
    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 1.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 1.0
    
    # Cost modeling
    total_fp_cost = float(fp * request.false_positive_cost)
    total_fn_cost = float(fn * request.false_negative_cost)
    total_decision_cost = total_fp_cost + total_fn_cost
    
    return schemas.ThresholdMetricsResponse(
        threshold=request.threshold,
        precision=precision,
        recall=recall,
        false_positives=fp,
        false_negatives=fn,
        true_positives=tp,
        true_negatives=tn,
        total_fp_cost=total_fp_cost,
        total_fn_cost=total_fn_cost,
        total_decision_cost=total_decision_cost
    )
