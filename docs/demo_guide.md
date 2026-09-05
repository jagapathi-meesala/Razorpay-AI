# 5-Minute Pitch & Demo Guide — RiskShield AI

This guide details the step-by-step presentation timeline and script checklist for submitting the **Track 02: AI Risk Manager** buildathon video.

---

## ⏱️ Timeline & Script Checklist

### 0:00–0:30 | Platform Introduction & Login
* **Visual**: Show the sleek midnight obsidian RiskShield AI login screen. Use the **ANALYST** credential shortcut button to authenticate.
* **Talking Points**:
  * Introduce RiskShield AI: *"A professional defensive platform protecting merchants against transaction fraud, chargebacks, and return-risk abuse."*
  * Highlight the project's selected buildathon Track: **Track 02 — AI Risk Manager**.
  * *"Everything you see is live, fully integrated, and backed by a real machine learning model."*

### 0:30–1:15 | Executive Overview Dashboard
* **Visual**: Show the glowing KPI cards (Analyzed, High Risk, Chargebacks, Prevented Losses) and the Recharts monthly trend graphs.
* **Talking Points**:
  * Highlight that all numbers represent live queries against the SQLite/PostgreSQL database.
  * Show the active detection rate and the **Prevented Losses (₹279,858.86)**, which dynamically sums blocked fraud checks.

### 1:15–2:15 | Forensic Investigation & Explainable AI
* **Visual**: Navigate to the **Transactions** ledger. Click on **TXN-DEMO-001** (or search for it) to open the details.
* **Talking Points**:
  * Inspect the **Risk Score (94/100 - HIGH RISK)**.
  * Explain **Explainable AI (XAI)**: Show the *Decision Signals* contributions (e.g., Device shared across 6 accounts (+42.0%), amount deviation (+13.2%)).
  * Show that this isn't black-box AI; it explains *why* it flagged the checkout.
  * Show the Analyst reviews workspace notes.

### 2:15–3:00 | Live Risk Prediction
* **Visual**: Click on the **Risk Predictor** tab in the sidebar. Click **Load Fraud Preset** to populate the form. Click **Analyze Risk**. Then click **Load Legitimate Preset** and click **Analyze Risk** again.
* **Talking Points**:
  * *"We have a fully working, manual prediction page where developers and risk operations can test payloads."*
  * Show the live model response, risk gauge score, classification, and the Pydantic recommendations: `ALLOW`, `VERIFY`, or `MANUAL REVIEW` (Track 02 standard).
  * Highlight that the model operates on 22 input features and is served live by our FastAPI backend.

### 3:00–3:45 | Model Diagnostics & Cost Optimization
* **Visual**: Navigate to the **Model Performance** page.
* **Talking Points**:
  * Show the validated ML metrics evaluated on the 3,000-record held-out test split: **Accuracy (94.97%)**, **Precision (93.43%)**, **Recall (88.50%)**, **ROC-AUC (93.28%)**.
  * Use the **Threshold Simulator**: Slide the decision threshold to show how the confusion matrix recalculates live.
  * Point out the **False-Positive Cost Analysis**: Adjusting the estimated review overhead (e.g. ₹250) and chargeback loss penalty (₹2,500) to find the mathematical threshold sweet-spot that minimizes merchant loss.

### 3:45–4:30 | AI Dispute Representment (Evidence Center)
* **Visual**: Navigate to the **Chargebacks** disputes workspace. Select case **CASE-10001**. Click **Compile Evidence Pack**.
* **Talking Points**:
  * *"If a dispute slips through, RiskShield AI automatically compiles a legally defensive chargeback response."*
  * Show the gathered items: billing-delivery match logs, device footprint logs, customer account history, and shipping tracking numbers.
  * Show the AI recommendation strength score (95/100 - RESPOND).

### 4:30–5:00 | Security Audit Trails & Closing
* **Visual**: Go to the **Audit Log** page.
* **Talking Points**:
  * Show the immutable log trail capturing every analyst action, notes, entity ID, and exact state delta (status: PENDING $\rightarrow$ UNDER_REVIEW).
  * Conclude: *"RiskShield AI delivers a defensive, explainable, and audit-compliant risk stack ready for merchant scale."*
