import os

os.environ.update({
    'ORGANIZER_USERNAME': 'sumit-puja',
    'ORGANIZER_PASSWORD': 'test-password',
    'SESSION_SECRET': 'test-secret',
    'AWS_APP_ACCESS_KEY_ID': 'test-key',
    'AWS_APP_SECRET_ACCESS_KEY': 'test-secret-key',
    'AWS_APP_S3_REGION_NAME': 'us-east-1',
    'AWS_APP_STORAGE_BUCKET_NAME': 'sumits-private-storage',
})

from fastapi.testclient import TestClient
from app import main
from app.main import app


class FakeS3:
    def __init__(self):
        self.deleted = []

    def generate_presigned_url(self, operation, Params, ExpiresIn):
        assert operation == 'put_object'
        assert Params['Bucket'] == 'sumits-private-storage'
        assert Params['Key'].startswith('wedding-photos/')
        return f"https://upload.example/{Params['Key']}"

    def head_object(self, Bucket, Key):
        assert Bucket == 'sumits-private-storage'
        assert Key.startswith('wedding-photos/')
        return {'ContentLength': 123}

    def delete_object(self, Bucket, Key):
        self.deleted.append((Bucket, Key))


def test_gallery_photos_are_confirmed_by_organisers_and_visible_publicly(monkeypatch):
    fake_s3 = FakeS3()
    monkeypatch.setattr(main, 'gallery_s3_client', lambda: fake_s3)
    with TestClient(app) as client:
        assert client.get('/gallery').status_code == 401
        client.post('/auth/login', json={'username': 'sumit-puja', 'password': 'test-password'})
        event = client.get('/events').json()[0]
        requested = client.post('/gallery/uploads', json={
            'event_id': event['id'],
            'files': [{'filename': 'family photo.jpg', 'mime_type': 'image/jpeg', 'size_bytes': 123}],
        })
        assert requested.status_code == 200
        upload = requested.json()['uploads'][0]
        assert upload['upload_url'].startswith('https://upload.example/wedding-photos/')
        assert client.get('/public/gallery').json() == []

        confirmed = client.post('/gallery/confirm', json={
            'event_id': event['id'],
            'photos': [{'key': upload['key'], 'filename': 'family photo.jpg', 'mime_type': 'image/jpeg', 'size_bytes': 123}],
        })
        assert confirmed.status_code == 200
        photo = confirmed.json()[0]
        public = client.get('/public/gallery').json()
        assert public == [{
            'id': photo['id'],
            'event_id': event['id'],
            'event_name': event['name'],
            'event_slug': event['slug'],
            'filename': 'family photo.jpg',
            'mime_type': 'image/jpeg',
            'size_bytes': 123,
            'url': photo['url'],
        }]

        removed = client.delete(f"/gallery/{photo['id']}")
        assert removed.json() == {'ok': True}
        assert fake_s3.deleted == [('sumits-private-storage', upload['key'])]
        assert client.get('/public/gallery').json() == []


def test_gallery_rejects_wrong_types_and_cross_event_keys(monkeypatch):
    monkeypatch.setattr(main, 'gallery_s3_client', lambda: FakeS3())
    with TestClient(app) as client:
        client.post('/auth/login', json={'username': 'sumit-puja', 'password': 'test-password'})
        event = client.get('/events').json()[0]
        invalid = client.post('/gallery/uploads', json={'event_id': event['id'], 'files': [{'filename': 'movie.mp4', 'mime_type': 'video/mp4', 'size_bytes': 1}]})
        assert invalid.status_code == 422
        invalid_key = client.post('/gallery/confirm', json={'event_id': event['id'], 'photos': [{'key': 'wedding-photos/not-this-event/photo.jpg', 'filename': 'photo.jpg', 'mime_type': 'image/jpeg', 'size_bytes': 1}]})
        assert invalid_key.status_code == 422
