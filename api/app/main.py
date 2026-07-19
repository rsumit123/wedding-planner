import os
from datetime import date, datetime
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DB_PATH = os.getenv('DATABASE_URL', 'sqlite:///./data/wedding.db')
USERNAME = os.getenv('ORGANIZER_USERNAME', 'sumit-puja')
PASSWORD = os.getenv('ORGANIZER_PASSWORD', '')
SECRET = os.getenv('SESSION_SECRET', 'change-me-before-deploy')
engine = create_engine(DB_PATH, connect_args={'check_same_thread': False})
SessionLocal = sessionmaker(bind=engine)
pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')
signer = URLSafeTimedSerializer(SECRET, salt='wedding-session')

class Base(DeclarativeBase): pass
class Event(Base):
    __tablename__ = 'events'; id: Mapped[int] = mapped_column(primary_key=True); slug: Mapped[str] = mapped_column(String, unique=True); name: Mapped[str] = mapped_column(String); event_date: Mapped[date] = mapped_column(Date); time_note: Mapped[str] = mapped_column(String, default='')
class Task(Base):
    __tablename__ = 'tasks'; id: Mapped[int] = mapped_column(primary_key=True); title: Mapped[str] = mapped_column(String); assignee_name: Mapped[str|None] = mapped_column(String, nullable=True); due_date: Mapped[date|None] = mapped_column(Date, nullable=True); event_id: Mapped[int|None] = mapped_column(ForeignKey('events.id'), nullable=True); status: Mapped[str] = mapped_column(String, default='open'); created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
class Guest(Base):
    __tablename__ = 'guests'; id: Mapped[int] = mapped_column(primary_key=True); name: Mapped[str] = mapped_column(String); phone: Mapped[str|None] = mapped_column(String, nullable=True); note: Mapped[str] = mapped_column(String, default='')
class Invitation(Base):
    __tablename__ = 'invitations'; id: Mapped[int] = mapped_column(primary_key=True); guest_id: Mapped[int] = mapped_column(ForeignKey('guests.id')); token: Mapped[str] = mapped_column(String, unique=True); all_events: Mapped[bool] = mapped_column(Boolean, default=False)
class InvitationEvent(Base):
    __tablename__ = 'invitation_events'; id: Mapped[int] = mapped_column(primary_key=True); invitation_id: Mapped[int] = mapped_column(ForeignKey('invitations.id')); event_id: Mapped[int] = mapped_column(ForeignKey('events.id')); status: Mapped[str] = mapped_column(String, default='pending')
class Activity(Base):
    __tablename__ = 'activity'; id: Mapped[int] = mapped_column(primary_key=True); actor: Mapped[str] = mapped_column(String); action: Mapped[str] = mapped_column(String); created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Login(BaseModel): username: str; password: str
class TaskIn(BaseModel): title: str = Field(min_length=1, max_length=200); assignee_name: str|None = None; due_date: date|None = None; event_id: int|None = None; status: Literal['open','done'] = 'open'
class GuestIn(BaseModel): name: str = Field(min_length=1, max_length=160); phone: str|None = None; note: str = ''
class InvitationIn(BaseModel): guest_id: int; all_events: bool = False; event_ids: list[int] = []
class RsvpIn(BaseModel): statuses: dict[int, Literal['pending','accepted','declined']]; note: str|None = None

app = FastAPI(title='Sumit & Puja Wedding API')
app.add_middleware(CORSMiddleware, allow_origins=['https://wedding.skdev.one'], allow_credentials=True, allow_methods=['GET','POST','PATCH','OPTIONS'], allow_headers=['Content-Type'])
EVENTS = [('tilak','Lagan & Tilak','2026-11-28',''),('haldi','Haldi & Matkor','2026-11-30',''),('wedding','Wedding ceremony','2026-12-01','After 1:06 PM'),('vidai','Vidai','2026-12-02','After 8:00 AM'),('reception','Reception party','2026-12-03','')]

@app.on_event('startup')
def startup():
    Path('data').mkdir(exist_ok=True); Base.metadata.create_all(engine)
    with SessionLocal() as s:
        if not s.scalar(select(Event.id).limit(1)):
            s.add_all([Event(slug=a,name=b,event_date=date.fromisoformat(c),time_note=d) for a,b,c,d in EVENTS]); s.commit()
def db():
    s=SessionLocal()
    try: yield s
    finally: s.close()
def user(wedding_session: str|None=Cookie(default=None)):
    if not wedding_session: raise HTTPException(401,'Sign in required')
    try: name=signer.loads(wedding_session,max_age=1209600)
    except (BadSignature,SignatureExpired): raise HTTPException(401,'Sign in required')
    if name != USERNAME: raise HTTPException(401,'Sign in required')
    return name
def audit(s, actor, action): s.add(Activity(actor=actor,action=action)); s.commit()
def event_json(e): return {'id':e.id,'slug':e.slug,'name':e.name,'date':e.event_date.isoformat(),'time_note':e.time_note}

@app.get('/health')
def health(): return {'status':'ok'}
@app.post('/auth/login')
def login(data:Login, response:Response):
    if data.username != USERNAME or not PASSWORD or data.password != PASSWORD: raise HTTPException(401,'Invalid username or password')
    response.set_cookie('wedding_session',signer.dumps(USERNAME),max_age=1209600,httponly=True,secure=bool(os.getenv('DEPLOYED')),samesite='lax')
    return {'username':USERNAME}
@app.post('/auth/logout')
def logout(response:Response): response.delete_cookie('wedding_session'); return {'ok':True}
@app.get('/auth/me')
def me(name:str=Depends(user)): return {'username':name}
@app.get('/events')
def events(_:str=Depends(user), s:Session=Depends(db)): return [event_json(e) for e in s.scalars(select(Event).order_by(Event.event_date))]
@app.get('/tasks')
def tasks(_:str=Depends(user),s:Session=Depends(db)): return [{'id':t.id,'title':t.title,'assignee_name':t.assignee_name,'due_date':t.due_date.isoformat() if t.due_date else None,'event_id':t.event_id,'status':t.status} for t in s.scalars(select(Task).order_by(Task.created_at.desc()))]
@app.post('/tasks')
def add_task(data:TaskIn,name:str=Depends(user),s:Session=Depends(db)):
    t=Task(**data.model_dump());s.add(t);s.commit();s.refresh(t);audit(s,name,f'Created task: {t.title}');return {'id':t.id,'title':t.title,'status':t.status}
@app.get('/guests')
def guests(_:str=Depends(user),s:Session=Depends(db)): return [{'id':g.id,'name':g.name,'phone':g.phone,'note':g.note} for g in s.scalars(select(Guest).order_by(Guest.name))]
@app.post('/guests')
def add_guest(data:GuestIn,name:str=Depends(user),s:Session=Depends(db)):
    g=Guest(**data.model_dump());s.add(g);s.commit();s.refresh(g);audit(s,name,f'Added guest: {g.name}');return {'id':g.id,'name':g.name}
@app.post('/invitations')
def invite(data:InvitationIn,name:str=Depends(user),s:Session=Depends(db)):
    if not s.get(Guest,data.guest_id): raise HTTPException(404,'Guest not found')
    ids=[e.id for e in s.scalars(select(Event))] if data.all_events else data.event_ids
    if not ids: raise HTTPException(422,'Select at least one event')
    i=Invitation(guest_id=data.guest_id,token=uuid4().hex,all_events=data.all_events);s.add(i);s.flush();s.add_all([InvitationEvent(invitation_id=i.id,event_id=x) for x in ids]);s.commit();audit(s,name,'Created invitation');return {'id':i.id,'token':i.token}
@app.get('/rsvp/{token}')
def get_rsvp(token:str,s:Session=Depends(db)):
    i=s.scalar(select(Invitation).where(Invitation.token==token));
    if not i: raise HTTPException(404,'Invitation not found')
    g=s.get(Guest,i.guest_id); rows=s.scalars(select(InvitationEvent).where(InvitationEvent.invitation_id==i.id)).all(); return {'guest_name':g.name,'note':g.note,'events':[dict(event_json(s.get(Event,r.event_id)),status=r.status) for r in rows]}
@app.post('/rsvp/{token}')
def post_rsvp(token:str,data:RsvpIn,s:Session=Depends(db)):
    i=s.scalar(select(Invitation).where(Invitation.token==token));
    if not i: raise HTTPException(404,'Invitation not found')
    rows=s.scalars(select(InvitationEvent).where(InvitationEvent.invitation_id==i.id)).all(); allowed={r.event_id:r for r in rows}
    if not set(data.statuses).issubset(allowed): raise HTTPException(403,'Event not invited')
    for event_id,status in data.statuses.items(): allowed[event_id].status=status
    if data.note is not None: s.get(Guest,i.guest_id).note=data.note
    s.commit(); return {'ok':True}
@app.get('/activity')
def activity(_:str=Depends(user),s:Session=Depends(db)): return [{'actor':a.actor,'action':a.action,'created_at':a.created_at.isoformat()} for a in s.scalars(select(Activity).order_by(Activity.created_at.desc()))]
