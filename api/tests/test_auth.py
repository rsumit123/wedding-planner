import os
os.environ.update({'ORGANIZER_USERNAME': 'sumit-puja', 'ORGANIZER_PASSWORD': 'test-password', 'SESSION_SECRET': 'test-secret'})
from fastapi.testclient import TestClient
from app.main import app


def test_login_protects_and_unlocks_organiser_routes():
    with TestClient(app) as client:
        assert client.get('/auth/me').status_code == 401
        response = client.post('/auth/login', json={'username': 'sumit-puja', 'password': 'test-password'})
        assert response.status_code == 200
        assert 'httponly' in response.headers['set-cookie'].lower()
        assert client.get('/auth/me').json() == {'username': 'sumit-puja'}
        assert client.get('/events').status_code == 200
