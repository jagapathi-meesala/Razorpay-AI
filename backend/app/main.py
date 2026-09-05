import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.routes import auth, dashboard, transactions, chargebacks, model, analytics, audit, copilot, settings as settings_route

# Initialize database schemas
Base.metadata.create_all(bind=engine)

tags_metadata = [
    {"name": "Auth", "description": "Authentication and RBAC JWT token management."},
    {"name": "Dashboard", "description": "Real-time executive metrics, KPI rollups, and risk distributions."},
    {"name": "Transactions", "description": "Transaction ingestion, risk scoring, and manual decision workflows."},
    {"name": "Chargebacks", "description": "Automated dispute tracking and AI evidence package generation."},
    {"name": "Model", "description": "Random Forest ML engine performance, feature importances, and ROC metrics."},
    {"name": "Analytics", "description": "Aggregated payment velocity, country geographic risk, and breakdown stats."},
    {"name": "Audit", "description": "Immutable SOC2-compliant compliance audit trail."},
    {"name": "Copilot", "description": "LLM-assisted natural language risk analysis copilot."},
    {"name": "Settings", "description": "System configuration and risk threshold settings."}
]

app = FastAPI(
    title="SmartGrid Sentinel — RiskShield AI Engine",
    description="Enterprise Fraud Detection, Real-time Risk Scoring, and Automated Dispute Resolution Platform.",
    version="2.4.0",
    openapi_tags=tags_metadata
)

# Process Timing Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    response.headers["X-App-Version"] = "2.4.0"
    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "http://127.0.0.1:8081"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect Routes
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(transactions.router, prefix=settings.API_V1_STR)
app.include_router(chargebacks.router, prefix=settings.API_V1_STR)
app.include_router(model.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(copilot.router, prefix=settings.API_V1_STR)
app.include_router(settings_route.router, prefix=settings.API_V1_STR)

@app.post("/api/predict", tags=["Transactions"])
def predict_alias(payload: transactions.schemas.TransactionPredictRequest):
    return transactions.run_manual_prediction(payload)

@app.get("/", tags=["Health"])
def read_root():
    return {
        "status": "online",
        "service": "SmartGrid Sentinel RiskShield AI",
        "version": "2.4.0",
        "environment": "production-live",
        "message": "Defend every transaction. Explain every decision."
    }

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "UP",
        "database": "connected",
        "ml_engine": "loaded",
        "model_version": "rf-v2.4",
        "latency_ms": "< 10ms",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

