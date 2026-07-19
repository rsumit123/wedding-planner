import os
import re
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
    __tablename__ = 'events'; id: Mapped[int] = mapped_column(primary_key=True); slug: Mapped[str] = mapped_column(String, unique=True); name: Mapped[str] = mapped_column(String); event_date: Mapped[date] = mapped_column(Date); time_note: Mapped[str] = mapped_column(String, default=''); venue: Mapped[str] = mapped_column(String, default='')
class Task(Base):
    __tablename__ = 'tasks'; id: Mapped[int] = mapped_column(primary_key=True); title: Mapped[str] = mapped_column(String); assignee_name: Mapped[str|None] = mapped_column(String, nullable=True); due_date: Mapped[date|None] = mapped_column(Date, nullable=True); event_id: Mapped[int|None] = mapped_column(ForeignKey('events.id'), nullable=True); status: Mapped[str] = mapped_column(String, default='open'); created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
class Guest(Base):
    __tablename__ = 'guests'; id: Mapped[int] = mapped_column(primary_key=True); name: Mapped[str] = mapped_column(String); side: Mapped[str] = mapped_column(String, default='groom'); phone: Mapped[str|None] = mapped_column(String, nullable=True); note: Mapped[str] = mapped_column(String, default='')
class Invitation(Base):
    __tablename__ = 'invitations'; id: Mapped[int] = mapped_column(primary_key=True); guest_id: Mapped[int] = mapped_column(ForeignKey('guests.id')); token: Mapped[str] = mapped_column(String, unique=True); all_events: Mapped[bool] = mapped_column(Boolean, default=False)
class InvitationEvent(Base):
    __tablename__ = 'invitation_events'; id: Mapped[int] = mapped_column(primary_key=True); invitation_id: Mapped[int] = mapped_column(ForeignKey('invitations.id')); event_id: Mapped[int] = mapped_column(ForeignKey('events.id')); status: Mapped[str] = mapped_column(String, default='pending')
class Activity(Base):
    __tablename__ = 'activity'; id: Mapped[int] = mapped_column(primary_key=True); actor: Mapped[str] = mapped_column(String); action: Mapped[str] = mapped_column(String); created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
class Vendor(Base):
    __tablename__ = 'vendors'; id: Mapped[int] = mapped_column(primary_key=True); name: Mapped[str] = mapped_column(String); category: Mapped[str] = mapped_column(String); side: Mapped[str] = mapped_column(String, default='both'); amount: Mapped[int] = mapped_column(Integer, default=0); paid_amount: Mapped[int] = mapped_column(Integer, default=0)

class Login(BaseModel): username: str; password: str
class TaskIn(BaseModel): title: str = Field(min_length=1, max_length=200); assignee_name: str|None = None; due_date: date|None = None; event_id: int|None = None; status: Literal['open','done'] = 'open'
class TaskUpdateIn(BaseModel): title: str|None = Field(default=None, min_length=1, max_length=200); assignee_name: str|None = None; due_date: date|None = None; event_id: int|None = None; status: Literal['open','done']|None = None
class GuestIn(BaseModel): name: str = Field(min_length=1, max_length=160); side: Literal['bride','groom'] = 'groom'; phone: str|None = None; note: str = ''
class InvitationIn(BaseModel): guest_id: int; all_events: bool = False; event_ids: list[int] = []
class GuestUpdateIn(BaseModel): name: str = Field(min_length=1, max_length=160); side: Literal['bride','groom']; all_events: bool = False; event_ids: list[int] = []
class VendorIn(BaseModel): name: str = Field(min_length=1, max_length=160); category: str = Field(min_length=1, max_length=80); side: Literal['bride','groom','both'] = 'both'; amount: int = Field(ge=0); paid_amount: int = Field(ge=0)
class EventIn(BaseModel): name: str = Field(min_length=1, max_length=120); date: date; time_note: str = Field(default='', max_length=120); venue: str = Field(default='', max_length=200)
class RsvpIn(BaseModel): statuses: dict[int, Literal['pending','accepted','declined']]; note: str|None = None

app = FastAPI(title='Sumit & Puja Wedding API')
app.add_middleware(CORSMiddleware, allow_origins=['https://wedding.skdev.one'], allow_credentials=True, allow_methods=['GET','POST','PATCH','DELETE','OPTIONS'], allow_headers=['Content-Type'])
EVENTS = [('tilak','Lagan & Tilak','2026-11-28',''),('haldi','Haldi & Matkor','2026-11-30',''),('wedding','Wedding ceremony','2026-12-01','After 1:06 PM'),('reception','Reception party','2026-12-03','')]

@app.on_event('startup')
def startup():
    Path('data').mkdir(exist_ok=True); Base.metadata.create_all(engine)
    with engine.begin() as connection:
        guest_columns = {row[1] for row in connection.exec_driver_sql('PRAGMA table_info(guests)')}
        event_columns = {row[1] for row in connection.exec_driver_sql('PRAGMA table_info(events)')}
        vendor_columns = {row[1] for row in connection.exec_driver_sql('PRAGMA table_info(vendors)')}
        if 'side' not in guest_columns: connection.exec_driver_sql("ALTER TABLE guests ADD COLUMN side VARCHAR NOT NULL DEFAULT 'groom'")
        if 'venue' not in event_columns: connection.exec_driver_sql("ALTER TABLE events ADD COLUMN venue VARCHAR NOT NULL DEFAULT ''")
        if 'side' not in vendor_columns: connection.exec_driver_sql("ALTER TABLE vendors ADD COLUMN side VARCHAR NOT NULL DEFAULT 'both'")
    with SessionLocal() as s:
        vidai = s.scalar(select(Event).where(Event.slug == 'vidai')); wedding = s.scalar(select(Event).where(Event.slug == 'wedding'))
        if vidai and wedding:
            for invitation_event in s.scalars(select(InvitationEvent).where(InvitationEvent.event_id == vidai.id)): invitation_event.event_id = wedding.id
            s.delete(vidai); s.commit()
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
def event_json(e): return {'id':e.id,'slug':e.slug,'name':e.name,'date':e.event_date.isoformat(),'time_note':e.time_note,'venue':e.venue}
def vendor_json(v): return {'id':v.id,'name':v.name,'category':v.category,'side':v.side,'amount':v.amount,'paid_amount':v.paid_amount}
def event_slug(name): return re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-') or 'function'

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
@app.get('/public/events')
def public_events(s:Session=Depends(db)): return [event_json(e) for e in s.scalars(select(Event).order_by(Event.event_date))]
@app.post('/events')
def add_event(data:EventIn,name:str=Depends(user),s:Session=Depends(db)):
    base=event_slug(data.name); slug=base; suffix=2
    while s.scalar(select(Event.id).where(Event.slug == slug)): slug=f'{base}-{suffix}'; suffix+=1
    event=Event(slug=slug,name=data.name,event_date=data.date,time_note=data.time_note,venue=data.venue); s.add(event); s.flush()
    for invitation in s.scalars(select(Invitation).where(Invitation.all_events == True)): s.add(InvitationEvent(invitation_id=invitation.id,event_id=event.id))
    s.commit(); s.refresh(event); audit(s,name,f'Added event: {event.name}'); return event_json(event)
@app.patch('/events/{event_id}')
def update_event(event_id:int,data:EventIn,name:str=Depends(user),s:Session=Depends(db)):
    event=s.get(Event,event_id)
    if not event: raise HTTPException(404,'Event not found')
    event.name=data.name; event.event_date=data.date; event.time_note=data.time_note; event.venue=data.venue; s.commit(); audit(s,name,f'Updated event: {event.name}'); return event_json(event)
@app.delete('/events/{event_id}')
def delete_event(event_id:int,name:str=Depends(user),s:Session=Depends(db)):
    event=s.get(Event,event_id)
    if not event: raise HTTPException(404,'Event not found')
    for invitation_event in s.scalars(select(InvitationEvent).where(InvitationEvent.event_id == event.id)): s.delete(invitation_event)
    for task in s.scalars(select(Task).where(Task.event_id == event.id)): task.event_id=None
    event_name=event.name; s.delete(event); s.commit(); audit(s,name,f'Removed event: {event_name}'); return {'ok':True}
@app.get('/tasks')
def tasks(_:str=Depends(user),s:Session=Depends(db)): return [{'id':t.id,'title':t.title,'assignee_name':t.assignee_name,'due_date':t.due_date.isoformat() if t.due_date else None,'event_id':t.event_id,'status':t.status} for t in s.scalars(select(Task).order_by(Task.created_at.desc()))]
@app.post('/tasks')
def add_task(data:TaskIn,name:str=Depends(user),s:Session=Depends(db)):
    t=Task(**data.model_dump());s.add(t);s.commit();s.refresh(t);audit(s,name,f'Created task: {t.title}');return {'id':t.id,'title':t.title,'status':t.status}
@app.patch('/tasks/{task_id}')
def update_task(task_id:int,data:TaskUpdateIn,name:str=Depends(user),s:Session=Depends(db)):
    t=s.get(Task,task_id)
    if not t: raise HTTPException(404,'Task not found')
    for key,value in data.model_dump(exclude_unset=True).items(): setattr(t,key,value)
    s.commit();audit(s,name,f'Updated task: {t.title}');return {'id':t.id,'title':t.title,'status':t.status}
@app.get('/guests')
def guests(_:str=Depends(user),s:Session=Depends(db)):
    result=[]
    for g in s.scalars(select(Guest).order_by(Guest.name)):
        invitations=list(s.scalars(select(Invitation).where(Invitation.guest_id == g.id))); invitation_ids=[i.id for i in invitations]
        event_ids=sorted(set(s.scalars(select(InvitationEvent.event_id).where(InvitationEvent.invitation_id.in_(invitation_ids))).all())) if invitation_ids else []
        result.append({'id':g.id,'name':g.name,'side':g.side,'phone':g.phone,'note':g.note,'all_events':any(i.all_events for i in invitations),'event_ids':event_ids})
    return result
@app.post('/guests')
def add_guest(data:GuestIn,name:str=Depends(user),s:Session=Depends(db)):
    g=Guest(**data.model_dump());s.add(g);s.commit();s.refresh(g);audit(s,name,f'Added guest: {g.name}');return {'id':g.id,'name':g.name,'side':g.side,'phone':g.phone,'note':g.note,'all_events':False,'event_ids':[]}
@app.patch('/guests/{guest_id}')
def update_guest(guest_id:int,data:GuestUpdateIn,name:str=Depends(user),s:Session=Depends(db)):
    guest=s.get(Guest,guest_id)
    if not guest: raise HTTPException(404,'Guest not found')
    ids=[event.id for event in s.scalars(select(Event))] if data.all_events else data.event_ids
    if not ids: raise HTTPException(422,'Select at least one event')
    guest.name=data.name; guest.side=data.side
    invitations=list(s.scalars(select(Invitation).where(Invitation.guest_id == guest.id)))
    for invitation in invitations:
        for invitation_event in s.scalars(select(InvitationEvent).where(InvitationEvent.invitation_id == invitation.id)): s.delete(invitation_event)
        s.delete(invitation)
    invitation=Invitation(guest_id=guest.id,token=uuid4().hex,all_events=data.all_events); s.add(invitation); s.flush(); s.add_all([InvitationEvent(invitation_id=invitation.id,event_id=event_id) for event_id in ids]); s.commit(); audit(s,name,f'Updated guest: {guest.name}')
    return {'id':guest.id,'name':guest.name,'side':guest.side,'phone':guest.phone,'note':guest.note,'all_events':data.all_events,'event_ids':sorted(set(ids))}
@app.get('/guest-summary')
def guest_summary(_:str=Depends(user),s:Session=Depends(db)):
    guests = list(s.scalars(select(Guest)))
    event_totals = []
    for event in s.scalars(select(Event).order_by(Event.event_date)):
        guest_ids = s.scalars(select(Invitation.guest_id).join(InvitationEvent, InvitationEvent.invitation_id == Invitation.id).where(InvitationEvent.event_id == event.id)).all()
        event_totals.append({**event_json(event), 'guest_count': len(set(guest_ids))})
    return {'total': len(guests), 'bride_total': sum(g.side == 'bride' for g in guests), 'groom_total': sum(g.side == 'groom' for g in guests), 'events': event_totals}
@app.get('/vendors')
def vendors(_:str=Depends(user),s:Session=Depends(db)): return [vendor_json(v) for v in s.scalars(select(Vendor).order_by(Vendor.name))]
@app.post('/vendors')
def add_vendor(data:VendorIn,name:str=Depends(user),s:Session=Depends(db)):
    vendor=Vendor(**data.model_dump()); s.add(vendor); s.commit(); s.refresh(vendor); audit(s,name,f'Added vendor: {vendor.name}'); return vendor_json(vendor)
@app.patch('/vendors/{vendor_id}')
def update_vendor(vendor_id:int,data:VendorIn,name:str=Depends(user),s:Session=Depends(db)):
    vendor=s.get(Vendor,vendor_id)
    if not vendor: raise HTTPException(404,'Vendor not found')
    for key,value in data.model_dump().items(): setattr(vendor,key,value)
    s.commit(); audit(s,name,f'Updated vendor: {vendor.name}'); return vendor_json(vendor)
@app.get('/budget-summary')
def budget_summary(_:str=Depends(user),s:Session=Depends(db)):
    vendors=list(s.scalars(select(Vendor))); planned=sum(v.amount for v in vendors); paid=sum(v.paid_amount for v in vendors)
    return {'planned_total':planned,'paid_total':paid,'due_total':planned-paid}
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
