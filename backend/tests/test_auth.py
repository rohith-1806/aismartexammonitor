import json
import os
import tempfile
import unittest

from backend import create_app, db


class AuthEndpointsTestCase(unittest.TestCase):
    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(self.db_fd)
        os.environ["DATABASE_URL"] = f"sqlite:///{self.db_path}"
        self.app = create_app()
        self.app.config.update(TESTING=True)
        self.client = self.app.test_client()
        with self.app.app_context():
            db.drop_all()
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
        os.remove(self.db_path)

    def test_register_login_profile_and_logout(self):
        register_response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Jane Doe",
                "email": "jane@example.com",
                "password": "secure123",
                "photo_path": "/tmp/jane.jpg",
            },
        )
        self.assertEqual(register_response.status_code, 201)

        login_response = self.client.post(
            "/api/auth/login",
            json={"email": "jane@example.com", "password": "secure123"},
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertIn("token", login_response.get_json())

        profile_response = self.client.get(
            "/api/auth/profile",
            headers={"Authorization": f"Bearer {login_response.get_json()['token']}"},
        )
        self.assertEqual(profile_response.status_code, 200)

        logout_response = self.client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {login_response.get_json()['token']}"},
        )
        self.assertEqual(logout_response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
