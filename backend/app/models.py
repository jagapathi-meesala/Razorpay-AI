import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="ANALYST", nullable=False) # ADMIN, ANALYST, VIEWER
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SystemSettings(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    high_risk_threshold = Column(Integer, default=80, nullable=False)
    medium_risk_threshold = Column(Integer, default=40, nullable=False)
    false_positive_cost = Column(Float, default=1200.0, nullable=False)
    false_negative_cost = Column(Float, default=12000.0, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_by = Column(String, default="SYSTEM", nullable=False)

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(String, primary_key=True, index=True) # CUSTOMER-10001
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    account_age_days = Column(Integer, default=0)
    previous_transaction_count = Column(Integer, default=0)
    previous_chargeback_count = Column(Integer, default=0)
    failed_payment_count = Column(Integer, default=0)
    average_transaction_amount = Column(Float, default=0.0)
    successful_payments = Column(Integer, default=0)
    average_order_value = Column(Float, default=0.0)
    
    transactions = relationship("Transaction", back_populates="customer")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, index=True) # TXN-10001
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    payment_method = Column(String, nullable=False)
    device_id = Column(String, nullable=False)
    device_account_count = Column(Integer, default=1)
    IP_account_count = Column(Integer, default=1)
    billing_shipping_match = Column(Boolean, default=True)
    IP_shipping_match = Column(Boolean, default=True)
    customer_country = Column(String, nullable=False)
    shipping_country = Column(String, nullable=False)
    device_age_days = Column(Integer, default=0)
    transaction_frequency = Column(Float, default=0.0)
    average_transaction_amount = Column(Float, default=0.0)
    amount_deviation = Column(Float, default=1.0)
    is_new_device = Column(Boolean, default=False)
    is_new_location = Column(Boolean, default=False)
    velocity_1h = Column(Integer, default=0)
    velocity_24h = Column(Integer, default=0)
    failed_payment_count = Column(Integer, default=0)
    previous_fraud_flag = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    # ML Outputs
    risk_score = Column(Integer, default=0) # 0-100
    risk_level = Column(String, default="LOW RISK") # LOW, MEDIUM, HIGH
    status = Column(String, default="PENDING") # APPROVED, DECLINED, PENDING, UNDER_REVIEW
    
    customer = relationship("Customer", back_populates="transactions")
    prediction = relationship("RiskPrediction", back_populates="transaction", uselist=False)
    chargeback = relationship("Chargeback", back_populates="transaction", uselist=False)
    decisions = relationship("Decision", back_populates="transaction")

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), unique=True, nullable=False)
    fraud_probability = Column(Float, nullable=False)
    model_version = Column(String, nullable=False)
    feature_contributions = Column(Text, nullable=False) # JSON-encoded list of contributors
    prediction_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    transaction = relationship("Transaction", back_populates="prediction")

class Chargeback(Base):
    __tablename__ = "chargebacks"
    
    id = Column(String, primary_key=True, index=True) # CASE-10001
    transaction_id = Column(String, ForeignKey("transactions.id"), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    reason = Column(String, nullable=False)
    deadline = Column(DateTime, nullable=False)
    status = Column(String, default="OPEN") # OPEN, UNDER_REVIEW, RESPONDED, WON, LOST
    evidence_strength = Column(Integer, default=0) # 0-100
    suggested_action = Column(String, nullable=False) # ACCEPT LOSS, INVESTIGATE, RESPOND TO CHARGEBACK)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    transaction = relationship("Transaction", back_populates="chargeback")
    evidence_items = relationship("EvidenceItem", back_populates="chargeback")
    decisions = relationship("Decision", back_populates="chargeback")

class EvidenceItem(Base):
    __tablename__ = "evidence_items"
    
    id = Column(Integer, primary_key=True, index=True)
    chargeback_id = Column(String, ForeignKey("chargebacks.id"), nullable=False)
    evidence_type = Column(String, nullable=False)
    status = Column(String, default="AVAILABLE") # AVAILABLE, UNAVAILABLE
    value = Column(Text, nullable=False) # JSON or descriptive string
    confidence = Column(Integer, default=50) # 0-100
    source_record = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    chargeback = relationship("Chargeback", back_populates="evidence_items")

class Decision(Base):
    __tablename__ = "decisions"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=False)
    chargeback_id = Column(String, ForeignKey("chargebacks.id"), nullable=True)
    action = Column(String, nullable=False) # MARK_SAFE, ESCALATE, ACCEPT_LOSS, RESPOND_TO_CHARGEBACK
    notes = Column(Text, nullable=True)
    actor = Column(String, nullable=False) # Username
    
    # Human-in-the-loop decision engine additions
    ai_recommendation = Column(String, nullable=True)
    human_decision = Column(String, nullable=True)
    override = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    transaction = relationship("Transaction", back_populates="decisions")
    chargeback = relationship("Chargeback", back_populates="decisions")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    entity = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    previous_state = Column(Text, nullable=True) # JSON encoded
    new_state = Column(Text, nullable=True) # JSON encoded
    reason = Column(Text, nullable=True)

class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, nullable=False)
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1 = Column(Float, nullable=False)
    roc_auc = Column(Float, nullable=False)
    pr_auc = Column(Float, nullable=False)
    train_date = Column(DateTime, default=datetime.datetime.utcnow)
    active = Column(Boolean, default=False)
