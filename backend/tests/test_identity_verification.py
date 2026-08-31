import base64
import os
import tempfile
import unittest
from unittest.mock import patch

from backend import create_app, db
from backend.models.exam_models import Candidate


class IdentityVerificationEndpointsTestCase(unittest.TestCase):
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
            candidate = Candidate(
                name="Candidate One",
                email="candidate@example.com",
                password_hash="not-used",
                photo_path="data:image/jpeg;base64,cmVmZXJlbmNl",
            )
            db.session.add(candidate)
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
        os.remove(self.db_path)

    def test_endpoint_uses_authenticated_candidate_photo(self):
        with self.app.app_context():
            candidate = db.session.query(Candidate).first()
            from backend.routes.auth import _issue_token

            token = _issue_token(candidate)

        with patch(
            "backend.routes.events.face_service.verify_candidate_face_identity",
            return_value={"verified": True, "match_confidence": 99.0},
        ) as verify:
            response = self.client.post(
                "/api/events/verify-identity",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "image": base64.b64encode(b"live-image").decode(),
                    "registered_photo": "data:image/jpeg;base64,attacker-photo",
                },
            )

        self.assertEqual(response.status_code, 200)
        verify.assert_called_once_with(
            b"live-image", "data:image/jpeg;base64,cmVmZXJlbmNl"
        )


if __name__ == "__main__":
    unittest.main()