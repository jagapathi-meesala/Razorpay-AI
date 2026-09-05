import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, precision_recall_curve, auc, confusion_matrix, roc_curve
)
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# Categorical Mappings (Manual for robustness)
PAYMENT_METHOD_MAP = {'credit_card': 0, 'debit_card': 1, 'upi': 2, 'net_banking': 3}
COUNTRY_MAP = {'IN': 0, 'US': 1, 'GB': 2, 'AE': 3, 'SG': 4, 'CA': 5, 'AU': 6, 'DE': 7, 'FR': 8, 'JP': 9}

FEATURES = [
    'amount', 'transaction_hour', 'account_age_days',
    'previous_transaction_count', 'previous_chargeback_count',
    'failed_payment_count', 'device_account_count', 'IP_account_count',
    'billing_shipping_match', 'IP_shipping_match', 'device_age_days',
    'transaction_frequency', 'average_transaction_amount', 'amount_deviation',
    'is_new_device', 'is_new_location', 'velocity_1h', 'velocity_24h',
    'previous_fraud_flag', 'payment_method_encoded',
    'customer_country_encoded', 'shipping_country_encoded'
]


def preprocess_data(df: pd.DataFrame):
    df = df.copy()
    df['payment_method_encoded'] = df['payment_method'].map(PAYMENT_METHOD_MAP).fillna(0).astype(int)
    df['customer_country_encoded'] = df['customer_country'].map(COUNTRY_MAP).fillna(10).astype(int)
    df['shipping_country_encoded'] = df['shipping_country'].map(COUNTRY_MAP).fillna(10).astype(int)
    X = df[FEATURES]
    y = df['chargeback_label']
    return X, y


def find_best_threshold(model, X_val: pd.DataFrame, y_val: pd.Series) -> float:
    """Find the threshold that maximises F1 on validation set."""
    probs = model.predict_proba(X_val)[:, 1]
    best_thresh, best_f1 = 0.5, 0.0
    for t in np.arange(0.10, 0.90, 0.01):
        preds = (probs >= t).astype(int)
        f = f1_score(y_val, preds, zero_division=0)
        if f > best_f1:
            best_f1, best_thresh = f, t
    print(f"  Best threshold on validation set: {best_thresh:.2f}  (F1={best_f1:.4f})")
    return float(best_thresh)


def train_model():
    print("=" * 55)
    print("  RAZOR PAY — Enhanced RF Training Pipeline v2.5")
    print("=" * 55)

    csv_path = 'data/transactions.csv'
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}. Run dataset_generator.py first.")

    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df):,} records. Fraud rate: {df['chargeback_label'].mean()*100:.1f}%")

    X, y = preprocess_data(df)

    # 70/15/15 stratified split (preserve class ratio)
    from sklearn.model_selection import train_test_split
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=0.15 / 0.85, random_state=42, stratify=y_temp
    )
    print(f"Splits — Train: {len(X_train):,}  Val: {len(X_val):,}  Test: {len(X_test):,}")

    # ── Tuned Random Forest (primary model) ──────────────────────────────────
    print("\nTraining Tuned Random Forest (n=400, balanced)...")
    rf = RandomForestClassifier(
        n_estimators=400,
        max_depth=14,
        min_samples_split=4,
        min_samples_leaf=2,
        max_features='sqrt',
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    # ── Gradient Boosting (secondary model) ──────────────────────────────────
    print("Training Gradient Boosting (n=200)...")
    gb = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        min_samples_split=4,
        random_state=42,
    )
    gb.fit(X_train, y_train)

    # ── Soft-voting ensemble ─────────────────────────────────────────────────
    print("Building soft-voting ensemble (RF + GB)...")
    ensemble = VotingClassifier(
        estimators=[('rf', rf), ('gb', gb)],
        voting='soft',
        weights=[0.6, 0.4],
        n_jobs=-1,
    )
    ensemble.fit(X_train, y_train)

    # ── Optimal threshold on validation set ─────────────────────────────────
    print("\nSearching optimal classification threshold on validation set...")
    best_thresh = find_best_threshold(ensemble, X_val, y_val)

    # ── Evaluate on held-out test set ────────────────────────────────────────
    print("\n--- Held-Out Test Set Evaluation ---")
    y_proba = ensemble.predict_proba(X_test)[:, 1]
    y_pred  = (y_proba >= best_thresh).astype(int)

    accuracy  = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall    = recall_score(y_test, y_pred, zero_division=0)
    f1        = f1_score(y_test, y_pred, zero_division=0)
    roc_auc   = roc_auc_score(y_test, y_proba)

    prec_curve, rec_curve, _ = precision_recall_curve(y_test, y_proba)
    pr_auc = auc(rec_curve, prec_curve)

    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    fpr_rate = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    fnr_rate = fn / (fn + tp) if (fn + tp) > 0 else 0.0

    print(f"  Accuracy  : {accuracy:.4f}  ({accuracy*100:.2f}%)")
    print(f"  Precision : {precision:.4f}  ({precision*100:.2f}%)")
    print(f"  Recall    : {recall:.4f}  ({recall*100:.2f}%)")
    print(f"  F1 Score  : {f1:.4f}")
    print(f"  ROC-AUC   : {roc_auc:.4f}")
    print(f"  PR-AUC    : {pr_auc:.4f}")
    print(f"  Confusion  TN={tn}  FP={fp}  FN={fn}  TP={tp}")

    # ── Curves (sampled to 50 pts) ───────────────────────────────────────────
    fpr_c, tpr_c, _ = roc_curve(y_test, y_proba)
    step_r = max(1, len(fpr_c) // 50)
    step_p = max(1, len(prec_curve) // 50)
    roc_pts = [{"fpr": float(f), "tpr": float(t)} for f, t in zip(fpr_c[::step_r], tpr_c[::step_r])]
    pr_pts  = [{"precision": float(p), "recall": float(r)} for p, r in zip(prec_curve[::step_p], rec_curve[::step_p])]

    # ── Feature importances from RF component ────────────────────────────────
    importances = rf.feature_importances_
    feat_imp = sorted(
        [{"feature": f, "importance": float(v)} for f, v in zip(FEATURES, importances)],
        key=lambda x: x['importance'], reverse=True
    )

    # ── Save metrics.json ────────────────────────────────────────────────────
    os.makedirs('ml/models', exist_ok=True)
    metrics = {
        "model_type": "Random Forest Classifier (Scikit-Learn)",
        "version": "v2.5-production",
        "dataset_version": "v2.5-synthetic-ledger",
        "train_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "features_count": len(FEATURES),
        "features": FEATURES,
        "test_set_size": int(len(y_test)),
        "accuracy":  float(accuracy),
        "precision": float(precision),
        "recall":    float(recall),
        "f1":        float(f1),
        "roc_auc":   float(roc_auc),
        "pr_auc":    float(pr_auc),
        "confusion_matrix": {
            "tp": int(tp), "tn": int(tn), "fp": int(fp), "fn": int(fn)
        },
        "false_positive_rate": float(fpr_rate),
        "false_negative_rate": float(fnr_rate),
        "feature_importances": feat_imp,
        "curves": {"roc": roc_pts, "pr": pr_pts},
        "test_predictions": [float(p) for p in y_proba],
        "test_labels":      [int(l)   for l in y_test],
        "classification_threshold": float(best_thresh),
    }

    with open('ml/models/metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)

    # ── Save ensemble model ──────────────────────────────────────────────────
    joblib.dump(ensemble, 'ml/models/model.pkl')
    print("\n✓ Ensemble model saved  →  ml/models/model.pkl")
    print("✓ Metrics saved         →  ml/models/metrics.json")
    print("=" * 55)
    return metrics


if __name__ == '__main__':
    train_model()
