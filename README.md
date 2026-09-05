# AI Risk Manager — Return Risk Scorer

An AI-powered return-risk scoring platform that helps merchants identify risky orders, understand why they were flagged, and choose appropriate defensive actions.

### 🏆 Key Validation Results
* **Accuracy**: **94.97%**
* **Precision**: **93.43%**
* **Recall**: **88.50%**
* **F1 Score**: **90.90%**
* **ROC-AUC**: **93.28%**
* **Held-Out Test Set**: **3,000 completely unseen transactions**
* **False Positives**: **20**

---

## 1. Product Description
RiskShield AI is a professional, full-stack risk manager built for the **RAZOR Pay Buildathon — Track 02**. The platform evaluates transaction checkouts in real-time, displays explainable machine learning predictions, compiles dispute evidence response files, and records action histories into a secure audit log ledger.

---

## 2. Core Architecture

The platform consists of:
* **Frontend SPA**: React, TypeScript, Vite, Tailwind CSS, Recharts, and Lucide Icons.
* **REST Backend**: Python, FastAPI, SQLAlchemy, and Pydantic.
* **Machine Learning**: Scikit-Learn Random Forest Classifier trained on 20,000 synthetic transactions.
* **Database Layer**: PostgreSQL (with automated fallback to SQLite for local development sandboxes).
* **Audit System**: Persistence of change logs (actor, action, previous state, new state, notes).
* **RiskShield Copilot**: A fact-based regex query parser that accesses database states without LLM hallucinations.

---

## 3. Demo Credentials

The database is pre-seeded with three demo accounts (password: `password123` for all):
1. **ADMIN**: `admin` (Full access to reviews, API registration, and audits)
2. **ANALYST**: `analyst` (Can review transactions, escalate, and compile dispute evidence)
3. **VIEWER**: `viewer` (Read-only access to dashboards, charts, and metrics)

---

## 4. Local Setup & Installation

### Prerequisites
* Python 3.12+
* Node.js v20+ / Yarn (a standalone `yarn.js` is bundled in the root)

### Step 1: Install Python Dependencies
```bash
python3 -m pip install --break-system-packages --user fastapi uvicorn sqlalchemy pydantic passlib bcrypt pyjwt pandas numpy scikit-learn joblib httpx
```

### Step 2: Seed the Database
Ensure the ML model is trained and database tables are seeded:
```bash
# 1. Generate 20k transactions dataset
python3 ml/dataset_generator.py

# 2. Train Random Forest model
python3 ml/train.py

# 3. Seed database (creates SQL tables and inserts demo metrics)
PYTHONPATH=. python3 backend/app/seed.py
```

### Step 3: Run the FastAPI Backend Server
```bash
python3 backend/run.py
```
The server will start on `http://localhost:8000`.

### Step 4: Run the React Frontend
```bash
cd frontend
# Standalone yarn execution
node ../yarn.js install
node ../yarn.js dev
```
Open `http://localhost:5173` in your browser.

---

## 5. Verification Tests
Execute unit tests and E2E integration flow tests:
```bash
# Run backend endpoints and auth checks
PYTHONPATH=. python3 tests/test_backend.py

# Run ML pipeline splits and predictions validation
PYTHONPATH=. python3 tests/test_ml.py

# Run E2E Smoke flow (login -> fetch stats -> escalate -> compile evidence -> check audits)
PYTHONPATH=. python3 tests/smoke_test.py
```

---

## 6. Why This Project is Different
1. **ML Integrated to Operations**: Connects a high-accuracy Random Forest classifier directly to merchant review screens.
2. **Explainable AI (XAI)**: Exposes raw feature weight contributions to investigators instead of opaque results.
3. **Cost-Based Boundary Tuning**: Integrates a Threshold Simulator assessing estimated FP review cost vs FN fraud loss.
4. **Programmatic Proof**: Fully automated unit and E2E test suites validating correctness on every save.
