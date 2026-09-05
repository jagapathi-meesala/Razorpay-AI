import os
import json
import joblib
import pandas as pd
import numpy as np
from backend.app.config import settings

class PredictionService:
    def __init__(self):
        self.model = None
        self.metrics = None
        self.features_list = []
        self.load_model()
        
    def load_model(self):
        try:
            if os.path.exists(settings.MODEL_PATH):
                self.model = joblib.load(settings.MODEL_PATH)
                print(f"PredictionService: Loaded model from {settings.MODEL_PATH}")
            else:
                print(f"PredictionService: Model file not found at {settings.MODEL_PATH}. Falling back to rule-based engine.")
                
            if os.path.exists(settings.METRICS_PATH):
                with open(settings.METRICS_PATH, 'r') as f:
                    self.metrics = json.load(f)
                self.features_list = self.metrics.get('features', [f['feature'] for f in self.metrics.get('feature_importances', [])])
                print(f"PredictionService: Loaded metrics and {len(self.features_list)} features from {settings.METRICS_PATH}")
        except Exception as e:
            print(f"PredictionService: Error loading model/metrics: {str(e)}. Falling back to rule-based engine.")
            self.model = None
            self.metrics = None

    def get_categorical_encodings(self, payment_method: str, customer_country: str, shipping_country: str):
        # Match mappings in train.py
        pm_map = {'credit_card': 0, 'debit_card': 1, 'upi': 2, 'net_banking': 3}
        c_map = {'IN': 0, 'US': 1, 'GB': 2, 'AE': 3, 'SG': 4, 'CA': 5, 'AU': 6, 'DE': 7, 'FR': 8, 'JP': 9}
        
        return (
            pm_map.get(payment_method, 0),
            c_map.get(customer_country, 10),
            c_map.get(shipping_country, 10)
        )

    def predict_risk(self, data: dict) -> dict:
        """
        Predicts fraud/risk probability using ML model if available, else rule-based.
        Returns continuous, input-sensitive risk metrics and factor explanations.
        """
        pm_enc, cc_enc, sc_enc = self.get_categorical_encodings(
            data.get('payment_method', 'credit_card'),
            data.get('customer_country', 'IN'),
            data.get('shipping_country', 'IN')
        )
        
        amount = float(data.get('amount', 0))
        avg_amt = float(data.get('average_transaction_amount', 1000))
        
        # Calculate dynamic amount deviation if amount & avg_amt provided
        if avg_amt > 0 and amount > 0:
            calc_deviation = round(amount / avg_amt, 2)
        else:
            calc_deviation = float(data.get('amount_deviation', 1.0))
            
        feature_inputs = {
            'amount': amount,
            'transaction_hour': int(data.get('transaction_hour', 12)),
            'account_age_days': int(data.get('account_age_days', 30)),
            'previous_transaction_count': int(data.get('previous_transaction_count', 0)),
            'previous_chargeback_count': int(data.get('previous_chargeback_count', 0)),
            'failed_payment_count': int(data.get('failed_payment_count', 0)),
            'device_account_count': int(data.get('device_account_count', 1)),
            'IP_account_count': int(data.get('IP_account_count', 1)),
            'billing_shipping_match': int(data.get('billing_shipping_match', 1)),
            'IP_shipping_match': int(data.get('IP_shipping_match', 1)),
            'device_age_days': int(data.get('device_age_days', 30)),
            'transaction_frequency': float(data.get('transaction_frequency', 1.0)),
            'average_transaction_amount': avg_amt,
            'amount_deviation': calc_deviation,
            'is_new_device': int(data.get('is_new_device', 0)),
            'is_new_location': int(data.get('is_new_location', 0)),
            'velocity_1h': int(data.get('velocity_1h', 0)),
            'velocity_24h': int(data.get('velocity_24h', 0)),
            'previous_fraud_flag': int(data.get('previous_fraud_flag', 0)),
            'payment_method_encoded': pm_enc,
            'customer_country_encoded': cc_enc,
            'shipping_country_encoded': sc_enc
        }
        
        # 1. Fallback Predictor
        if self.model is None or not self.features_list:
            return self._predict_rule_based(feature_inputs, data)
            
        try:
            # Construct DataFrame with columns in exact training order
            X_df = pd.DataFrame([feature_inputs])[self.features_list]
            
            # Predict
            prob = float(self.model.predict_proba(X_df)[0, 1])
            risk_score = int(round(prob * 100))
            
            # Risk level classification
            if risk_score < 30:
                risk_level = "LOW RISK"
            elif risk_score < 70:
                risk_level = "MEDIUM RISK"
            else:
                risk_level = "HIGH RISK"
                
            # Confidence score (measure of model certainty)
            confidence = int(round((abs(prob - 0.5) * 2) * 100))
            confidence = max(50, min(99, confidence))
            
            # Generate Explainable Risk Factors
            risk_factors = self._generate_factors(feature_inputs, risk_score)
            
            return {
                'probability': prob,
                'risk_score': risk_score,
                'risk_level': risk_level,
                'risk_factors': risk_factors,
                'model_version': self.metrics.get('version', '1.0') if self.metrics else '1.0',
                'model_confidence': confidence
            }
            
        except Exception as e:
            print(f"PredictionService: ML prediction error: {str(e)}. Falling back to rule-based.")
            return self._predict_rule_based(feature_inputs, data)

    def _predict_rule_based(self, features: dict, raw_data: dict) -> dict:
        """Continuous rule-based fallback calculation when ML service is unavailable."""
        prob = 0.08  # Base
        
        prob += features['failed_payment_count'] * 0.08
        prob += features['previous_chargeback_count'] * 0.22
        prob += features['previous_fraud_flag'] * 0.30
        prob += max(0, features['device_account_count'] - 1) * 0.06
        prob += max(0, features['IP_account_count'] - 1) * 0.04
        prob += (1 - features['billing_shipping_match']) * 0.12
        prob += (1 - features['IP_shipping_match']) * 0.08
        prob += max(0, features['amount_deviation'] - 1.0) * 0.08
        prob += features['velocity_1h'] * 0.06
        prob += features['velocity_24h'] * 0.01
        prob += features['is_new_device'] * 0.05
        prob += features['is_new_location'] * 0.05
        
        prob = min(0.98, max(0.01, prob))
        risk_score = int(round(prob * 100))
        
        if risk_score < 30:
            risk_level = "LOW RISK"
        elif risk_score < 70:
            risk_level = "MEDIUM RISK"
        else:
            risk_level = "HIGH RISK"
            
        risk_factors = self._generate_factors(features, risk_score)
        
        return {
            'probability': prob,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'model_version': "1.0-Fallback",
            'model_confidence': 75
        }

    def _generate_factors(self, features: dict, risk_score: int) -> list:
        factors = []
        
        # Get importances if available, else use default weights
        importances = {}
        if self.metrics and 'feature_importances' in self.metrics:
            for item in self.metrics['feature_importances']:
                importances[item['feature']] = item['importance']
        else:
            importances = {
                'previous_chargeback_count': 0.15,
                'previous_fraud_flag': 0.15,
                'device_account_count': 0.14,
                'velocity_1h': 0.12,
                'failed_payment_count': 0.10,
                'amount_deviation': 0.09,
                'IP_account_count': 0.07,
                'billing_shipping_match': 0.06,
                'IP_shipping_match': 0.04,
                'is_new_device': 0.04,
                'is_new_location': 0.04
            }
            
        # 1. Previous Chargebacks
        if features['previous_chargeback_count'] > 0:
            w = importances.get('previous_chargeback_count', 0.15)
            contrib = w * features['previous_chargeback_count'] * 80
            factors.append({
                'feature': 'previous_chargeback_count',
                'contribution': float(round(contrib, 1)),
                'severity': 'HIGH' if features['previous_chargeback_count'] > 1 else 'MEDIUM',
                'description': f"Customer account has {features['previous_chargeback_count']} previous chargeback disputes"
            })
            
        # 2. Previous Fraud Flag
        if features['previous_fraud_flag'] == 1:
            w = importances.get('previous_fraud_flag', 0.15)
            contrib = w * 100
            factors.append({
                'feature': 'previous_fraud_flag',
                'contribution': float(round(contrib, 1)),
                'severity': 'HIGH',
                'description': "Customer account was flagged in a prior fraud investigation"
            })

        # 3. Device Account Count
        if features['device_account_count'] > 1:
            w = importances.get('device_account_count', 0.14)
            contrib = w * (features['device_account_count'] - 1) * 25
            factors.append({
                'feature': 'device_account_count',
                'contribution': float(round(contrib, 1)),
                'severity': 'HIGH' if features['device_account_count'] >= 4 else 'MEDIUM',
                'description': f"Device is shared across {features['device_account_count']} distinct customer accounts"
            })
            
        # 4. Failed Payments
        if features['failed_payment_count'] > 0:
            w = importances.get('failed_payment_count', 0.10)
            contrib = w * features['failed_payment_count'] * 20
            factors.append({
                'feature': 'failed_payment_count',
                'contribution': float(round(contrib, 1)),
                'severity': 'MEDIUM' if features['failed_payment_count'] < 3 else 'HIGH',
                'description': f"Session includes {features['failed_payment_count']} failed payment attempt(s)"
            })
            
        # 5. Amount Deviation
        if features['amount_deviation'] > 1.3:
            w = importances.get('amount_deviation', 0.09)
            contrib = w * (features['amount_deviation'] - 1.0) * 20
            factors.append({
                'feature': 'amount_deviation',
                'contribution': float(round(contrib, 1)),
                'severity': 'HIGH' if features['amount_deviation'] >= 3.0 else 'MEDIUM',
                'description': f"Transaction amount is {features['amount_deviation']}x higher than customer average"
            })
            
        # 6. Hourly Velocity
        if features['velocity_1h'] > 0:
            w = importances.get('velocity_1h', 0.12)
            contrib = w * features['velocity_1h'] * 18
            factors.append({
                'feature': 'velocity_1h',
                'contribution': float(round(contrib, 1)),
                'severity': 'HIGH' if features['velocity_1h'] >= 4 else 'MEDIUM',
                'description': f"Account transaction velocity is {features['velocity_1h']} txns/hr"
            })
            
        # 7. Country Mismatches
        if features['billing_shipping_match'] == 0:
            w = importances.get('billing_shipping_match', 0.06)
            contrib = w * 100
            factors.append({
                'feature': 'billing_shipping_match',
                'contribution': float(round(contrib, 1)),
                'severity': 'MEDIUM',
                'description': "Mismatch between billing country and shipping country"
            })
            
        if features['IP_shipping_match'] == 0:
            w = importances.get('IP_shipping_match', 0.04)
            contrib = w * 100
            factors.append({
                'feature': 'IP_shipping_match',
                'contribution': float(round(contrib, 1)),
                'severity': 'MEDIUM',
                'description': "IP address location mismatch with delivery country"
            })
            
        # 8. IP account count
        if features['IP_account_count'] > 1:
            w = importances.get('IP_account_count', 0.07)
            contrib = w * (features['IP_account_count'] - 1) * 15
            factors.append({
                'feature': 'IP_account_count',
                'contribution': float(round(contrib, 1)),
                'severity': 'LOW' if features['IP_account_count'] < 4 else 'MEDIUM',
                'description': f"IP address is shared across {features['IP_account_count']} distinct customer accounts"
            })
            
        # 9. New device/location
        if features['is_new_device'] == 1:
            w = importances.get('is_new_device', 0.04)
            factors.append({
                'feature': 'is_new_device',
                'contribution': float(round(w * 100, 1)),
                'severity': 'LOW',
                'description': "First transaction recorded using this device fingerprint"
            })
            
        if features['is_new_location'] == 1:
            w = importances.get('is_new_location', 0.04)
            factors.append({
                'feature': 'is_new_location',
                'contribution': float(round(w * 100, 1)),
                'severity': 'LOW',
                'description': "Transaction originating from a new physical location"
            })
            
        # Sort factors by contribution
        factors = sorted(factors, key=lambda x: x['contribution'], reverse=True)
        return factors[:5]

prediction_service = PredictionService()
