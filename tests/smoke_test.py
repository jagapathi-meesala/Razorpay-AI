import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app import models

class TestE2ESmokeFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.username = "analyst"
        cls.password = "password123"

    def test_complete_analyst_flow(self):
        print("\n=== STARTING E2E INTEGRATION SMOKE TEST ===")
        
        # 1. Login
        print("[1/5] Authenticating as analyst...")
        login_res = self.client.post("/api/auth/login", json={
            "username": self.username,
            "password": self.password
        })
        self.assertEqual(login_res.status_code, 200, "Login failed")
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(" -> Auth successful. Token retrieved.")
        
        # 2. Get Dashboard Stats
        print("[2/5] Fetching dashboard metrics and charts...")
        stats_res = self.client.get("/api/dashboard/stats", headers=headers)
        self.assertEqual(stats_res.status_code, 200, "Dashboard fetch failed")
        stats_data = stats_res.json()
        self.assertIn("kpis", stats_data)
        print(f" -> Success. Analyzed count in view: {stats_data['kpis']['transactions_analyzed']}")
        
        # 3. Investigate flagship transaction detail: TXN-DEMO-001
        print("[3/5] Querying flagship transaction TXN-DEMO-001 detail...")
        txn_res = self.client.get("/api/transactions/TXN-DEMO-001", headers=headers)
        self.assertEqual(txn_res.status_code, 200, "TXN-DEMO-001 retrieval failed")
        txn_data = txn_res.json()
        self.assertEqual(txn_data["risk_score"], 94, "TXN-DEMO-001 risk score mismatch")
        self.assertEqual(txn_data["risk_level"], "HIGH RISK", "TXN-DEMO-001 risk level mismatch")
        print(f" -> Flagship transaction score: {txn_data['risk_score']} ({txn_data['risk_level']})")
        
        # 4. Escalate flag transaction
        print("[4/5] Escalating flagship transaction TXN-DEMO-001...")
        decision_payload = {
            "action": "ESCALATE",
            "notes": "Escalating demo case for manual forensic review"
        }
        dec_res = self.client.post("/api/transactions/TXN-DEMO-001/decision", json=decision_payload, headers=headers)
        self.assertEqual(dec_res.status_code, 200, "Escalation post failed")
        updated_txn = dec_res.json()
        self.assertEqual(updated_txn["status"], "UNDER_REVIEW")
        print(" -> Escalation registered. Status updated to: UNDER_REVIEW")
        
        # Verify Audit Log entry was created
        db = SessionLocal()
        last_audit = db.query(models.AuditLog).order_by(models.AuditLog.id.desc()).first()
        self.assertEqual(last_audit.action, "TRANSACTION_ESCALATE")
        self.assertEqual(last_audit.entity_id, "TXN-DEMO-001")
        self.assertEqual(last_audit.actor, self.username)
        print(f" -> Immutable Audit Log verified: {last_audit.action} for {last_audit.entity_id} logged by {last_audit.actor}")
        
        # 5. Compile dispute evidence for CASE-10001
        print("[5/5] Compiling AI Evidence pack for CASE-10001...")
        ev_res = self.client.post("/api/chargebacks/CASE-10001/evidence", headers=headers)
        self.assertEqual(ev_res.status_code, 200, "Evidence compilation failed")
        ev_data = ev_res.json()
        self.assertGreaterEqual(ev_data["evidence_strength"], 70, "Friendly fraud CASE-10001 should show strong evidence match")
        self.assertEqual(ev_data["suggested_action"], "RESPOND TO CHARGEBACK")
        print(f" -> Evidence strength: {ev_data['evidence_strength']}/100 - Recommendation: {ev_data['suggested_action']}")
        
        # Verify evidence items cached in db
        items_count = db.query(models.EvidenceItem).filter(models.EvidenceItem.chargeback_id == "CASE-10001").count()
        self.assertGreater(items_count, 0, "No evidence items written to database")
        print(f" -> Database registry checked: {items_count} evidentiary records saved.")
        
        db.close()
        print("=== E2E SMOKE TEST PASSED SUCCESSFULLY ===")

if __name__ == '__main__':
    unittest.main()
