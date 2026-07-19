import os

os.environ.update({'ORGANIZER_USERNAME': 'sumit-puja', 'ORGANIZER_PASSWORD': 'test-password', 'SESSION_SECRET': 'test-secret'})

from fastapi.testclient import TestClient
from app.main import app


def test_task_can_be_created_and_completed_with_only_a_status_patch():
    with TestClient(app) as client:
        client.post('/auth/login', json={'username': 'sumit-puja', 'password': 'test-password'})
        task = client.post('/tasks', json={'title': 'Confirm florist'}).json()
        updated = client.patch(f'/tasks/{task["id"]}', json={'status': 'done'})
        assert updated.status_code == 200
        assert updated.json()['status'] == 'done'
