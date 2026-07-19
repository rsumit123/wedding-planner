import os

os.environ.update({'ORGANIZER_USERNAME': 'sumit-puja', 'ORGANIZER_PASSWORD': 'test-password', 'SESSION_SECRET': 'test-secret'})

from fastapi.testclient import TestClient
from app.main import app


def test_organiser_can_save_view_and_remove_vendor_and_event_images():
    with TestClient(app) as client:
        client.post('/auth/login', json={'username': 'sumit-puja', 'password': 'test-password'})
        vendor = client.post('/vendors', json={'name': 'Attachment vendor', 'category': 'Test', 'side': 'both', 'amount': 100, 'paid_amount': 0}).json()
        event = client.get('/events').json()[0]
        receipt = client.post(f'/vendors/{vendor["id"]}/attachments', files={'file': ('receipt.png', b'fake-png', 'image/png')})
        venue_photo = client.post(f'/events/{event["id"]}/attachments', files={'file': ('venue.webp', b'fake-webp', 'image/webp')})
        assert receipt.status_code == 200
        assert venue_photo.status_code == 200
        assert client.get(receipt.json()['url']).content == b'fake-png'
        assert client.get(venue_photo.json()['url']).content == b'fake-webp'
        assert client.delete(f'/attachments/{receipt.json()["id"]}').json() == {'ok': True}
        assert client.get(receipt.json()['url']).status_code == 404
