# Wedding Planner API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a secure FastAPI service for shared organiser planning and guest RSVPs at `wedding-api.skdev.one`.

**Architecture:** FastAPI uses SQLAlchemy with a persisted SQLite database. A signed HTTP-only organiser session protects all planning data; unguessable per-invitation tokens provide public RSVP access. Host Nginx terminates TLS and proxies only to a localhost-bound container.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2, passlib bcrypt, itsdangerous, pytest, Docker Compose, Nginx, Certbot.

## Global Constraints

- CORS permits only `https://wedding.skdev.one` and credentialed requests.
- Password and session secret exist only in VM `.env`; never commit either.
- Cookie lifetime is 14 days, `Secure`, `HttpOnly`, and `SameSite=Lax`.
- The container binds to `127.0.0.1:8040:8000`; port 8040 must never be public.
- Existing Socialflow VM services and Nginx sites are not altered.

## File Structure

```text
api/app/{main,auth,database,models,schemas,seed}.py
api/app/routers/{auth,organiser,rsvp}.py
api/tests/{conftest,test_auth,test_tasks,test_invitations,test_rsvp}.py
api/{Dockerfile,docker-compose.yml,requirements.txt,.env.example,README.md}
deploy/nginx/wedding-api.skdev.one
```

### Task 1: Build and test the database foundation

**Files:** Create `api/app/database.py`, `api/app/models.py`, `api/app/seed.py`, `api/app/main.py`, `api/requirements.txt`, `api/tests/conftest.py`, `api/tests/test_events.py`.

**Interfaces:** `get_session() -> Iterator[Session]`, `create_all_and_seed() -> None`, `GET /health`, `GET /events`.

- [ ] **Step 1: Write a failing health/seed test.**

```python
def test_health_and_seeded_events(client, organiser_headers):
    assert client.get('/health').json() == {'status': 'ok'}
    events = client.get('/events', headers=organiser_headers).json()
    assert [event['slug'] for event in events] == ['tilak', 'haldi', 'wedding', 'vidai', 'reception']
```

- [ ] **Step 2: Run it and verify it fails before the app exists.**

```bash
cd api && pytest tests/test_events.py -q
```

- [ ] **Step 3: Implement the event model and exact seed data.**

```python
EVENTS = [('tilak', 'Lagan & Tilak', '2026-11-28', ''), ('haldi', 'Haldi & Matkor', '2026-11-30', ''), ('wedding', 'Wedding ceremony', '2026-12-01', 'After 1:06 PM'), ('vidai', 'Vidai', '2026-12-02', 'After 8:00 AM'), ('reception', 'Reception party', '2026-12-03', '')]
```

- [ ] **Step 4: Add CORS and health route, then run `cd api && pytest -q`.**
- [ ] **Step 5: Commit: `git add api && git commit -m "feat: add wedding API foundation"`.**

### Task 2: Build and test organiser authentication

**Files:** Create `api/app/auth.py`, `api/app/routers/auth.py`, `api/tests/test_auth.py`; modify `api/app/main.py` and `api/.env.example`.

**Interfaces:** `require_organiser(request: Request) -> str`; `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.

- [ ] **Step 1: Write failing session tests.**

```python
def test_login_sets_session_and_me_returns_username(client):
    response = client.post('/auth/login', json={'username': 'sumit-puja', 'password': 'test-password'})
    assert response.status_code == 200 and 'HttpOnly' in response.headers['set-cookie']
    assert client.get('/auth/me').json() == {'username': 'sumit-puja'}
def test_anonymous_task_request_is_rejected(client): assert client.get('/tasks').status_code == 401
```

- [ ] **Step 2: Run `cd api && pytest tests/test_auth.py -q` and verify failure.**
- [ ] **Step 3: Hash `ORGANIZER_PASSWORD` with bcrypt; use `URLSafeTimedSerializer` to issue a 1,209,600-second signed `wedding_session` cookie.**
- [ ] **Step 4: Run `cd api && pytest -q`.**
- [ ] **Step 5: Commit: `git add api && git commit -m "feat: add organiser authentication"`.**

### Task 3: Build organiser tasks, guests, invitations, and activity

**Files:** Create `api/app/routers/organiser.py`, `api/tests/test_tasks.py`, `api/tests/test_invitations.py`; modify `api/app/models.py`, `api/app/schemas.py`, and `api/app/main.py`.

**Interfaces:** `GET/POST/PATCH /tasks`, `GET/POST/PATCH /guests`, `GET/POST/PATCH /invitations`, `GET /activity`.

- [ ] **Step 1: Write failing task/audit and invitation tests.**

```python
def test_create_task_writes_activity(client, organiser_headers):
    task = client.post('/tasks', headers=organiser_headers, json={'title': 'Book photographer'}).json()
    assert task['status'] == 'open'
    assert client.get('/activity', headers=organiser_headers).json()[0]['action'] == 'Created task: Book photographer'
def test_all_events_invitation_returns_every_event(client, organiser_headers):
    guest = client.post('/guests', headers=organiser_headers, json={'name': 'Sharma family'}).json()
    invite = client.post('/invitations', headers=organiser_headers, json={'guest_id': guest['id'], 'all_events': True, 'event_ids': []}).json()
    assert len(client.get(f"/rsvp/{invite['token']}").json()['events']) == 5
```

- [ ] **Step 2: Run `cd api && pytest tests/test_tasks.py tests/test_invitations.py -q` and verify failure.**
- [ ] **Step 3: Implement SQLAlchemy guest, invitation, invitation-event, task, and activity tables. Generate tokens via `secrets.token_urlsafe(32)`; expand `all_events` from the event table.**
- [ ] **Step 4: Ensure each organiser mutation calls `record_activity(session, actor, action)` after its database update; run `cd api && pytest -q`.**
- [ ] **Step 5: Commit: `git add api && git commit -m "feat: add planning and guest invitations"`.**

### Task 4: Build and test public token-scoped RSVPs

**Files:** Create `api/app/routers/rsvp.py`, `api/tests/test_rsvp.py`; modify `api/app/main.py`.

**Interfaces:** `GET /rsvp/{token}` and `POST /rsvp/{token}`.

- [ ] **Step 1: Write the failing privacy test.**

```python
def test_rsvp_token_exposes_only_its_guest_and_events(client, invitation):
    payload = client.get(f"/rsvp/{invitation.token}").json()
    assert set(payload) == {'guest_name', 'events', 'note'}
    assert 'phone' not in payload and 'guests' not in payload
```

- [ ] **Step 2: Run `cd api && pytest tests/test_rsvp.py -q` and verify failure.**
- [ ] **Step 3: Implement RSVP GET/POST so only invited events can be set to `pending`, `accepted`, or `declined`; invalid tokens return `404`.**
- [ ] **Step 4: Run `cd api && pytest -q`.**
- [ ] **Step 5: Commit: `git add api && git commit -m "feat: add token scoped RSVPs"`.**

### Task 5: Containerise and deploy safely on Socialflow

**Files:** Create `api/Dockerfile`, `api/docker-compose.yml`, `api/.env.example`, `api/README.md`, `deploy/nginx/wedding-api.skdev.one`; modify `.gitignore`.

**Interfaces:** Docker health endpoint at `http://127.0.0.1:8040/health`; TLS endpoint at `https://wedding-api.skdev.one/health`.

- [ ] **Step 1: Write the failing container check by running `cd api && docker compose up -d --build`; it must initially report no Compose file.**
- [ ] **Step 2: Add Docker Compose with `ports: ["127.0.0.1:8040:8000"]`, `volumes: ["./data:/app/data"]`, `env_file: .env`, and `restart: unless-stopped`.**
- [ ] **Step 3: Add Nginx server config with `proxy_pass http://127.0.0.1:8040` and standard forwarding headers.**
- [ ] **Step 4: Copy only non-secret source to `/home/rsumit123/wedding-planner-api`, make the VM-only `.env` mode `600`, bring up the container, then verify `curl --fail http://127.0.0.1:8040/health`.**
- [ ] **Step 5: Install the Nginx site, run `sudo nginx -t`, reload Nginx, run `sudo certbot --nginx -d wedding-api.skdev.one`, and verify `curl --fail --location https://wedding-api.skdev.one/health`.**
- [ ] **Step 6: Verify OPTIONS allows `https://wedding.skdev.one` but not an untrusted origin; run all API tests; commit and push main.**
