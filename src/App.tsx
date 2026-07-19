import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, MapPin, Plus, UsersRound } from 'lucide-react';
import couplePhoto from './assets/sumit-puja-wedding.png';
import { EventIcon, type EventIconKind } from './components/EventIcon';
import { api } from './api';

type Event = { date: string; day: string; title: string; note: string; icon: EventIconKind; accent: string };
const events: Event[] = [
  { date: '28', day: 'NOV', title: 'Lagan & Tilak', note: 'A beginning, blessed with family.', icon: 'tilak', accent: 'pink' },
  { date: '30', day: 'NOV', title: 'Haldi & Matkor', note: 'Colour, laughter, and all the good wishes.', icon: 'haldi', accent: 'yellow' },
  { date: '01', day: 'DEC', title: 'Wedding ceremony', note: 'After 1:06 PM', icon: 'wedding', accent: 'red' },
  { date: '02', day: 'DEC', title: 'Vidai', note: 'After 8:00 AM', icon: 'vidai', accent: 'blue' },
  { date: '03', day: 'DEC', title: 'Reception party', note: 'An evening with everyone we love.', icon: 'reception', accent: 'gold' },
];
const nav = ['Today', 'Tasks', 'Events', 'Guests & RSVPs', 'Budget & vendors', 'Guest page'];
type UiTask = { id: number; text: string; meta: string; done: boolean };

function daysUntilWedding() {
  const today = new Date(); const wedding = new Date('2026-12-01T13:06:00');
  return Math.max(0, Math.ceil((wedding.getTime() - today.getTime()) / 86400000));
}

function Login({ onSignedIn, error, setError }: { onSignedIn: () => Promise<void>; error: string; setError: (value: string) => void }) {
  const [username, setUsername] = useState('sumit-puja'); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await api.login(username, password); await onSignedIn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  return <main className="invite"><section className="invite-hero"><div><p className="eyebrow">Family organiser access</p><h1>Sumit <em>&amp;</em> Puja</h1><form onSubmit={submit} style={{display:'grid',gap:10,maxWidth:330}}><input aria-label="Username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username"/><input aria-label="Password" value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password"/><button disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in to planner'}</button>{error && <p role="alert">{error}</p>}</form></div><img src={couplePhoto} alt="Sumit and Puja in their wedding outfits"/></section></main>;
}

export default function App() {
  const [page, setPage] = useState('Today');
  const [tasks, setTasks] = useState<UiTask[]>([]);
  const [draft, setDraft] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState('');
  const days = useMemo(daysUntilWedding, []);
  const guestView = page === 'Guest page';
  const load = async () => { const remote = await api.tasks(); setTasks(remote.map(t => ({ id:t.id, text:t.title, meta:t.assignee_name ?? 'Shared family task', done:t.status === 'done' }))); };
  useEffect(() => { api.me().then(() => { setSignedIn(true); load(); }).catch(() => undefined); }, []);
  const addTask = async () => { if (draft.trim()) { try { await api.addTask(draft.trim()); setDraft(''); await load(); } catch (e) { setError((e as Error).message); } } };
  const toggleTask = async (task: UiTask) => { try { await api.updateTask(task.id, task.done ? 'open' : 'done'); await load(); } catch (e) { setError((e as Error).message); } };
  if (guestView) return <InvitePage onBack={() => setPage('Today')} />;
  if (!signedIn) return <Login onSignedIn={async () => { setSignedIn(true); await load(); }} error={error} setError={setError} />;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="side-brand"><span className="mini-rangoli">✦</span><span>SUMIT &amp; PUJA</span></div>
      <nav>{nav.map(item => <button key={item} className={page === item ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item)}>{item === 'Today' && <span className="nav-dot" />}{item}</button>)}</nav>
      <div className="side-footer"><span>Wedding week</span><strong>28 Nov — 3 Dec</strong></div>
    </aside>
    <main className="workspace">
      <section className="hero"><div className="hero-copy"><p className="eyebrow">Our wedding planner</p><h1>Sumit <em>&amp;</em> Puja</h1><p className="hero-sub">Five beautiful days. One shared place to make every detail feel easy.</p><div className="hero-actions"><button className="ghost-button" onClick={() => setPage('Events')}><CalendarDays size={17}/> View celebrations</button><button className="ghost-button" onClick={() => setPage('Guest page')}>Guest page <ChevronRight size={16}/></button></div></div><div className="hero-art"><img src={couplePhoto} alt="Sumit and Puja in their wedding outfits" /></div></section>
      <div className="mobile-nav">{nav.map(item => <button key={item} onClick={() => setPage(item)} className={page === item ? 'selected' : ''}>{item}</button>)}</div>
      {page === 'Today' ? <Dashboard days={days} tasks={tasks} draft={draft} setDraft={setDraft} addTask={addTask} toggleTask={toggleTask} /> : <Section page={page} />}
    </main>
  </div>;
}

function Dashboard({ days, tasks, draft, setDraft, addTask, toggleTask }: { days: number; tasks: UiTask[]; draft: string; setDraft: React.Dispatch<React.SetStateAction<string>>; addTask: () => void; toggleTask: (task: UiTask) => void }) {
  return <><section className="overview"><div><p className="eyebrow ink">Today’s focus</p><h2>Little steps, beautifully held.</h2><p className="muted">Keep the important things moving, one shared update at a time.</p></div><div className="countdown"><span>Days to the wedding</span><strong>{days}</strong><small>1 December 2026</small></div></section>
    <section className="section-head"><div><p className="eyebrow ink">The celebrations</p><h2>Save these dates</h2></div><button className="text-button">See all details <ChevronRight size={16}/></button></section>
    <div className="event-strip">{events.map(event => <article key={event.title} className={`event-card ${event.accent}`}><div className="event-top"><span className="event-date"><b>{event.date}</b>{event.day}</span><span className="event-icon"><EventIcon kind={event.icon} label={event.title} /></span></div><h3>{event.title}</h3><p>{event.note}</p></article>)}</div>
    <section className="planning-grid"><div className="task-panel"><div className="section-head compact"><div><p className="eyebrow ink">Planning together</p><h2>What needs love</h2></div><button className="add-button" onClick={() => document.getElementById('new-task')?.focus()}><Plus size={17}/> Add task</button></div><div className="task-input"><input id="new-task" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="Add something to remember…"/><button onClick={addTask} aria-label="Add task"><Plus size={18}/></button></div><div className="task-list">{tasks.map(task => <label className={task.done ? 'task done' : 'task'} key={task.id}><input type="checkbox" checked={task.done} onChange={() => toggleTask(task)}/><span className="check"/><span><strong>{task.text}</strong><small>{task.meta}</small></span></label>)}</div></div>
      <aside className="right-rail"><div className="quick-card"><p className="eyebrow">Family pulse</p><div className="avatars"><span>SK</span><span>PK</span><span>AM</span><span>+4</span></div><h3>Everyone can pitch in.</h3><p>Share a task, a detail, or a decision. Every update is kept in one place.</p><button>Invite family <ChevronRight size={16}/></button></div><div className="quick-links"><button><UsersRound size={18}/><span><strong>Guests & RSVPs</strong><small>Start your family list</small></span><ChevronRight size={16}/></button><button><CircleDollarSign size={18}/><span><strong>Budget & vendors</strong><small>Keep every booking clear</small></span><ChevronRight size={16}/></button></div></aside></section></>;
}

function Section({ page }: { page: string }) { return <section className="placeholder-page"><p className="eyebrow ink">{page}</p><h2>{page === 'Events' ? 'Every celebration, in one rhythm.' : `${page}, beautifully organised.`}</h2><p>This section is ready for your family’s details. For now, use Today to add shared tasks and open the guest page preview.</p>{page === 'Events' && <div className="event-list">{events.map(e => <div key={e.title}><EventIcon kind={e.icon} label={e.title}/><span><strong>{e.title}</strong><small>{e.day} {e.date}, 2026 · {e.note}</small></span></div>)}</div>}</section>; }

function InvitePage({ onBack }: { onBack: () => void }) { return <div className="invite"><header><button onClick={onBack}>← Planner</button><span>SUMIT &amp; PUJA</span></header><section className="invite-hero"><div><p className="eyebrow">With the blessings of our families</p><h1>Sumit <em>&amp;</em> Puja</h1><p>Invite you to celebrate a new beginning.</p><button><MapPin size={17}/> Venue details coming soon</button></div><img src={couplePhoto} alt="Sumit and Puja in their wedding outfits"/></section><section className="invite-events"><p className="eyebrow ink">The celebrations</p><h2>Come celebrate with us</h2><div>{events.map(e => <article key={e.title}><span className="event-icon"><EventIcon kind={e.icon} label={e.title}/></span><span><strong>{e.title}</strong><small>{e.date} {e.day} · {e.note}</small></span></article>)}</div><a href="https://wa.me/" target="_blank">Questions? Message the family on WhatsApp</a></section></div>; }
