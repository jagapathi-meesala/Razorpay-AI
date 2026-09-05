import unittest
import os
import pandas as pd
import joblib
from backend.app.services.prediction import prediction_service

class TestMLPipeline(unittest.TestCase):
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    def test_dataset_exists_and_valid(self):
        csv_path = os.path.join(self.BASE_DIR, 'data', 'transactions.csv')
        self.assertTrue(os.path.exists(csv_path), "Dataset transactions.csv not found")
        
        # Load and validate columns
        df = pd.read_csv(csv_path)
        self.assertGreaterEqual(len(df), 20000, "Dataset should have at least 20,000 records")
        
        required_cols = [
            'transaction_id', 'customer_id', 'amount', 'chargeback_label',
            'failed_payment_count', 'device_account_count', 'billing_shipping_match'
        ]
        for col in required_cols:
            self.assertIn(col, df.columns, f"Required column {col} missing from dataset")
            
    def test_model_pkl_exists_and_loads(self):
        model_path = os.path.join(self.BASE_DIR, 'ml', 'models', 'model.pkl')
        self.assertTrue(os.path.exists(model_path), "Trained model.pkl not found")
        
        # Test model prediction via service loading
        self.assertIsNotNone(prediction_service.model, "ML Model failed to load into PredictionService")
        
    def test_prediction_factors_generation(self):
        # Create a sample fake high-risk transaction input
        sample_txn = {
            'amount': 24000.0, # high amount
            'payment_method': 'credit_card',
            'customer_country': 'US',
            'shipping_country': 'IN', # location mismatch
            'account_age_days': 2, # new customer
            'previous_transaction_count': 0,
            'previous_chargeback_count': 0,
            'failed_payment_count': 3, # multiple failures
            'device_account_count': 5, # shared device
            'IP_account_count': 5,
            'billing_shipping_match': 0,
            'IP_shipping_match': 0,
            'device_age_days': 1,
            'transaction_frequency': 8.0,
            'average_transaction_amount': 1500.0,
            'amount_deviation': 16.0,
            'is_new_device': 1,
            'is_new_location': 1,
            'velocity_1h': 4,
            'velocity_24h': 6,
            'previous_fraud_flag': 1
        }
        
        pred = prediction_service.predict_risk(sample_txn)
        
        self.assertIn('probability', pred)
        self.assertIn('risk_score', pred)
        self.assertIn('risk_level', pred)
        self.assertIn('risk_factors', pred)
        
        # High-risk inputs should yield a high risk score
        self.assertGreaterEqual(pred['risk_score'], 55, "High fraud parameters did not trigger High Risk flag")
        self.assertGreater(len(pred['risk_factors']), 0, "No risk factors identified for fraudulent transaction")

if __name__ == '__main__':
    unittest.main()
