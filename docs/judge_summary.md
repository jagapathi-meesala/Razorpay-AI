# AI Return-Risk Scorer — Executive Judge Briefing

This briefing provides buildathon judges with a high-level summary of the business case, machine learning validity, and architectural implementation of **RiskShield AI**.

---

## 1. Problem Statement
Online merchants lose significant revenue to return fraud, credit card chargebacks, and checkout manipulation (e.g., account-takeover shopping, device velocity attacks). 
Identifying these risks early is difficult:
* **Rule-based systems** are too rigid, leading to high false-positives (blocking safe customers) or missed fraud.
* **Black-box models** make it impossible for customer service teams or analysts to explain *why* an order was flagged, causing customer friction.
* **Chargeback represents** are manually compiled, causing merchants to lose representment disputes due to incomplete transaction/delivery evidence.

---

## 2. The AI Risk Manager Solution
RiskShield AI is a defensive-only risk scoring engine that protects merchants by:
1. **Risk Scoring**: Evaluating orders in real-time to assign a risk score between `0–100` and recommendations (`ALLOW`, `VERIFY`, `MANUAL REVIEW`).
2. **Decision Transparency**: Exposing exact feature weights showing why an order was flagged.
3. **Dispute Automation**: Bundling device fingerprint logs, transaction velocities, and address matches to automate chargeback representments.
4. **Audit Compliance**: Logging all review note state changes to an immutable audit ledger.

---

## 3. Machine Learning Methodology & Metrics

### Dedicated Held-Out Test Set Evaluation
The model is trained on a dedicated dataset of **20,000 synthetic transaction records** reflecting realistic buyer behaviors. Evaluation is conducted on a completely isolated **3,000-record held-out test split (15%)** to ensure scores represent performance on unseen, real-world traffic.

### Validated Metrics
* **Accuracy**: **94.97%** — General model correctness.
* **Precision**: **93.43%** — When the model flags risk, it is correct 93.4% of the time, keeping false blocks minimal.
* **Recall**: **88.50%** — Model captures 88.5% of all real fraud/return abusers.
* **F1 Score**: **90.90%** — Harmonic mean balancing Precision and Recall.
* **ROC-AUC**: **93.28%** — High classification separation capability.

---

## 4. False-Positive & Business Cost Modeling
The platform incorporates business cost parameters into model tuning:
* **Cost of False Positive (FP)**: Estimated at ₹500 (review time + customer friction).
* **Cost of False Negative (FN)**: Estimated at ₹2,500 (lost goods + bank chargeback penalties).
* By utilizing the **Threshold Simulator**, merchants can mathematically locate the decision threshold (e.g., `0.30`) that minimizes total business costs. For example, at `0.30`, the model incurs **20 False Positives** yielding a total FP cost of:
  $$20 \times \text{₹500} = \text{₹10,000}$$

---

## 5. Risk Explainability (XAI)
To avoid black-box decision making, every prediction runs through a feature contribution interpreter:
* **Feature Weights**: Shows exactly which feature added to the score (e.g., `device_account_count` shared across 6 profiles adds `+42.0%` risk).
* **Risk Levels**: Automatically mapped as:
  * `0–30` $\rightarrow$ **LOW RISK** $\rightarrow$ `ALLOW`
  * `31–70` $\rightarrow$ **MEDIUM RISK** $\rightarrow$ `VERIFY`
  * `71–100` $\rightarrow$ **HIGH RISK** $\rightarrow$ `MANUAL REVIEW`

---

## 6. End-to-End System Demo Flow
1. **Analyst Dashboard**: Overview of transactions capacity, risk rates, and saved loss metrics.
2. **Alert Queue Ledger**: Search and filter checkouts by flag levels.
3. **Forensic Detail Audit**: Click an order to review customer profiles, velocities, mismatches, and AI reasons.
4. **Analyst Review Note**: Submit reviews to update transaction status to `APPROVED` or `UNDER_REVIEW`, writing process details to the `Audit Log`.
5. **Live Risk Predictor**: Form containing 22 behavior fields to test the live Random Forest model on raw JSON payloads.
6. **Representment compilation**: Click "Compile Evidence Pack" to gather network maps and dispatch notes.

---

## 7. System Architecture
```text
Shopper / Analyst
       ↓
React SPA (Tailwind CSS, Vite, TS, Recharts)
       ↓
FastAPI Backend API (Uvicorn, SQLite/Postgres ORM)
       ↓
Risk Prediction Service  ←  Random Forest Classifier (Pickle model)
       ↓
Immutable Audit Logs & Database
```

---

## 8. Sandboxed Simulation Limitations
* **Synthetic Records**: The 20,000 ML records and 202 application database records are synthetic simulations structured to reflect merchant environments for safe demonstration purposes.
