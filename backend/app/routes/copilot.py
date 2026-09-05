from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app import schemas, auth
from backend.app.services.copilot import copilot_service

router = APIRouter(prefix="/copilot", tags=["RiskShield Copilot"])

@router.post("/query", response_model=schemas.CopilotQueryResponse, dependencies=[Depends(auth.is_viewer)])
def query_copilot(
    request: schemas.CopilotQueryRequest,
    db: Session = Depends(get_db)
):
    result = copilot_service.answer_query(
        query=request.query,
        db=db,
        transaction_context_id=request.transaction_context_id
    )
    return schemas.CopilotQueryResponse(
        response=result["response"],
        context_data=result["context_data"]
    )
