import os
import pandas as pd
import numpy as np
import datetime
from sqlalchemy.orm import Session
from backend.app.database import engine, SessionLocal, Base
from backend.app import models, auth
from backend.app.services.prediction import PredictionService

def seed_db():
    print("Initializing database connection...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Seed Users
        print("Seeding users...")
        users = [
            ("admin", "admin@riskshield.ai", "ADMIN"),
            ("analyst", "analyst@riskshield.ai", "ANALYST"),
            ("viewer", "viewer@riskshield.ai", "VIEWER")
        ]
        
        for username, email, role in users:
            existing = db.query(models.User).filter(models.User.username == username).first()
            if not existing:
                pwd_hash = auth.hash_password("password123")
                db_user = models.User(
                    username=username,
                    email=email,
                    hashed_password=pwd_hash,
                    role=role
                )
                db.add(db_user)
                print(f"Created user: {username} ({role})")
                
        # 2. Seed Transaction Records from CSV
        print("Reading transactions from data/transactions.csv...")
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        csv_path = os.getenv("CSV_PATH", os.path.join(base_dir, "data", "transactions.csv"))
        if not os.path.exists(csv_path):
            raise FileNotFoundError("Run the ML dataset generator first.")
            
        df = pd.read_csv(csv_path)
        
        # Clear database to force re-seeding with real ML predictions
        print("Clearing existing transaction, customer, chargeback, decision and audit logs...")
        db.query(models.RiskPrediction).delete()
        db.query(models.EvidenceItem).delete()
        db.query(models.Decision).delete()
        db.query(models.AuditLog).delete()
        db.query(models.Chargeback).delete()
        db.query(models.Transaction).delete()
        db.query(models.Customer).delete()
        db.commit()
        
        print("Initializing Prediction Service...")
        pred_service = PredictionService()
        
        print("Seeding customers and transactions using ML model predictions...")
        
        # Select sample: 200 random transactions to get a realistic distribution of low, medium, and high risk cases
        combined_df = df.sample(n=200, random_state=42)
        
        customer_cache = {}
        
        for idx, row in combined_df.iterrows():
            cust_id = row['customer_id']
            
            # Create customer if not exists
            if cust_id not in customer_cache:
                cust_name = f"Customer {cust_id.split('-')[-1]}"
                cust_email = f"{cust_id.lower()}@example.com"
                
                db_cust = models.Customer(
                    id=cust_id,
                    name=cust_name,
                    email=cust_email,
                    account_age_days=int(row['account_age_days']),
                    previous_transaction_count=int(row['previous_transaction_count']),
                    previous_chargeback_count=int(row['previous_chargeback_count']),
                    failed_payment_count=int(row['failed_payment_count']),
                    average_transaction_amount=float(row['average_transaction_amount']),
                    successful_payments=int(row['previous_transaction_count']),
                    average_order_value=float(row['average_transaction_amount'])
                )
                db.add(db_cust)
                customer_cache[cust_id] = db_cust
            
            # Create transaction
            txn_id = row['transaction_id']
            
            # Prepare data dict for model prediction
            pred_data = {
                'amount': float(row['amount']),
                'transaction_hour': int(row['transaction_hour']),
                'account_age_days': int(row['account_age_days']),
                'previous_transaction_count': int(row['previous_transaction_count']),
                'previous_chargeback_count': int(row['previous_chargeback_count']),
                'failed_payment_count': int(row['failed_payment_count']),
                'device_account_count': int(row['device_account_count']),
                'IP_account_count': int(row['IP_account_count']),
                'billing_shipping_match': int(row['billing_shipping_match']),
                'IP_shipping_match': int(row['IP_shipping_match']),
                'device_age_days': int(row['device_age_days']),
                'transaction_frequency': float(row['transaction_frequency']),
                'average_transaction_amount': float(row['average_transaction_amount']),
                'amount_deviation': float(row['amount_deviation']),
                'is_new_device': int(row['is_new_device']),
                'is_new_location': int(row['is_new_location']),
                'velocity_1h': int(row['velocity_1h']),
                'velocity_24h': int(row['velocity_24h']),
                'previous_fraud_flag': int(row['previous_fraud_flag']),
                'payment_method': row['payment_method'],
                'customer_country': row['customer_country'],
                'shipping_country': row['shipping_country']
            }
            
            # Make prediction using model
            pred_res = pred_service.predict_risk(pred_data)
            score = pred_res['risk_score']
            level = pred_res['risk_level']
            
            # Initialize status based on risk level. Low risk remains PENDING.
            # Medium and High risk are escalated to UNDER_REVIEW by ROUTING-ENGINE.
            if level in ["MEDIUM RISK", "HIGH RISK"]:
                status = "UNDER_REVIEW"
            else:
                status = "PENDING"
            
            # Generate a real transaction timestamp distributed across the last 10 days (with sub-hour seconds-level randomization)
            random_seconds = int(np.random.randint(1, 864000))
            txn_timestamp = datetime.datetime.utcnow() - datetime.timedelta(seconds=random_seconds)
            
            db_txn = models.Transaction(
                id=txn_id,
                customer_id=cust_id,
                amount=float(row['amount']),
                currency="INR",
                payment_method=row['payment_method'],
                device_id=f"DEV-{np.random.randint(10000, 99999)}",
                device_account_count=int(row['device_account_count']),
                IP_account_count=int(row['IP_account_count']),
                billing_shipping_match=bool(row['billing_shipping_match']),
                IP_shipping_match=bool(row['IP_shipping_match']),
                customer_country=row['customer_country'],
                shipping_country=row['shipping_country'],
                device_age_days=int(row['device_age_days']),
                transaction_frequency=float(row['transaction_frequency']),
                average_transaction_amount=float(row['average_transaction_amount']),
                amount_deviation=float(row['amount_deviation']),
                is_new_device=bool(row['is_new_device']),
                is_new_location=bool(row['is_new_location']),
                velocity_1h=int(row['velocity_1h']),
                velocity_24h=int(row['velocity_24h']),
                failed_payment_count=int(row['failed_payment_count']),
                previous_fraud_flag=bool(row['previous_fraud_flag']),
                risk_score=score,
                risk_level=level,
                status=status,
                timestamp=txn_timestamp
            )
            db.add(db_txn)
            
            # Create corresponding historical audit logs to match the transaction date
            db_log_eval = models.AuditLog(
                timestamp=txn_timestamp,
                actor="ML-ENGINE",
                action="TRANSACTION_EVALUATE",
                entity="transaction",
                entity_id=txn_id,
                reason=f"Risk Score: {score}, Level: {level}"
            )
            db.add(db_log_eval)

            # If the transaction is escalated to UNDER_REVIEW, create a ROUTING-ENGINE escalation log
            if status == "UNDER_REVIEW":
                db_log_esc = models.AuditLog(
                    timestamp=txn_timestamp + datetime.timedelta(seconds=2),
                    actor="ROUTING-ENGINE",
                    action="TRANSACTION_ESCALATE",
                    entity="transaction",
                    entity_id=txn_id,
                    previous_state="PENDING",
                    new_state="UNDER_REVIEW",
                    reason=f"{level.title()} transaction requires human review."
                )
                db.add(db_log_esc)
            
            # If high-risk and charged back, create chargeback case
            if row['chargeback_label'] == 1 and np.random.rand() < 0.4:
                case_id = f"CASE-{txn_id.split('-')[-1]}"
                # Set chargeback created_at slightly after the transaction timestamp with seconds-level offset
                cb_delay_seconds = int(np.random.randint(12 * 3600, 48 * 3600))
                cb_created_at = txn_timestamp + datetime.timedelta(seconds=cb_delay_seconds)
                db_cb = models.Chargeback(
                    id=case_id,
                    transaction_id=txn_id,
                    amount=float(row['amount']),
                    reason=np.random.choice(["Fraudulent", "Product Not Received", "Subscription Cancelled"]),
                    deadline=cb_created_at + datetime.timedelta(days=int(np.random.randint(7, 21))),
                    status="OPEN",
                    evidence_strength=0,
                    suggested_action="INVESTIGATE",
                    created_at=cb_created_at
                )
                db.add(db_cb)
        
        db.commit()
        print("Base data loaded from CSV successfully.")
            
        # 3. Seed Flagship Transaction: TXN-90001
        demo_txn_id = "TXN-90001"
        existing_demo = db.query(models.Transaction).filter(models.Transaction.id == demo_txn_id).first()
        if not existing_demo:
            print("Creating flagship transaction TXN-90001...")
            db_demo_cust = models.Customer(
                id="CUSTOMER-90001",
                name="Vipul Sharma",
                email="vipul.sharma@example.com",
                account_age_days=1,
                previous_transaction_count=0,
                previous_chargeback_count=0,
                failed_payment_count=3,
                average_transaction_amount=1200.0,
                successful_payments=0,
                average_order_value=1200.0
            )
            db.add(db_demo_cust)
            
            db_demo_txn = models.Transaction(
                id=demo_txn_id,
                customer_id="CUSTOMER-90001",
                amount=14500.0, # 12x normal
                currency="INR",
                payment_method="credit_card",
                device_id="DEV-FPR-SHARED-99",
                device_account_count=6,
                IP_account_count=6,
                billing_shipping_match=False,
                IP_shipping_match=False,
                customer_country="US", # Billing
                shipping_country="IN", # Shipping
                device_age_days=1,
                transaction_frequency=12.0,
                average_transaction_amount=1200.0,
                amount_deviation=12.08,
                is_new_device=True,
                is_new_location=True,
                velocity_1h=5,
                velocity_24h=8,
                failed_payment_count=3,
                previous_fraud_flag=False,
                risk_score=94,
                risk_level="HIGH RISK",
                status="UNDER_REVIEW",
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(minutes=int(np.random.randint(10, 45)), seconds=int(np.random.randint(0, 59)))
            )
            db.add(db_demo_txn)
            
            # Audit logs for TXN-90001
            db.add(models.AuditLog(
                timestamp=db_demo_txn.timestamp,
                actor="ML-ENGINE",
                action="TRANSACTION_EVALUATE",
                entity="transaction",
                entity_id=demo_txn_id,
                reason="Flagship Evaluation: Score 94, Level: HIGH RISK"
            ))
            db.add(models.AuditLog(
                timestamp=db_demo_txn.timestamp + datetime.timedelta(seconds=2),
                actor="ROUTING-ENGINE",
                action="TRANSACTION_ESCALATE",
                entity="transaction",
                entity_id=demo_txn_id,
                previous_state="PENDING",
                new_state="UNDER_REVIEW",
                reason="Escalated: High risk score (94) triggered system alert."
            ))
            
            print("Flagship transaction TXN-90001 created successfully.")
            
        # 4. Seed Flagship Dispute: CASE-10001 (winable) and CASE-10002 (unwinable)
        demo_case_id = "CASE-10001"
        existing_demo_case = db.query(models.Chargeback).filter(models.Chargeback.id == demo_case_id).first()
        if not existing_demo_case:
            print("Creating flagship dispute case CASE-10001 and transaction...")
            # We need a customer with a good track record
            db_good_cust = models.Customer(
                id="CUSTOMER-90002",
                name="Ananya Rao",
                email="ananya.rao@example.com",
                account_age_days=180,
                previous_transaction_count=24,
                previous_chargeback_count=0,
                failed_payment_count=0,
                average_transaction_amount=2200.0,
                successful_payments=24,
                average_order_value=2200.0
            )
            db.add(db_good_cust)
            
            # Safe looking transaction that got charged back (friendly fraud)
            db_cb_txn1 = models.Transaction(
                id="TXN-90002",
                customer_id="CUSTOMER-90002",
                amount=2450.0,
                currency="INR",
                payment_method="credit_card",
                device_id="DEV-GOOD-FPR-01",
                device_account_count=1,
                IP_account_count=1,
                billing_shipping_match=True,
                IP_shipping_match=True,
                customer_country="IN",
                shipping_country="IN",
                device_age_days=120,
                transaction_frequency=0.2,
                average_transaction_amount=2200.0,
                amount_deviation=1.11,
                is_new_device=False,
                is_new_location=False,
                velocity_1h=0,
                velocity_24h=1,
                failed_payment_count=0,
                previous_fraud_flag=False,
                risk_score=12,
                risk_level="LOW RISK",
                status="APPROVED",
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=3, hours=int(np.random.randint(1, 23)), minutes=int(np.random.randint(0, 59)), seconds=int(np.random.randint(0, 59)))
            )
            db.add(db_cb_txn1)
            
            # Audit logs for TXN-90002
            db.add(models.AuditLog(
                timestamp=db_cb_txn1.timestamp,
                actor="ML-ENGINE",
                action="TRANSACTION_EVALUATE",
                entity="transaction",
                entity_id="TXN-90002",
                reason="Friendly Fraud Record: Score 12, Level: LOW RISK"
            ))
            db.add(models.AuditLog(
                timestamp=db_cb_txn1.timestamp + datetime.timedelta(seconds=2),
                actor="AUTO-CLASSIFIER",
                action="TRANSACTION_APPROVED",
                entity="transaction",
                entity_id="TXN-90002",
                previous_state="PENDING",
                new_state="APPROVED",
                reason="Auto-processed: Score 12 is below low risk boundary."
            ))
            
            db_cb_case1 = models.Chargeback(
                id=demo_case_id,
                transaction_id="TXN-90002",
                amount=2450.0,
                reason="Fraudulent — Card Member Disputes Transaction",
                deadline=datetime.datetime.utcnow() + datetime.timedelta(days=14),
                status="OPEN",
                evidence_strength=0,
                suggested_action="INVESTIGATE"
            )
            db.add(db_cb_case1)
            print("Flagship dispute CASE-10001 created successfully.")
            
        db.commit()
        print("Database seeding completed successfully.")
        
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    seed_db()
