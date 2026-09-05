from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Authentication Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str
    require_role: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserRoleUpdate(BaseModel):
    role: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class SystemSettingsSchema(BaseModel):
    high_risk_threshold: int = Field(default=80, ge=1, le=100)
    medium_risk_threshold: int = Field(default=40, ge=1, le=100)
    false_positive_cost: float = Field(default=1200.0, ge=0.0)
    false_negative_cost: float = Field(default=12000.0, ge=0.0)

class SystemSettingsResponse(SystemSettingsSchema):
    id: int
    updated_at: datetime
    updated_by: str

    class Config:
        from_attributes = True

# --- Customer Schemas ---
class CustomerSchema(BaseModel):
    id: str
    name: str
    email: str
    account_age_days: int
    previous_transaction_count: int
    previous_chargeback_count: int
    failed_payment_count: int
    average_transaction_amount: float
    successful_payments: int
    average_order_value: float
    
    class Config:
        from_attributes = True

# --- Transaction Schemas ---
class TransactionListItem(BaseModel):
    id: str
    customer_name: str
    amount: float
    currency: str
    payment_method: str
    customer_country: str
    shipping_country: str
    risk_score: int
    risk_level: str
    status: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

class RiskFactor(BaseModel):
    feature: str
    contribution: float
    severity: str # LOW, MEDIUM, HIGH
    description: str

class TransactionDetail(BaseModel):
    id: str
    customer_id: str
    amount: float
    currency: str
    payment_method: str
    device_id: str
    device_account_count: int
    IP_account_count: int
    billing_shipping_match: bool
    IP_shipping_match: bool
    customer_country: str
    shipping_country: str
    device_age_days: int
    transaction_frequency: float
    average_transaction_amount: float
    amount_deviation: float
    is_new_device: bool
    is_new_location: bool
    velocity_1h: int
    velocity_24h: int
    previous_fraud_flag: bool
    timestamp: datetime
    risk_score: int
    risk_level: str
    status: str
    
    # Nested Info
    customer: CustomerSchema
    fraud_probability: float
    model_version: str
    risk_factors: List[RiskFactor]
    audit_logs: List['AuditLogSchema'] = []
    decisions: List['DecisionSchema'] = []
    
    class Config:
        from_attributes = True

class DecisionSchema(BaseModel):
    id: int
    transaction_id: str
    chargeback_id: Optional[str] = None
    action: str
    notes: Optional[str] = None
    actor: str
    ai_recommendation: Optional[str] = None
    human_decision: Optional[str] = None
    override: bool = False
    override_reason: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class TransactionDecisionRequest(BaseModel):
    action: str # MARK_SAFE, ESCALATE, DECLINE, VERIFY
    notes: Optional[str] = None
    ai_recommendation: Optional[str] = None
    human_decision: Optional[str] = None
    override: Optional[bool] = False
    override_reason: Optional[str] = None

# --- Chargeback Schemas ---
class ChargebackListItem(BaseModel):
    id: str
    transaction_id: str
    amount: float
    reason: str
    deadline: datetime
    status: str
    evidence_strength: int
    suggested_action: str
    risk_score: int
    
    class Config:
        from_attributes = True

class EvidenceItemSchema(BaseModel):
    evidence_type: str
    status: str # AVAILABLE, UNAVAILABLE
    value: str # Description / JSON string representation
    confidence: int
    source_record: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChargebackDetail(BaseModel):
    id: str
    transaction_id: str
    amount: float
    reason: str
    deadline: datetime
    status: str
    evidence_strength: int
    suggested_action: str
    created_at: datetime
    evidence_summary: Optional[str] = None
    evidence_items: List[EvidenceItemSchema] = []
    
    class Config:
        from_attributes = True

class ChargebackDecisionRequest(BaseModel):
    action: str # RESPOND_TO_CHARGEBACK, ACCEPT_LOSS
    notes: Optional[str] = None

# --- Audit Log Schemas ---
class AuditLogSchema(BaseModel):
    id: int
    timestamp: datetime
    actor: str
    action: str
    entity: str
    entity_id: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    reason: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- Dashboard & Model Metrics Schemas ---
class KPICards(BaseModel):
    transactions_analyzed: int
    high_risk_transactions: int
    chargebacks_detected: int
    estimated_loss_prevented: float
    average_risk_score: float
    model_precision: float
    model_recall: float
    model_accuracy: float = 0.9497

class DashboardStats(BaseModel):
    kpis: KPICards
    risk_distribution: List[Dict[str, Any]]
    chargeback_trends: List[Dict[str, Any]]
    recent_events: List[TransactionListItem]

class ThresholdMetricsRequest(BaseModel):
    threshold: float
    false_positive_cost: float = 500.0
    false_negative_cost: float = 2500.0

class ThresholdMetricsResponse(BaseModel):
    threshold: float
    precision: float
    recall: float
    false_positives: int
    false_negatives: int
    true_positives: int
    true_negatives: int
    total_fp_cost: float
    total_fn_cost: float
    total_decision_cost: float

# --- Copilot Assistant Schemas ---
class CopilotQueryRequest(BaseModel):
    query: str
    transaction_context_id: Optional[str] = None

class CopilotQueryResponse(BaseModel):
    response: str
    context_data: Optional[Dict[str, Any]] = None

# --- Risk Prediction Schemas ---
class TransactionPredictRequest(BaseModel):
    amount: float = Field(..., example=2500.0)
    payment_method: str = Field(..., example="credit_card")
    customer_country: str = Field(..., example="IN")
    shipping_country: str = Field(..., example="IN")
    account_age_days: int = Field(..., example=30)
    previous_transaction_count: int = Field(..., example=5)
    previous_chargeback_count: int = Field(..., example=0)
    failed_payment_count: int = Field(..., example=0)
    device_account_count: int = Field(..., example=1)
    IP_account_count: int = Field(..., example=1)
    billing_shipping_match: int = Field(..., example=1)
    IP_shipping_match: int = Field(..., example=1)
    device_age_days: int = Field(..., example=30)
    transaction_frequency: float = Field(..., example=1.0)
    average_transaction_amount: float = Field(..., example=2000.0)
    amount_deviation: float = Field(..., example=1.25)
    is_new_device: int = Field(..., example=0)
    is_new_location: int = Field(..., example=0)
    velocity_1h: int = Field(..., example=0)
    velocity_24h: int = Field(..., example=1)
    previous_fraud_flag: int = Field(..., example=0)

class PredictRiskFactor(BaseModel):
    feature: str
    contribution: float
    severity: str
    description: str

class TransactionPredictResponse(BaseModel):
    probability: float
    risk_score: int
    risk_level: str
    confidence: int
    recommendation: str
    risk_factors: List[PredictRiskFactor]
    model_version: str
