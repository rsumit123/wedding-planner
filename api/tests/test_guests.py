import os
os.environ.update({'ORGANIZER_USERNAME': 'sumit-puja', 'ORGANIZER_PASSWORD': 'test-password', 'SESSION_SECRET': 'test-secret'})
from fastapi.testclient import TestClient
from app.main import app


def test_guest_side_and_invitation_totals_are_returned():
    with TestClient(app) as client:
        client.post('/auth/login', json={'username': 'sumit-puja', 'password': 'test-password'})
        guest = client.post('/guests', json={'name': 'Verma family', 'side': 'bride'}).json()
        client.post('/invitations', json={'guest_id': guest['id'], 'all_events': False, 'event_ids': [1, 5]})
        summary = client.get('/guest-summary').json()
        assert summary['bride_total'] >= 1
        assert summary['events'][0]['guest_count'] >= 1


def test_organiser_can_edit_guest_side_and_functions():
    with TestClient(app) as client:
        client.post('/auth/login', json={'username': 'sumit-puja', 'password': 'test-password'})
        guest = client.post('/guests', json={'name': 'Singh family', 'side': 'bride'}).json()
        client.post('/invitations', json={'guest_id': guest['id'], 'all_events': False, 'event_ids': [1, 5]})
        updated = client.patch(f'/guests/{guest["id"]}', json={'name': 'Singh family', 'side': 'groom', 'all_events': False, 'event_ids': [3]})
        assert updated.status_code == 200
        listed = client.get('/guests').json()
        saved = next(item for item in listed if item['id'] == guest['id'])
        assert saved['side'] == 'groom'
        assert saved['event_ids'] == [3]
        assert len(client.get('/guest-summary').json()['events']) >= 4
