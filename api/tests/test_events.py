import os

os.environ.update({'ORGANIZER_USERNAME': 'sumit-puja', 'ORGANIZER_PASSWORD': 'test-password', 'SESSION_SECRET': 'test-secret'})

from fastapi.testclient import TestClient
from app.main import app


def test_organiser_managed_events_feed_public_invite_and_all_event_guests():
    with TestClient(app) as client:
        client.post('/auth/login', json={'username': 'sumit-puja', 'password': 'test-password'})
        guest = client.post('/guests', json={'name': 'Event test family', 'side': 'bride'}).json()
        client.post('/invitations', json={'guest_id': guest['id'], 'all_events': True, 'event_ids': []})
        created = client.post('/events', json={'name': 'Sangeet night', 'date': '2026-11-29', 'time_note': '7 PM onwards', 'venue': 'Family courtyard'})
        assert created.status_code == 200
        event = created.json()
        assert event['venue'] == 'Family courtyard'
        assert any(item['id'] == event['id'] for item in client.get('/public/events').json())
        guest_after_create = next(item for item in client.get('/guests').json() if item['id'] == guest['id'])
        assert event['id'] in guest_after_create['event_ids']
        updated = client.patch(f'/events/{event["id"]}', json={'name': 'Sangeet night', 'date': '2026-11-29', 'time_note': '8 PM onwards', 'venue': 'New courtyard'})
        assert updated.json()['venue'] == 'New courtyard'
        assert client.delete(f'/events/{event["id"]}').status_code == 200
        assert all(item['id'] != event['id'] for item in client.get('/public/events').json())
        guest_after_delete = next(item for item in client.get('/guests').json() if item['id'] == guest['id'])
        assert event['id'] not in guest_after_delete['event_ids']
