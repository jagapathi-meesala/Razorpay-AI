import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal, Base, engine
from backend.app import models, auth

class TestSecurityAndRBAC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        
        db = SessionLocal()
        
        # Cleanup past test registration users for idempotent test run
        db.query(models.User).filter(models.User.username.like("%reg_user%")).delete(synchronize_session=False)
        db.commit()

        # Provision test Admin if not exists
        cls.admin_username = "test_admin_sec"
        cls.admin_password = "adminpassword123"
        existing_admin = db.query(models.User).filter(models.User.username == cls.admin_username).first()
        if not existing_admin:
            db_admin = models.User(
                username=cls.admin_username,
                email="test_admin_sec@example.com",
                hashed_password=auth.hash_password(cls.admin_password),
                role="ADMIN"
            )
            db.add(db_admin)
            
        # Provision test Analyst if not exists
        cls.analyst_username = "test_analyst_sec"
        cls.analyst_password = "analystpassword123"
        existing_analyst = db.query(models.User).filter(models.User.username == cls.analyst_username).first()
        if not existing_analyst:
            db_analyst = models.User(
                username=cls.analyst_username,
                email="test_analyst_sec@example.com",
                hashed_password=auth.hash_password(cls.analyst_password),
                role="ANALYST"
            )
            db.add(db_analyst)
            
        db.commit()
        db.close()

    def get_token(self, username, password):
        res = self.client.post("/api/auth/login", json={"username": username, "password": password})
        self.assertEqual(res.status_code, 200)
        return res.json()["access_token"]

    # TEST 1: Valid ADMIN credentials -> Admin Login -> SUCCESS
    def test_01_valid_admin_credentials_on_admin_login(self):
        res = self.client.post("/api/auth/admin-login", json={
            "username": self.admin_username,
            "password": self.admin_password
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["role"], "ADMIN")
        self.assertTrue("access_token" in data)

    # TEST 2: Valid ANALYST credentials -> Admin Login -> REJECTED with HTTP 403
    def test_02_valid_analyst_credentials_on_admin_login_rejected(self):
        res = self.client.post("/api/auth/admin-login", json={
            "username": self.analyst_username,
            "password": self.analyst_password
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("admin access required", res.json()["detail"].lower())

    # TEST 3: Invalid password -> REJECTED
    def test_03_invalid_password_rejected(self):
        res = self.client.post("/api/auth/admin-login", json={
            "username": self.admin_username,
            "password": "wrongpassword"
        })
        self.assertEqual(res.status_code, 401)

    # TEST 4: Unknown email/username -> REJECTED
    def test_04_unknown_user_rejected(self):
        res = self.client.post("/api/auth/admin-login", json={
            "username": "nonexistent_user_999",
            "password": "password123"
        })
        self.assertEqual(res.status_code, 401)

    # TEST 5: Unauthenticated user opens admin route -> ACCESS DENIED
    def test_05_unauthenticated_request_denied(self):
        res = self.client.get("/api/auth/users")
        self.assertEqual(res.status_code, 401)

    # TEST 6: ANALYST manually calls admin API -> HTTP 403 Forbidden
    def test_06_analyst_calling_admin_api_forbidden(self):
        token = self.get_token(self.analyst_username, self.analyst_password)
        headers = {"Authorization": f"Bearer {token}"}
        
        res = self.client.get("/api/auth/users", headers=headers)
        self.assertEqual(res.status_code, 403)

        res_settings = self.client.post("/api/settings", json={"high_risk_threshold": 95}, headers=headers)
        self.assertEqual(res_settings.status_code, 403)

    # TEST 7: Backend checks real database role, ignoring frontend role tampering
    def test_07_backend_verifies_db_role_on_me(self):
        token = self.get_token(self.analyst_username, self.analyst_password)
        headers = {"Authorization": f"Bearer {token}"}
        
        res = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["role"], "ANALYST")

    # TEST 8: User tries to send role=ADMIN during public registration -> Assigned ANALYST
    def test_08_public_registration_role_injection_prevented(self):
        payload = {
            "username": "reg_user_hacker",
            "email": "hacker@example.com",
            "password": "password123",
            "role": "ADMIN"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["role"], "ANALYST")

    # TEST 9: Human-in-the-loop decision override reason validation
    def test_09_decision_override_requires_reason(self):
        token = self.get_token(self.analyst_username, self.analyst_password)
        headers = {"Authorization": f"Bearer {token}"}

        bad_payload = {
            "action": "MARK_SAFE",
            "notes": "Testing override",
            "ai_recommendation": "DECLINE",
            "human_decision": "MARK_SAFE",
            "override": True,
            "override_reason": ""
        }
        res = self.client.post("/api/transactions/TXN-90001/decision", json=bad_payload, headers=headers)
        self.assertEqual(res.status_code, 400)

if __name__ == '__main__':
    unittest.main()
