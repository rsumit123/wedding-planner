import os

os.environ.update({'ORGANIZER_USERNAME': 'sumit-puja', 'ORGANIZER_PASSWORD': 'test-password', 'SESSION_SECRET': 'test-secret'})

from fastapi.testclient import TestClient
from app.main import app


def test_vendor_totals_and_updates_are_available_to_organisers():
    with TestClient(app) as client:
        client.post('/auth/login', json={'username': 'sumit-puja', 'password': 'test-password'})
        before = client.get('/budget-summary').json()
        vendor = client.post('/vendors', json={'name': 'Mehendi artists', 'category': 'Beauty', 'side': 'bride', 'amount': 12000, 'paid_amount': 3000})
        assert vendor.status_code == 200
        assert vendor.json()['side'] == 'bride'
        summary = client.get('/budget-summary').json()
        assert summary == {'planned_total': before['planned_total'] + 12000, 'paid_total': before['paid_total'] + 3000, 'due_total': before['due_total'] + 9000}
        updated = client.patch(f'/vendors/{vendor.json()["id"]}', json={'name': 'Mehendi artists', 'category': 'Beauty', 'side': 'both', 'amount': 12000, 'paid_amount': 12000})
        assert updated.status_code == 200
        assert updated.json()['side'] == 'both'
        assert client.get('/budget-summary').json()['due_total'] == before['due_total']
