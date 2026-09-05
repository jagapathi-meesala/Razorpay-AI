# Machine Learning & Explainability Pipeline

This document details the synthetic dataset generation, training splits, model evaluation metrics, and the custom feature-importance explainability service.

---

## 1. Synthetic Dataset Architecture

To simulate a real payment network, we generated a dataset of **20,000 transaction records** featuring realistic correlations.

### Fraud Generation Rules (Probability Drivers)
The target labels (`chargeback_label`) are sampled using a Bernoulli trial with probability:
$$P(\text{Fraud}) = \text{Clip}(0.015 + \sum \text{Anomaly Weights} + \text{Noise}, 0.001, 0.98)$$

Key anomaly weights driving the fraud probability:
- **Velocity Check**: Hourly transaction velocity $\ge 4$: $+22\%$ probability.
- **Device Reputation**: Device ID shared across $\ge 4$ customer accounts: $+30\%$ probability.
- **Location Integrity**: Mismatch between IP country and delivery country: $+8\%$ probability.
- **Account history**: Account age $< 7$ days: $+8\%$ probability.
- **Payment Friction**: $\ge 2$ failed payment attempts: $+20\%$ probability.
- **Anomalous Size**: Order size deviation $\ge 3.0$ times customer average: $+18\%$ probability.
- **Blacklists**: Prior customer chargeback dispute history: $+35\%$ probability.

This mathematical structure guarantees that the trained model yields realistic feature importances.

---

## 2. Train / Validation / Test Splitting

To prevent data leakage, we perform a strict index shuffle and partition:
- **70% Training Set** (14,000 samples)
- **15% Validation Set** (3,000 samples)
- **15% Held-Out Test Set** (3,000 samples)

The held-out test set is completely isolated during feature extraction and model tuning, serving as the sole source for the metrics displayed in the monitoring dashboards.

---

## 3. Model Architecture & Evaluation

We train a **Random Forest Classifier** (`n_estimators=100`, `max_depth=12`, `random_state=42`) using `scikit-learn`.

### Evaluation Metrics (Held-Out Test Set)
Evaluated at a tuned classification threshold of **0.30**:
- **Accuracy**: 95.0%
- **Precision**: 93.4%
- **Recall**: 88.5%
- **ROC-AUC**: 0.9328
- **PR-AUC**: 0.8932

### Top 5 Feature Importances
1. `device_account_count` (Model Weight: ~22%)
2. `amount_deviation` (Model Weight: ~16%)
3. `failed_payment_count` (Model Weight: ~12%)
4. `account_age_days` (Model Weight: ~10%)
5. `velocity_1h` (Model Weight: ~9%)

---

## 4. Cost-Based Decision Modeling

The model performance page implements a merchant cost simulator to identify the optimal classification threshold.

### Cost Configuration Assumptions
- **False Positive Cost (FPC) = ₹500**: Represents the cost of manual review overhead + potential customer churn from blocking a legitimate transaction.
- **False Negative Cost (FNC) = ₹2,500**: Represents the loss of the physical/digital product + standard chargeback penalty fees.

### Cost Formula
$$\text{Total Decision Cost} = (\text{False Positives} \times \text{FPC}) + (\text{False Negatives} \times \text{FNC})$$

Analysts can slide the classification threshold from **0.05** to **0.95** to identify the threshold that minimizes the Total Decision Cost on the unseen test set, representing a true fintech engineering workflow.
