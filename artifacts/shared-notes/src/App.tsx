import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BellRing,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Circle,
  Clock3,
  Copy,
  FileText,
  Inbox,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  getGetGroupQueryKey,
  getGetNoteQueryKey,
  getGetNotesSummaryQueryKey,
  getHealthCheckQueryKey,
  getListGroupsQueryKey,
  getListNotesQueryKey,
  useCreateGroup,
  useCreateNote,
  useDeleteNote,
  useGetGroup,
  useGetNote,
  useGetNotesSummary,
  useHealthCheck,
  useInviteToGroup,
  useListGroups,
  useListNotes,
  useRegisterPushToken,
  useRemoveGroupMember,
  useRequestAuthCode,
  useToggleNoteDone,
  useUnregisterPushToken,
  useUpdateNote,
  useVerifyAuthCode,
  type Group,
  type Note,
  type User,
} from '@workspace/api-client-react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();
const TOKEN_KEY = 'shared-notes-token';
const USER_KEY = 'shared-notes-user';

type AuthRequest = { headers: { Authorization: string } };

function getStoredUser(): User | null {
  try {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date);
}

function initials(email: string) {
  return email
    .split('@')[0]
    .split(/[._-]/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function apiError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message.replace(/^HTTP \d+ [^:]+:\s*/, '') : fallback;
}

function App() {
  const [session, setSession] = useState<User | null>(getStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const authRequest: AuthRequest | undefined = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined;

  function onSignedIn(nextToken: string, user: User) {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setToken(nextToken);
    setSession(user);
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken('');
    setSession(null);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ErrorBoundary resetKey={session?.id ?? 'signed-out'}>
            {!session ? (
              <AuthScreen onSignedIn={onSignedIn} />
            ) : (
              <Workspace user={session} authRequest={authRequest} onSignOut={signOut} />
            )}
          </ErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthScreen({ onSignedIn }: { onSignedIn: (token: string, user: User) => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState('');
  const requestCode = useRequestAuthCode();
  const verifyCode = useVerifyAuthCode();
  const health = useHealthCheck({ query: { staleTime: 60000, queryKey: getHealthCheckQueryKey() } });

  function requestLogin(event: FormEvent) {
    event.preventDefault();
    setError('');
    requestCode.mutate(
      { data: { email: email.trim() } },
      {
        onSuccess: () => setStep('code'),
        onError: (err) => setError(apiError(err, 'We could not send a code. Try again in a moment.')),
      },
    );
  }

  function verifyLogin(event: FormEvent) {
    event.preventDefault();
    setError('');
    verifyCode.mutate(
      { data: { email: email.trim(), code } },
      {
        onSuccess: (response) => onSignedIn(response.token, response.user),
        onError: (err) => setError(apiError(err, 'That code did not work. Check it and try again.')),
      },
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand-mark large"><span className="brand-dot" /><span>kindred</span></div>
        <div className="auth-story-copy">
          <p className="eyebrow">A little room for real life</p>
          <h1>Keep the small things <em>together.</em></h1>
          <p className="story-lede">
            A quiet place for the thoughts that become plans: the errand, the idea, the “don’t forget” you share with your people.
          </p>
        </div>
        <div className="orbit-card">
          <div className="orbit-label"><span className="live-dot" /> your shared orbit</div>
          <div className="orbit-lines">
            <div className="orbit-line"><span className="orbit-avatar avatar-saffron">M</span><div><strong>Pick up the good bread</strong><small>Kitchen · today</small></div><CheckCircle2 size={18} /></div>
            <div className="orbit-line"><span className="orbit-avatar avatar-coral">R</span><div><strong>Call the electrician</strong><small>House things · Thursday</small></div><Circle size={18} /></div>
          </div>
          <div className="orbit-footer"><span>2 people</span><span>·</span><span>1 open task</span></div>
        </div>
        <div className="story-footnote"><ShieldCheck size={15} /> No passwords to remember. Ever.</div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="mobile-brand"><div className="brand-mark"><span className="brand-dot" /><span>kindred</span></div></div>
          <div className="auth-heading">
            <p className="eyebrow">{step === 'email' ? 'Welcome back' : 'One small step'}</p>
            <h2>{step === 'email' ? 'What are you carrying?' : 'Check your inbox.'}</h2>
            <p>{step === 'email' ? 'Sign in with a one-time code. Your notes will be right where you left them.' : <>We sent a six-digit code to <strong>{email}</strong>.</>}</p>
          </div>
          {step === 'email' ? (
            <form onSubmit={requestLogin} className="auth-form">
              <label htmlFor="email">Email address</label>
              <div className="input-with-icon"><Mail size={18} /><input id="email" data-testid="input-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
              <button className="button button-primary button-wide" data-testid="button-send-code" type="submit" disabled={requestCode.isPending}>
                {requestCode.isPending ? 'Sending your code…' : 'Send me a code'} <ArrowUpRight size={17} />
              </button>
            </form>
          ) : (
            <form onSubmit={verifyLogin} className="auth-form">
              <label htmlFor="code">Your six-digit code</label>
              <input id="code" data-testid="input-code" className="code-input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" autoFocus required />
              <button className="button button-primary button-wide" data-testid="button-verify-code" type="submit" disabled={verifyCode.isPending || code.length !== 6}>
                {verifyCode.isPending ? 'Opening your space…' : 'Open kindred'} <ArrowUpRight size={17} />
              </button>
              <button className="text-button" data-testid="button-change-email" type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }}>Use a different email</button>
            </form>
          )}
          {error && <div className="inline-error" data-testid="status-auth-error">{error}</div>}
          <div className="service-note"><span className={health.data?.ok ? 'service-ok' : 'service-muted'} /> {health.data?.ok ? 'All systems are ready.' : 'Taking a little longer than usual?'}</div>
        </div>
      </section>
    </main>
  );
}

function Workspace({ user, authRequest, onSignOut }: { user: User; authRequest?: AuthRequest; onSignOut: () => void }) {
  const [location] = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(() => localStorage.getItem('shared-notes-notifications') === 'on');
  const registerPush = useRegisterPushToken({ request: authRequest });
  const unregisterPush = useUnregisterPushToken({ request: authRequest });
  const pushToken = localStorage.getItem('shared-notes-push-token') ?? `web-${user.id}`;

  function toggleNotifications() {
    if (notificationsOn) {
      unregisterPush.mutate({ data: { expoPushToken: pushToken } }, { onSuccess: () => { localStorage.removeItem('shared-notes-notifications'); setNotificationsOn(false); } });
    } else {
      registerPush.mutate({ data: { expoPushToken: pushToken, platform: 'web' } }, { onSuccess: () => { localStorage.setItem('shared-notes-notifications', 'on'); localStorage.setItem('shared-notes-push-token', pushToken); setNotificationsOn(true); } });
    }
  }

  const isGroups = location === '/groups';
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <Link href="/" className="brand-mark" data-testid="link-brand"><span className="brand-dot" /><span>kindred</span></Link>
          <button className="mobile-close" data-testid="button-close-nav" onClick={() => setMobileNav(false)}><X size={19} /></button>
          <p className="sidebar-caption">a shared space<br />for everyday life</p>
          <nav className="main-nav">
            <Link href="/" onClick={() => setMobileNav(false)} className={!isGroups ? 'nav-item active' : 'nav-item'} data-testid="link-notes"><Inbox size={18} /> Notes <span className="nav-kicker">⌘ 1</span></Link>
            <Link href="/groups" onClick={() => setMobileNav(false)} className={isGroups ? 'nav-item active' : 'nav-item'} data-testid="link-groups"><Users size={18} /> Groups <span className="nav-kicker">⌘ 2</span></Link>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-rule" />
          <button className="sidebar-profile" data-testid="button-profile-menu" onClick={toggleNotifications}>
            <span className="avatar avatar-saffron">{initials(user.email)}</span>
            <span className="profile-copy"><strong>{user.email.split('@')[0]}</strong><small>{notificationsOn ? 'Reminders on' : 'Reminders off'}</small></span>
            <Settings2 size={16} />
          </button>
          <button className="sidebar-logout" data-testid="button-sign-out" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      {mobileNav && <button className="nav-scrim" data-testid="button-nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" data-testid="button-open-nav" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="topbar-context">{isGroups ? 'Your circles' : 'Your notes'}</div>
          <div className="topbar-right"><span className="sync-status"><span className="live-dot" /> saved just now</span><span className="topbar-avatar">{initials(user.email)}</span></div>
        </header>
        <Switch>
          <Route path="/" component={() => <NotesHome user={user} authRequest={authRequest} />} />
          <Route path="/groups" component={() => <GroupsPage user={user} authRequest={authRequest} />} />
          <Route path="/notes/:id" component={() => <NoteDetail authRequest={authRequest} />} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function PageIntro({ children, eyebrow, title, detail, action }: { children?: ReactNode; eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-detail">{detail}</p></div>{action && <div className="intro-action">{action}</div>}{children}</div>;
}

function NotesHome({ user, authRequest }: { user: User; authRequest?: AuthRequest }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const notesQuery = useListNotes({ request: authRequest });
  const summaryQuery = useGetNotesSummary({ request: authRequest });
  const groupsQuery = useListGroups({ request: authRequest });
  const createNote = useCreateNote({ request: authRequest });
  const toggleDone = useToggleNoteDone({ request: authRequest });
  const [filter, setFilter] = useState<'all' | 'open' | 'urgent' | 'done'>('all');
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const notes = notesQuery.data ?? [];
  const visibleNotes = useMemo(() => notes.filter((note) => {
    const matchesFilter = filter === 'all' || (filter === 'open' && !note.isDone) || (filter === 'urgent' && note.isUrgent && !note.isDone) || (filter === 'done' && note.isDone);
    const query = search.toLowerCase();
    return matchesFilter && (!query || `${note.title ?? ''} ${note.body} ${note.groupName ?? ''}`.toLowerCase().includes(query));
  }), [filter, notes, search]);
  const openNotes = notes.filter((note) => !note.isDone);
  const pinned = openNotes.find((note) => note.isUrgent) ?? openNotes[0];

  function refreshLists() {
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() });
  }

  function submitNote(data: { body: string; title: string; groupId: string | null; isUrgent: boolean; remindAt: string | null }) {
    createNote.mutate({ data }, {
      onSuccess: (note) => { refreshLists(); setComposerOpen(false); setNotice('Note tucked away.'); setTimeout(() => setNotice(''), 2600); setLocation(`/notes/${note.id}`); },
      onError: (err) => setNotice(apiError(err, 'Could not save that note.')),
    });
  }

  function complete(note: Note) {
    toggleDone.mutate({ id: note.id }, {
      onSuccess: () => { refreshLists(); setNotice(note.isDone ? 'Back on your list.' : 'That is one less thing.'); setTimeout(() => setNotice(''), 2400); },
      onError: () => setNotice('Could not update this note.'),
    });
  }

  return (
    <div className="page-wrap">
      <PageIntro eyebrow={`Good to see you, ${user.email.split('@')[0]}`} title="Make room for the thought." detail="Capture it now. Decide what it becomes later." action={<button className="button button-primary" data-testid="button-new-note" onClick={() => setComposerOpen(true)}><Plus size={18} /> New note</button>} />
      <div className="stats-row">
        <div className="stat-card stat-featured"><span className="stat-label">open notes</span><strong data-testid="text-open-count">{summaryQuery.data?.open ?? openNotes.length}</strong><span className="stat-trend">things still in motion</span></div>
        <div className="stat-card"><span className="stat-label">completed</span><strong data-testid="text-completed-count">{summaryQuery.data?.completed ?? notes.filter((note) => note.isDone).length}</strong><span className="stat-trend">good work, quietly done</span></div>
        <div className="stat-card"><span className="stat-label">coming up</span><strong data-testid="text-reminder-count">{summaryQuery.data?.upcomingReminders ?? 0}</strong><span className="stat-trend">reminders to keep close</span></div>
      </div>
      <div className="workspace-grid">
        <section className="notes-section">
          <div className="section-heading"><div><p className="eyebrow">The running list</p><h2>Notes <span>{notes.length}</span></h2></div><div className="note-tools"><div className="search-box"><Search size={16} /><input data-testid="input-search-notes" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" /></div><button className="icon-button" data-testid="button-filter-notes" onClick={() => setFilter(filter === 'all' ? 'open' : 'all')} title="Toggle open notes"><Archive size={17} /></button></div></div>
          <div className="filter-row">{(['all', 'open', 'urgent', 'done'] as const).map((name) => <button key={name} data-testid={`button-filter-${name}`} className={`filter-chip ${filter === name ? 'selected' : ''}`} onClick={() => setFilter(name)}>{name === 'all' ? 'Everything' : name === 'done' ? 'Completed' : name[0].toUpperCase() + name.slice(1)}{name === 'urgent' && <span className="filter-count">{notes.filter((note) => note.isUrgent && !note.isDone).length}</span>}</button>)}</div>
          {notesQuery.isLoading ? <NoteSkeletons /> : notesQuery.error ? <ErrorState message={apiError(notesQuery.error, 'Notes could not be loaded.')} onRetry={() => notesQuery.refetch()} /> : visibleNotes.length === 0 ? <EmptyNotes search={search} onCreate={() => setComposerOpen(true)} /> : <div className="note-list">{visibleNotes.map((note) => <NoteRow key={note.id} note={note} onToggle={() => complete(note)} onOpen={() => setLocation(`/notes/${note.id}`)} pending={toggleDone.isPending} />)}</div>}
        </section>
        <aside className="right-rail">
          <div className="focus-card">
            <div className="focus-top"><span className="eyebrow">A gentle nudge</span><Sparkles size={17} /></div>
            {pinned ? <><h3>{pinned.title || 'Untitled thought'}</h3><p>{pinned.body}</p><div className="focus-meta"><span className="mini-avatar">{initials(user.email)}</span><span>{pinned.groupName || 'Just yours'}</span>{pinned.isUrgent && <span className="urgent-label">urgent</span>}</div><button className="focus-link" data-testid={`button-focus-${pinned.id}`} onClick={() => setLocation(`/notes/${pinned.id}`)}>Open note <ArrowUpRight size={15} /></button></> : <><h3>Nothing pressing.</h3><p>Make a note when the next little thing arrives.</p><button className="focus-link" data-testid="button-focus-create" onClick={() => setComposerOpen(true)}>Start a note <Plus size={15} /></button></>}
          </div>
          <div className="groups-mini"><div className="mini-heading"><span className="eyebrow">Your circles</span><Link href="/groups" data-testid="link-see-groups">See all <ArrowUpRight size={13} /></Link></div>{groupsQuery.isLoading ? <div className="mini-loading" /> : groupsQuery.data?.length ? groupsQuery.data.slice(0, 3).map((group) => <Link href="/groups" className="group-mini-row" key={group.id} data-testid={`link-group-${group.id}`}><span className="group-token">{group.name.slice(0, 1).toUpperCase()}</span><span>{group.name}</span><small>{group.members.length} {group.members.length === 1 ? 'person' : 'people'}</small></Link>) : <p className="mini-empty">Create a circle for the people you trust.</p>}</div>
        </aside>
      </div>
      {composerOpen && <NoteComposer groups={groupsQuery.data ?? []} onClose={() => setComposerOpen(false)} onSubmit={submitNote} pending={createNote.isPending} />}
      {notice && <div className="toast-note" data-testid="status-note-action"><Check size={16} /> {notice}</div>}
    </div>
  );
}

function NoteRow({ note, onToggle, onOpen, pending }: { note: Note; onToggle: () => void; onOpen: () => void; pending: boolean }) {
  return <article className={`note-row ${note.isDone ? 'note-done' : ''}`} data-testid={`row-note-${note.id}`}><button className={`check-button ${note.isDone ? 'checked' : ''}`} data-testid={`button-toggle-note-${note.id}`} onClick={onToggle} disabled={pending} aria-label={note.isDone ? 'Mark note open' : 'Mark note complete'}>{note.isDone && <Check size={14} />}</button><button className="note-row-content" data-testid={`button-open-note-${note.id}`} onClick={onOpen}><div className="note-row-heading"><h3>{note.title || note.body.slice(0, 48)}</h3>{note.isUrgent && <span className="urgent-label">urgent</span>}</div><p>{note.title ? note.body : note.body.slice(48)}</p><div className="note-row-meta">{note.groupName ? <span className="group-pill"><Users size={12} /> {note.groupName}</span> : <span><BookOpen size={12} /> personal</span>}<span>{formatDate(note.updatedAt || note.createdAt, true)}</span>{note.remindAt && !note.isDone && <span className="reminder-pill"><Bell size={12} /> {formatDate(note.remindAt, true)}</span>}</div></button><button className="row-arrow" data-testid={`button-open-note-arrow-${note.id}`} onClick={onOpen}><ArrowUpRight size={16} /></button></article>;
}

function NoteSkeletons() {
  return <div className="note-list">{[1, 2, 3].map((item) => <div className="note-skeleton" key={item}><span /><div><i /><i /><i /></div></div>)}</div>;
}

function EmptyNotes({ search, onCreate }: { search: string; onCreate: () => void }) {
  return <div className="empty-state"><div className="empty-illustration"><FileText size={26} /><span /><span /></div><h3>{search ? 'No notes found.' : 'A clear page is a good beginning.'}</h3><p>{search ? 'Try another phrase or clear your search.' : 'Put the first thought somewhere safe. It does not need to be important yet.'}</p>{!search && <button className="button button-secondary" data-testid="button-empty-create-note" onClick={onCreate}><Plus size={16} /> Write a note</button>}</div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="error-state"><div className="error-icon">!</div><h3>That did not come through.</h3><p data-testid="status-query-error">{message}</p><button className="button button-secondary" data-testid="button-retry" onClick={onRetry}>Try again</button></div>;
}

function NoteComposer({ groups, onClose, onSubmit, pending }: { groups: Group[]; onClose: () => void; onSubmit: (data: { body: string; title: string; groupId: string | null; isUrgent: boolean; remindAt: string | null }) => void; pending: boolean }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [groupId, setGroupId] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [remindAt, setRemindAt] = useState('');
  return <div className="modal-layer"><button className="modal-scrim" data-testid="button-close-composer-scrim" onClick={onClose} aria-label="Close note composer" /><section className="composer-modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">New note</p><h2>What is on your mind?</h2></div><button className="icon-button" data-testid="button-close-composer" onClick={onClose}><X size={18} /></button></div><input className="composer-title" data-testid="input-note-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A short title, if it helps" maxLength={200} /><textarea className="composer-body" data-testid="input-note-body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Start with the thought in its own words…" autoFocus /><div className="composer-options"><label className="select-label">Share with<select data-testid="select-note-group" value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Just me</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><label className="select-label">Remind me<input data-testid="input-note-reminder" type="datetime-local" value={remindAt} onChange={(event) => setRemindAt(event.target.value)} /></label></div><div className="composer-footer"><button className={`toggle-option ${urgent ? 'on' : ''}`} data-testid="button-toggle-urgent" onClick={() => setUrgent(!urgent)}><span className="toggle-dot" /> Mark as urgent</button><button className="button button-primary" data-testid="button-save-note" disabled={!body.trim() || pending} onClick={() => onSubmit({ title: title.trim(), body: body.trim(), groupId: groupId || null, isUrgent: urgent, remindAt: remindAt ? new Date(remindAt).toISOString() : null })}>{pending ? 'Saving…' : 'Save note'} <ArrowUpRight size={16} /></button></div></section></div>;
}

function GroupsPage({ user, authRequest }: { user: User; authRequest?: AuthRequest }) {
  const queryClient = useQueryClient();
  const groupsQuery = useListGroups({ request: authRequest });
  const createGroup = useCreateGroup({ request: authRequest });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const groups = groupsQuery.data ?? [];
  useEffect(() => { if (!selectedId && groups[0]) setSelectedId(groups[0].id); }, [groups, selectedId]);
  const selected = groups.find((group) => group.id === selectedId) ?? groups[0];
  const detailQuery = useGetGroup(selected?.id ?? '', { query: { enabled: !!selected?.id, queryKey: getGetGroupQueryKey(selected?.id ?? '') }, request: authRequest });
  const group = detailQuery.data ?? selected;

  function create() {
    if (!groupName.trim()) return;
    createGroup.mutate({ data: { name: groupName.trim() } }, { onSuccess: (newGroup) => { queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }); setSelectedId(newGroup.id); setGroupName(''); setCreateOpen(false); } });
  }
  return <div className="page-wrap groups-page"><PageIntro eyebrow="The people you trust" title="Your circles." detail="Keep the useful things close to the people they belong with." action={<button className="button button-primary" data-testid="button-new-group" onClick={() => setCreateOpen(true)}><Plus size={18} /> New group</button>} /><div className="groups-layout"><section className="group-list-panel"><div className="panel-heading"><span className="eyebrow">Circles</span><span className="count-badge">{groups.length}</span></div>{groupsQuery.isLoading ? <div className="group-skeletons"><i /><i /><i /></div> : groupsQuery.error ? <ErrorState message={apiError(groupsQuery.error, 'Groups could not be loaded.')} onRetry={() => groupsQuery.refetch()} /> : groups.length === 0 ? <div className="group-empty"><Users size={24} /><h3>No circles yet.</h3><p>Bring a few trusted people into the loop.</p><button className="button button-secondary" data-testid="button-empty-create-group" onClick={() => setCreateOpen(true)}><Plus size={15} /> Start a group</button></div> : <div className="group-list">{groups.map((item) => <button key={item.id} className={`group-list-item ${item.id === group?.id ? 'selected' : ''}`} data-testid={`button-select-group-${item.id}`} onClick={() => setSelectedId(item.id)}><span className="group-token">{item.name.slice(0, 1).toUpperCase()}</span><span className="group-item-copy"><strong>{item.name}</strong><small>{item.members.length} {item.members.length === 1 ? 'member' : 'members'}</small></span><ChevronLeft size={16} /></button>)}</div>}</section>{group ? <GroupDetail key={group.id} group={group} user={user} authRequest={authRequest} /> : <div className="group-detail-panel group-detail-empty"><div className="empty-illustration"><Users size={25} /></div><h3>Your people, in one place.</h3><p>Choose a circle or create one to start sharing.</p></div>}</div>{createOpen && <div className="modal-layer"><button className="modal-scrim" data-testid="button-close-group-scrim" onClick={() => setCreateOpen(false)} aria-label="Close" /><section className="small-modal" role="dialog"><div className="modal-heading"><div><p className="eyebrow">New circle</p><h2>Who is in your orbit?</h2></div><button className="icon-button" data-testid="button-close-group" onClick={() => setCreateOpen(false)}><X size={18} /></button></div><p className="modal-copy">A name is enough for now. You can invite people next.</p><input data-testid="input-group-name" value={groupName} onChange={(event) => setGroupName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && create()} placeholder="e.g. The house, Weekend crew" autoFocus /><button className="button button-primary button-wide" data-testid="button-create-group" disabled={!groupName.trim() || createGroup.isPending} onClick={create}>{createGroup.isPending ? 'Making space…' : 'Create circle'} <ArrowUpRight size={16} /></button></section></div>}</div>;
}

function GroupDetail({ group, user, authRequest }: { group: Group; user: User; authRequest?: AuthRequest }) {
  const queryClient = useQueryClient();
  const invite = useInviteToGroup({ request: authRequest });
  const removeMember = useRemoveGroupMember({ request: authRequest });
  const [inviteEmail, setInviteEmail] = useState('');
  const [message, setMessage] = useState('');
  const isAdmin = group.createdByUserId === user.id || group.members.some((member) => member.userId === user.id && member.role === 'admin');
  function invitePerson() {
    if (!inviteEmail.trim()) return;
    invite.mutate({ id: group.id, data: { email: inviteEmail.trim() } }, { onSuccess: (response) => { setMessage(response.message || `Invite sent to ${response.email}.`); setInviteEmail(''); queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(group.id) }); queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }); }, onError: (err) => setMessage(apiError(err, 'Could not send that invite.')) });
  }
  function leaveOrRemove(userId: string) {
    if (!window.confirm(userId === user.id ? `Leave ${group.name}?` : 'Remove this member from the circle?')) return;
    removeMember.mutate({ id: group.id, userId }, { onSuccess: () => { setMessage(userId === user.id ? 'You left the circle.' : 'Member removed.'); queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(group.id) }); queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }); }, onError: (err) => setMessage(apiError(err, 'Could not update membership.')) });
  }
  return <section className="group-detail-panel"><div className="group-detail-top"><div className="group-title-lockup"><span className="group-token large-token">{group.name.slice(0, 1).toUpperCase()}</span><div><p className="eyebrow">Shared circle</p><h2 data-testid="text-group-name">{group.name}</h2><span>Created {formatDate(group.createdAt)}</span></div></div><button className="icon-button" data-testid="button-group-options" title="Group options"><MoreHorizontal size={18} /></button></div><div className="invite-box"><div className="invite-copy"><UserPlus size={18} /><div><strong>Bring someone in</strong><span>They will get an email with a way in.</span></div></div><div className="invite-form"><input data-testid="input-invite-email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="friend@example.com" /><button className="button button-primary" data-testid="button-send-invite" disabled={!inviteEmail.trim() || invite.isPending} onClick={invitePerson}>{invite.isPending ? 'Sending…' : 'Invite'} <Send size={15} /></button></div>{message && <p className="action-message" data-testid="status-group-action"><Check size={14} /> {message}</p>}</div><div className="members-heading"><div><p className="eyebrow">Inside this circle</p><h3>{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</h3></div><span className="member-note">shared notes stay visible to everyone here</span></div><div className="member-list">{group.members.map((member) => <div className="member-row" key={member.userId} data-testid={`row-member-${member.userId}`}><span className="avatar avatar-coral">{initials(member.email)}</span><div><strong>{member.email}{member.userId === user.id && <span className="you-label">you</span>}</strong><small>{member.role === 'admin' ? 'Circle keeper' : 'Member'} · joined {formatDate(member.createdAt)}</small></div>{member.role === 'admin' && <span className="role-badge">admin</span>}{isAdmin && member.userId !== user.id && <button className="text-icon-button" data-testid={`button-remove-member-${member.userId}`} onClick={() => leaveOrRemove(member.userId)}><Trash2 size={15} /></button>}</div>)}</div><button className="leave-button" data-testid="button-leave-group" onClick={() => leaveOrRemove(user.id)}><LogOut size={15} /> Leave this circle</button></section>;
}

function NoteDetail({ authRequest }: { authRequest?: AuthRequest }) {
  const { id = '' } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const noteQuery = useGetNote(id, { query: { enabled: !!id, queryKey: getGetNoteQueryKey(id) }, request: authRequest });
  const updateNote = useUpdateNote({ request: authRequest });
  const deleteNote = useDeleteNote({ request: authRequest });
  const toggleDone = useToggleNoteDone({ request: authRequest });
  const groupsQuery = useListGroups({ request: authRequest });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const note = noteQuery.data;
  useEffect(() => { if (note) { setTitle(note.title ?? ''); setBody(note.body); setUrgent(note.isUrgent); setGroupId(note.groupId ?? ''); setRemindAt(note.remindAt ? new Date(note.remindAt).toISOString().slice(0, 16) : ''); setDirty(false); } }, [note]);
  function save() {
    updateNote.mutate({ id, data: { title: title.trim() || null, body: body.trim(), isUrgent: urgent, groupId: groupId || null, remindAt: remindAt ? new Date(remindAt).toISOString() : null } }, { onSuccess: (updated) => { queryClient.setQueryData(getGetNoteQueryKey(id), updated); queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() }); setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2200); }, onError: () => setSaved(false) });
  }
  function remove() {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    deleteNote.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() }); setLocation('/'); } });
  }
  if (noteQuery.isLoading) return <div className="page-wrap detail-loading"><NoteSkeletons /></div>;
  if (noteQuery.error || !note) return <div className="page-wrap"><ErrorState message={apiError(noteQuery.error, 'This note is not available.')} onRetry={() => noteQuery.refetch()} /></div>;
  return <div className="page-wrap detail-page"><div className="detail-toolbar"><button className="back-link" data-testid="button-back-notes" onClick={() => setLocation('/')}><ArrowLeft size={16} /> All notes</button><div className="detail-actions"><span className={saved ? 'save-state saved' : dirty ? 'save-state' : 'save-state'}>{saved ? <><Check size={14} /> Saved</> : dirty ? 'Unsaved changes' : `Updated ${formatDate(note.updatedAt, true)}`}</span><button className="icon-button danger-icon" data-testid="button-delete-note" onClick={remove} disabled={deleteNote.isPending}><Trash2 size={17} /></button><button className={`button ${note.isDone ? 'button-secondary' : 'button-primary'}`} data-testid="button-toggle-detail-done" onClick={() => toggleDone.mutate({ id }, { onSuccess: (updated) => { queryClient.setQueryData(getGetNoteQueryKey(id), updated); queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() }); } })} disabled={toggleDone.isPending}>{note.isDone ? <><Circle size={16} /> Reopen</> : <><CheckCircle2 size={16} /> Mark done</>}</button></div></div><div className="detail-layout"><article className="editor-card"><div className="editor-kicker"><span className="eyebrow">{groupId ? 'Shared note' : 'Personal note'}</span>{note.isDone && <span className="done-badge"><Check size={12} /> completed {note.completedByEmail ? `by ${note.completedByEmail.split('@')[0]}` : ''}</span>}</div><input className="detail-title" data-testid="input-detail-title" value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true); }} placeholder="Untitled note" /><textarea className="detail-body" data-testid="input-detail-body" value={body} onChange={(event) => { setBody(event.target.value); setDirty(true); }} /><div className="editor-footer"><span>{body.length} characters</span><button className="button button-primary" data-testid="button-save-detail" disabled={!dirty || !body.trim() || updateNote.isPending} onClick={save}>{updateNote.isPending ? 'Saving…' : 'Save changes'} <ArrowUpRight size={16} /></button></div></article><aside className="detail-sidebar"><div className="sidebar-card"><div className="detail-setting"><span><Users size={16} /> Share with</span><select data-testid="select-detail-group" value={groupId} onChange={(event) => { setGroupId(event.target.value); setDirty(true); }}><option value="">Just me</option>{(groupsQuery.data ?? []).map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></div><div className="detail-setting"><span><Bell size={16} /> Reminder</span><input data-testid="input-detail-reminder" type="datetime-local" value={remindAt} onChange={(event) => { setRemindAt(event.target.value); setDirty(true); }} /></div><button className={`setting-toggle ${urgent ? 'active' : ''}`} data-testid="button-detail-urgent" onClick={() => { setUrgent(!urgent); setDirty(true); }}><span className="toggle-switch"><span /></span><span><strong>Urgent note</strong><small>Keep it close to the top.</small></span></button></div><div className="detail-tip"><Sparkles size={16} /><p><strong>Small is enough.</strong><br />Notes can stay unfinished until they are ready to become something else.</p></div></aside></div></div>;
}

export default App;