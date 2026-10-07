
/* ===== 디자인팀 보드 (C): 이현성 + 디자이너. 팀 단위 오더 · 현황 · 마감 · 특이사항 · 완료 ===== */
// A·B 보드와 달리 두 사람 공유가 아니라 팀 운영용이라 화면을 따로 둔다. 데이터는 같은 items/comments 컬렉션(board 'C').
const TEAM_ISSUES = {blocked: '막힘', risk: '일정 위험', check: '확인 필요'};
const TEAM_ISSUE_HINT = {blocked: '진행이 멈춰 있어요', risk: '마감을 못 맞출 수 있어요', check: '확인이 필요해요'};
const TEAM_TABS = {status: '팀 현황', orders: '오더', due: '마감', issues: '확인 요청 및 특이사항', report: '오늘의 업무보고', done: '완료'};
const ASK_TYPES = {confirm: '확인 요청', need: '자료 필요', feedback: '피드백 요청'};
function normAsk(d) { return {id: d.id, ask_type: ASK_TYPES[d.ask_type] ? d.ask_type : 'confirm', title: String(d.title || ''), body: String(d.body || ''), from: String(d.from || ''), from_id: String(d.from_id || ''), to: String(d.to || '모두'), task_id: String(d.task_id || ''), task_title: String(d.task_title || ''), reply_by: DATE_RE.test(d.reply_by || '') ? d.reply_by : '', state: d.state === 'done' ? 'done' : 'open', done_by: String(d.done_by || ''), done_at: String(d.done_at || ''), answer: String(d.answer || ''), created_at: String(d.created_at || ''), updated_at: String(d.updated_at || '')}; }
function normReport(d) { return {id: d.id, seat: String(d.seat || ''), name: String(d.name || ''), day: String(d.day || ''), lines: (Array.isArray(d.lines) ? d.lines : []).filter(l => l && String(l.text || '').trim()).map((l, i) => ({id: String(l.id || 'r' + i), text: String(l.text), task_id: String(l.task_id || ''), task_title: String(l.task_title || ''), check_id: String(l.check_id || ''), pct: l.pct === null || l.pct === undefined || l.pct === '' ? null : Math.max(0, Math.min(100, Math.round(Number(l.pct) || 0)))})), note: String(d.note || ''), next: String(d.next || ''), links: teamLinks(d.links), updated_at: String(d.updated_at || '')}; }
const teamDesigners = () => SEATS.filter(s => s.name !== ADMIN_NAME);
const teamJoint = () => teamDesigners().map(s => s.name).join('·');
// 담당: 디자이너 이름 | '함께'(디자이너 모두) | ''(미배정)
const teamWho = a => { const l = teamList(a); return !l.length ? '미배정' : l.length === teamNames().length ? '셋 다' : l.join('·'); };
// '모두' = 셋 다(이현성 포함), '함께' = 예전 값(디자이너 둘)
const teamNames = () => SEATS.map(s => s.name);
// 담당은 여러 명 가능: '이현성·강승연'처럼 이름을 '·'로 잇고, 셋 다면 '모두'. 예전 값 '함께'는 디자이너 둘.
const teamList = a => a === '모두' ? teamNames() : a === '함께' ? teamDesigners().map(s => s.name) : String(a || '').split('·').map(t => t.trim()).filter(Boolean);
const teamEncode = list => { const all = teamNames(), set = new Set(list), ord = all.filter(n => set.has(n)); return ord.length === all.length ? '모두' : ord.join('·'); };
const teamToggle = (a, v) => v === '' ? '' : v === '모두' ? (teamList(a).length === teamNames().length ? '' : '모두') : (l => teamEncode(l.includes(v) ? l.filter(n => n !== v) : [...l, v]))(teamList(a));
const teamOn = (a, v) => v === '' ? !teamList(a).length : v === '모두' ? teamList(a).length === teamNames().length : teamList(a).includes(v);
const teamHas = (x, name) => teamList(x.assignee).includes(name);
const teamLinks = v => (Array.isArray(v) ? v : []).filter(l => l && isHttpUrl(String(l.url || ''))).slice(0, 20).map((l, i) => ({id: String(l.id || 'l' + i), label: String(l.label || '').slice(0, 80), url: String(l.url), shared_by: String(l.shared_by || ''), shared_at: String(l.shared_at || '')}));
const TEAM_URL_RE = /(https?:\/\/[^\s<>()"']+[^\s<>()"'.,!?;:])/g;
// 글 속 주소를 눌러 열 수 있게.
function TeamText({text, class: cls = ''}) { const parts = String(text || '').split(TEAM_URL_RE); return html`<p class=${cx('tb-text', cls)}>${parts.map((p, i) => i % 2 ? html`<a key=${i} href=${safeLink(p)} target="_blank" rel="noreferrer">${p}</a>` : p)}</p>`; }
const teamUrlsIn = text => [...String(text || '').matchAll(TEAM_URL_RE)].map(m => m[1]);
// 댓글 아래 확인 · 좋아요 버튼. 누른 사람 이름이 옆에 보인다.
function TeamMarks({c, me, onMark}) {
 if (!onMark) return null;
 const m = c.marks || {check: [], like: []}, mine = k => m[k].includes(me.name);
 const who = [m.check.length ? `확인 ${m.check.join(', ')}` : '', m.like.length ? `좋아요 ${m.like.join(', ')}` : ''].filter(Boolean).join(' · ');
 return html`<div class="tb-marks"><button type="button" class=${cx('tb-mark check', mine('check') && 'on')} title=${m.check.length ? `확인: ${m.check.join(', ')}` : '확인했어요'} onClick=${() => onMark(c, 'check')}>${I('Check', 12)}${m.check.length ? m.check.length : '확인'}</button><button type="button" class=${cx('tb-mark like', mine('like') && 'on')} title=${m.like.length ? `좋아요: ${m.like.join(', ')}` : '좋아요'} onClick=${() => onMark(c, 'like')}>${I('Heart', 12)}${m.like.length || ''}</button>${who && html`<small>${who}</small>`}</div>`;
}
// 프로필 사진: avatars 컬렉션(C~자리, board 'C')에 128px로 줄인 이미지를 저장한다.
function Av({name, mini = false, editable = false, onPick, busy = false}) {
 const url = teamAvatars.map[name] || '', inner = url ? html`<img src=${url} alt="" />` : String(name || '?').slice(0, 1);
 if (!editable) return html`<span class=${cx('avatar', mini && 'mini', url && 'has-img')}>${inner}</span>`;
 return html`<label class=${cx('avatar av-edit', mini && 'mini', url && 'has-img')} title="프로필 사진 바꾸기">${inner}<span class="av-cam">${I('Pencil', 11)}</span><input type="file" accept="image/*" hidden disabled=${busy} onChange=${e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) onPick(f); }} /></label>`;
}
function shrinkImage(file, size = 128) {
 return new Promise((resolve, reject) => {
  if (!/^image\//.test(file.type)) { reject(new Error('이미지 파일을 골라 주세요.')); return; }
  const r = new FileReader(); r.onerror = () => reject(new Error('파일을 읽지 못했어요.'));
  r.onload = () => { const img = new Image(); img.onerror = () => reject(new Error('이미지를 열지 못했어요.')); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d'), m = Math.min(img.width, img.height); ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size); resolve(c.toDataURL('image/jpeg', 0.85)); }; img.src = r.result; };
  r.readAsDataURL(file);
 });
}
function normTeam(d) {
 const b = normItem(d);
 return {...b, assignee: String(d.assignee || ''), topic_label: String(d.topic_label || ''), src_board: String(d.src_board || ''), src_id: String(d.src_id || ''), src_title: String(d.src_title || ''), issue: TEAM_ISSUES[d.issue] ? d.issue : '', issue_note: String(d.issue_note || ''), issue_at: String(d.issue_at || ''), issue_by: String(d.issue_by || ''), src_body: String(d.src_body || ''), src_checks: normChecklist(d.src_checks), src_links: teamLinks(d.src_links), src_synced_at: String(d.src_synced_at || ''), start_on: DATE_RE.test(d.start_on || '') ? d.start_on : '', spec: normChecklist(d.spec).map(c => ({id: c.id, text: c.text, done: c.done})), issue_log: (Array.isArray(d.issue_log) ? d.issue_log : []).filter(h => h && h.resolved_at).map(h => ({issue: TEAM_ISSUES[h.issue] ? h.issue : 'check', note: String(h.note || ''), by: String(h.by || ''), at: String(h.at || ''), resolved_by: String(h.resolved_by || ''), resolved_at: String(h.resolved_at), how: String(h.how || '')})), history: (Array.isArray(d.history) ? d.history : []).filter(h => h && h.at).map(h => ({at: String(h.at), by: String(h.by || ''), text: String(h.text || ''), kind: String(h.kind || ''), from: h.from === undefined ? null : String(h.from), to: h.to === undefined ? null : String(h.to), note: String(h.note || '')})), handoffs: (Array.isArray(d.handoffs) ? d.handoffs : []).filter(h => h && h.at).map(h => ({at: String(h.at), by: String(h.by || ''), from: String(h.from || ''), to: String(h.to || ''), note: String(h.note || '')})), out_links: (Array.isArray(d.out_links) ? d.out_links : []).filter(o => o && ['A', 'B'].includes(o.board) && o.id).map(o => ({board: o.board, id: String(o.id), at: String(o.at || '')})), link_vis: Array.isArray(d.link_vis) ? d.link_vis.filter(b => b === 'A' || b === 'B') : null};
}
const teamByDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || ({critical: 0, urgent: 1, share: 2}[a.priority] - {critical: 0, urgent: 1, share: 2}[b.priority]) || String(a.created_at || '').localeCompare(String(b.created_at || ''));
// 팀 현황 순서: 손으로 정한 순서(prio_no) 먼저, 나머지는 미배정 먼저 · 마감순.
// 순서: 아직 손으로 순서를 정하지 않은 업무(새로 만든 것 포함)가 맨 위, 최근 만든 것부터. 그 아래는 끌어서 정한 순서.
const teamOrder = (a, b) => (Number(!!a.prio_no) - Number(!!b.prio_no)) || (!a.prio_no ? String(b.created_at || '').localeCompare(String(a.created_at || '')) : a.prio_no - b.prio_no);
// 착수 예정: 예정 상태일 때만 의미가 있다.
const teamStartLabel = x => { if (!x.start_on || x.status !== 'todo') return ''; const n = Math.round((Date.parse(x.start_on + 'T00:00:00+09:00') - Date.parse(today() + 'T00:00:00+09:00')) / 864e5); return n < 0 ? `착수 ${-n}일 지남` : n === 0 ? '오늘 착수' : n === 1 ? '내일 착수' : `${shortDate(x.start_on)} 착수`; };
const teamLate = x => x.status !== 'done' && x.due && x.due < today();
function teamClock(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false}); }
function teamDay(d) { const t = today(); return d === t ? '오늘' : d === offsetDate(t, -1) ? '어제' : d === offsetDate(t, 1) ? '내일' : `${shortDate(d)} (${'일월화수목금토'[new Date(d + 'T12:00:00Z').getUTCDay()]})`; }
// A 원본에 남기는 C 진행 상황(이현성만 A에 쓸 수 있다).
const teamLinkOf = x => ({id: x.id, status: x.status, progress: x.progress || 0, assignee: teamWho(x.assignee), due: x.due || '', issue: x.issue || '', at: x.updated_at || nowIso()});
// A·B로 보낼 때 문서가 놓일 보드: 이현성 혼자 업무로 A에 보내면 A·B 공통('all'), 그 밖에는 고른 보드(A·B 보드에서 만드는 규칙과 같다).
const sendBoardOf = (board, who) => who === 'me' && board === 'A' ? 'all' : board;
const boardsSeen = b => b === 'all' ? ['A', 'B'] : [b];
// 이 C 업무가 이미 보이는 보드: 연결 맞추기가 적어 둔 link_vis, 아직 없으면 연결 정보로 짐작.
const linkVisOf = x => x.link_vis || [...new Set([...((x.src_board === 'A' || x.src_board === 'B') && x.src_id ? [x.src_board] : []), ...x.out_links.map(o => o.board)])];

function TeamBoard() {
 const meKey = window.PS_SEAT || '', me = {id: meKey, name: (SEATS.find(s => s.key === meKey) || {}).name || ''};
 const isAdmin = me.name === ADMIN_NAME;
 const [asks, setAsks] = useState([]), [reports, setReports] = useState([]), [avatars, setAvatars] = useState({}), [meet, setMeet] = useState(null);
 teamAvatars.map = avatars;
 const [db, setDb] = useState(null), [items, setItems] = useState([]), [comments, setComments] = useState([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
 const [tab, setTab] = useState(() => { let v = 'status'; try { v = localStorage.getItem('ps.teamTab') || 'status'; } catch {} return TEAM_TABS[v] ? v : 'status'; });
 const [stab, setStab] = useState(() => { try { return localStorage.getItem('ps.teamStatusTab') || 'doing'; } catch { return 'doing'; } });
 const pickStab = v => { setStab(v); try { localStorage.setItem('ps.teamStatusTab', v); } catch {} };
 const [handoff, setHandoff] = useState(null), [sel, setSel] = useState(null), [importOpen, setImportOpen] = useState(false), [who, setWho] = useState('all'), [menu, setMenu] = useState(false);
 useEffect(() => { try { localStorage.setItem('ps.teamTab', tab); } catch {} }, [tab]);
 useEffect(() => {
  let un = [], dead = false;
  (async () => {
   const d = await useCapability('db'); if (dead || !d) return; setDb(d);
   un.push(d.collection('items').onSnapshot(s => { const raw = s.docs.map(x => ({id: x.id, ...x.data()})); setItems(raw.filter(x => x.kind === 'task').map(normTeam)); setAsks(raw.filter(x => x.team_type === 'ask').map(normAsk)); setReports(raw.filter(x => x.team_type === 'report').map(normReport)); setMeet(raw.find(x => x.id === 'C-meet-lhs' && x.team_type === 'meeting') || null); setLoading(false); }, e => { console.error('team items', e); setLoading(false); toast.error(friendlyError(e)); }));
   un.push(d.collection('avatars').onSnapshot(s => { const m = {}; s.docs.forEach(x => { const v = x.data() || {}; if (v.name && v.url) m[v.name] = v.url; }); setAvatars(m); }, e => console.error('team avatars', e)));
   un.push(d.collection('comments').onSnapshot(s => setComments(s.docs.map(x => { const v = x.data() || {}; return {...normComment({id: x.id, ...v}), marks: normMarks(v.marks)}; })), e => console.error('team comments', e)));
  })();
  return () => { dead = true; un.forEach(f => { try { f(); } catch {} }); };
 }, []);
 const stamp = () => ({updated_at: nowIso(), updated_by: me.id, updated_by_name: me.name});
 async function run(fn, ok) { setBusy(true); try { const r = await fn(); if (ok) toast.success(ok); return r; } catch (e) { console.error('team save', e); toast.error(friendlyError(e)); throw e; } finally { setBusy(false); } }
 // A 원본의 C 진행 표시 갱신(이현성일 때만; 디자이너는 A에 쓸 수 없다).
 const linkTargets = x => [...(x.src_id ? [x.src_id] : []), ...(x.out_links || []).map(o => o.id)];
 // 연결을 끊거나 C 업무를 지울 때 A·B 쪽 표시와 맞춤 기준(c_sync)을 지운다. 평소 맞추기는 플랫폼의 watchTeamLinks가 한다.
 async function clearLinks(x) { if (!isAdmin) return; for (const id of linkTargets(x)) { try { await db.doc('items/' + id).update({c_link: null, c_sync: null}); } catch (e) { console.error('link', e); } } }
 // 이현성: C 업무를 A·B 보드로 보낸다. 보낸 업무는 지금 C 상태(상태 · 진행률 · 세부 업무 · 시작일)로 만들고, 이후는 연결 맞추기가 양쪽을 같게 둔다. C 쪽에는 out_links로 남긴다.
 async function sendTo(x, board, who) {
  const id = uuid(), now = nowIso(), partner = board === 'A' ? '권중선' : '정규진';
  const assignee = who === 'me' ? ADMIN_NAME : who === 'partner' ? partner : '함께';
  const boardField = sendBoardOf(board, who);
  const doc = {kind: 'task', title: x.title, body: x.body || '', due: x.due || '', priority: x.priority, status: x.status, progress: x.progress || 0, checklist: normChecklist(x.checklist), start_on: x.start_on || '', assignee, day: today(), topic_id: '', topic_label: '', topic_map: {}, share_all: false, links: teamLinks(x.links), category: 'work', ack: false, start: '', end: '', pinned: false, pinned_by: '', pinned_at: '', prio_no: 0, req: assignee === partner ? 'pending' : '', req_at: assignee === partner ? now : '', req_reply: '', ref_id: '', reply_by: '', collab: '', demo: 0, board: boardField, home: board, c_link: teamLinkOf(x), author_id: me.id, author_name: me.name, created_at: now, updated_at: now, updated_by: me.id, updated_by_name: me.name, last_change: '디자인팀 보드에서 보냄', done_at: x.status === 'done' ? (x.done_at || now) : '', plan_day: ''};
  await run(async () => { await db.doc('items/' + id).set(doc); await db.doc('items/' + x.id).update({out_links: [...(x.out_links || []), {board, id, at: now}]}); }, `${board} 보드 : ${partner}에 보냈어요.`);
 }
 async function patch(x, fields, change) {
  const next = {...fields};
  if ('progress' in next) Object.assign(next, progressFields(x, next.progress));
  const status = next.status || x.status;
  if (status === 'done' && x.status !== 'done') { next.done_at = nowIso(); if (!('progress' in fields)) next.progress = 100; }
  if (status !== 'done' && x.status === 'done') next.done_at = '';
  // 진행 중이 되면 시작일을 남긴다(비었거나 미래로 잡혀 있었을 때). 타임라인 막대의 시작점.
  if (next.status === 'doing' && x.status !== 'doing' && !('start_on' in fields) && (!x.start_on || x.start_on > today())) next.start_on = today();
  // 특이사항을 해결로 닫으면 해결 기록(issue_log)에 남긴다.
  if ('issue' in fields && !fields.issue && x.issue) next.issue_log = [...(x.issue_log || []), {issue: x.issue, note: x.issue_note, by: x.issue_by, at: x.issue_at, resolved_by: me.name, resolved_at: nowIso(), how: String(fields.issue_how || '')}].slice(-50);
  delete next.issue_how;
  if (change) {
   const f = next.handoffs ? 'handoff' : 'assignee' in fields ? 'assign' : 'status' in fields ? 'status' : 'due' in fields ? 'due' : 'priority' in fields ? 'priority' : 'checklist' in fields ? 'check' : 'spec' in fields ? 'spec' : 'start_on' in fields ? 'start' : 'issue' in fields ? 'issue' : 'progress' in fields ? 'progress' : 'links' in fields ? 'link' : 'title' in fields ? 'title' : 'body' in fields ? 'body' : '';
   const fmt = {assign: v => teamWho(v), status: v => statuses[v] || v, due: v => v ? shortDate(v) : '없음', priority: v => taskPriorities[v] || v, progress: v => `${v || 0}%`, title: v => v};
   const ft = fmt[f] ? {from: fmt[f](f === 'assign' ? x.assignee : x[f]), to: fmt[f](f === 'assign' ? next.assignee : f === 'progress' ? next.progress : next[f])} : {};
   const ho = next.handoffs ? next.handoffs[next.handoffs.length - 1] : null;
   next.history = [...(x.history || []), {at: nowIso(), by: me.name, text: change, kind: f, ...ft, ...(ho ? {from: ho.from, to: ho.to, note: ho.note} : {})}].slice(-200);
  }
  await run(() => db.doc('items/' + x.id).update({...next, ...stamp(), last_change: change || ''}));
 }
 async function create(draft) {
  const id = uuid(), now = nowIso();
  // A에서 불러올 때는 상태 · 진행률 · 시작일 · 세부 업무(id 포함)를 원본 그대로 가져와 처음부터 A와 같게 둔다(연결 맞추기 기준).
  const imp = !!draft.src_id, st0 = imp && statuses[draft.status] ? draft.status : 'todo', cl0 = imp ? normChecklist(draft.checklist) : normChecklist(draft.checklist).map(c => ({...c, id: newCheckId()}));
  const doc = {kind: 'task', title: draft.title, body: draft.body || '', due: draft.due || '', priority: draft.priority || 'share', status: st0, progress: imp && draft.progress !== undefined ? Math.max(0, Math.min(100, Math.round(Number(draft.progress) || 0))) : cl0.length ? checkStat({checklist: cl0}).pct : 0, checklist: cl0, start_on: imp && DATE_RE.test(draft.start_on || '') ? draft.start_on : '', assignee: draft.assignee || '', day: today(), topic_id: '', topic_label: draft.topic_label || '', src_board: draft.src_board || '', src_id: draft.src_id || '', src_title: draft.src_title || '', src_body: draft.src_body || '', src_checks: normChecklist(draft.src_checks), src_links: teamLinks(draft.src_links), src_synced_at: draft.src_id ? now : '', spec: normChecklist(draft.spec).map(c => ({id: newCheckId(), text: c.text, done: false})), issue: '', issue_note: '', issue_at: '', issue_by: '', links: teamLinks(draft.links), category: 'work', ack: false, start: '', end: '', pinned: false, prio_no: 0, req: '', demo: 0, board: 'C', home: 'C', author_id: me.id, author_name: me.name, created_at: now, updated_at: now, updated_by: me.id, updated_by_name: me.name, last_change: draft.src_id ? 'A 보드에서 불러옴' : '오더', done_at: st0 === 'done' ? (draft.done_at || now) : '', history: [{at: now, by: me.name, text: draft.src_id ? 'A 보드에서 불러옴' : '등록', kind: 'create'}], handoffs: []};
  await db.doc('items/' + id).set(doc);
  if (isAdmin && doc.src_board && doc.src_id) { try { await db.doc('items/' + doc.src_id).update({c_link: teamLinkOf({...doc, id})}); } catch (e) { console.error('link A', e); } }
  return id;
 }
 async function checklistAct(x, act) {
  const snap = await db.doc('items/' + x.id).get(); if (!snap.exists) throw new Error('이미 삭제된 업무예요.');
  let list = normChecklist((snap.data() || {}).checklist);
  if (act.type === 'toggle') list = list.map(c => c.id === act.cid ? {...c, done: !!act.done, pct: act.done ? 100 : 0} : c);
  else if (act.type === 'pct') list = list.map(c => c.id === act.cid ? {...c, pct: act.pct, done: act.pct >= 100} : c);
  else if (act.type === 'add') list = [...list, ...act.texts.map(t => ({id: newCheckId(), text: t, done: false, by: me.name, at: nowIso()}))];
  else if (act.type === 'addOne') { const p = Math.max(0, Math.min(100, Math.round(Number(act.pct) || 0))); list = [...list, {id: act.id || newCheckId(), text: act.text, pct: p, done: p >= 100, by: me.name, at: nowIso()}]; }
  else if (act.type === 'remove') list = list.filter(c => c.id !== act.cid);
  else if (act.type === 'edit') list = list.map(c => c.id === act.cid ? {...c, text: act.text} : c);
  else if (act.type === 'by') list = list.map(c => c.id === act.cid ? (act.by ? {...c, by: act.by} : (({by, ...rest}) => rest)(c)) : c);
  else if (act.type === 'reorder') { const byId = new Map(list.map(c => [c.id, c])); list = [...act.ids.map(i => byId.get(i)).filter(Boolean), ...list.filter(c => !act.ids.includes(c.id))]; }
  list = normChecklist(list); const st = checkStat({checklist: list});
  const fields = {checklist: list, ...(act.body !== undefined ? {body: act.body} : {})};
  if (list.length) fields.progress = st.pct;
  await patch(x, fields, list.length ? `세부 업무 ${st.done}/${st.total}` : '세부 업무 정리');
 }
 // 끌어서 바꾼 순서: 걸러 본 목록이면 그 업무들의 자리만 새 순서로 바꾸고, 전체를 1..n으로 저장(바뀐 것만).
 async function reorder(visibleIds) {
  const full = items.filter(x => x.status !== 'done').sort(teamOrder), set = new Set(visibleIds), queue = [...visibleIds];
  const next = full.map(x => set.has(x.id) ? queue.shift() : x.id);
  const byId = new Map(full.map(x => [x.id, x]));
  setBusy(true);
  try { await Promise.all(next.map((id, k) => byId.get(id) && byId.get(id).prio_no !== k + 1 ? db.doc('items/' + id).update({prio_no: k + 1}) : null)); }
  catch (e) { console.error('team reorder', e); toast.error(friendlyError(e)); }
  finally { setBusy(false); }
 }
 async function remove(x) {
  if (!confirm(`'${x.title}' 업무를 지울까요? 댓글도 함께 지워져요.`)) return;
  await run(async () => { for (const c of comments.filter(c => c.item_id === x.id)) await db.doc('comments/' + c.id).delete(); await db.doc('items/' + x.id).delete(); }, '업무를 지웠어요.');
  clearLinks(x); setSel(null);
 }
 async function comment(x, body) { const t = String(body || '').trim(); if (!t) return; await run(() => db.doc('comments/' + uuid()).set({item_id: x.id, author_id: me.id, author_name: me.name, body: t.slice(0, 3000), links: [], created_at: nowIso()})); }
 // 댓글 확인·좋아요: 누른 사람 이름을 남긴다(다시 누르면 취소).
 async function markComment(c, kind) { const cur = (c.marks && c.marks[kind]) || [], next = cur.includes(me.name) ? cur.filter(n => n !== me.name) : [...cur, me.name]; try { await db.doc('comments/' + c.id).update({marks: {...(c.marks || {}), [kind]: next}}); } catch (e) { toast.error(friendlyError(e)); } }
 async function setAvatar(file, who = me.name) { const seat = SEATS.find(x => x.name === who) || me; try { const url = file ? await shrinkImage(file) : ''; await run(async () => { const doc = {seat: seat.key, name: seat.name, url, updated_at: nowIso(), set_by: me.name}; await db.doc('avatars/C~' + seat.key).set({...doc, board: 'C'}); if (seat.key === 'lhs') { try { await db.doc('avatars/all~lhs').set({...doc, board: 'all'}); } catch (e) { console.error('avatar all', e); } } }, `${seat.name === me.name ? '' : seat.name + ' '}프로필 사진을 ${file ? '바꿨어요' : '지웠어요'}.`); } catch (e) { if (e && e.message && !e.code) toast.error(e.message); } }
 // 오늘 미팅 추가: 이현성 혼자 일정(board 'all', A 보드 일정과 같은 형식)으로 저장한다. 이현성 화면의 일정 요약(watchLeeMeetings)이 C 문서에 옮겨 적는다.
 async function addMeeting(m) {
  if (!isAdmin) return; const id = uuid(), now = nowIso();
  const start = TIME_RE.test(m.start || '') ? m.start : '', end = start ? (TIME_RE.test(m.end || '') && m.end > start ? m.end : `${String(Math.min(23, Number(start.slice(0, 2)) + 1)).padStart(2, '0')}:${start.slice(3)}`) : '';
  const doc = {kind: 'event', title: String(m.title || '').trim().slice(0, 150), body: '', category: 'work', priority: 'share', ack: false, status: 'todo', day: today(), due: '', assignee: ADMIN_NAME, start, end, links: [], topic_id: '', topic_label: '', topic_map: {}, pinned: false, pinned_by: '', pinned_at: '', reply_by: '', progress: 0, ref_id: '', prio_no: 0, req: '', req_reply: '', req_at: '', checklist: [], share_all: false, plan_day: '', collab: '', collab_note: '', collab_by: '', collab_at: '', collab_reply: '', collab_reply_at: '', board: 'all', home: 'A', author_id: me.id, author_name: me.name, created_at: now, updated_at: now, updated_by: me.id, updated_by_name: me.name, last_change: '디자인팀 보드에서 미팅 추가', done_at: '', demo: 0, from_c: true};
  if (!doc.title) return;
  await run(() => db.doc('items/' + id).set(doc), '미팅을 넣었어요. A·B 보드 일정에도 보여요.');
 }
 // 오늘 미팅 수정: 원래 일정 문서(A·B 일정)의 제목·시간을 고친다. 이현성 화면의 요약이 C 문서를 다시 적는다.
 async function editMeeting(m) {
  if (!isAdmin || !m.id) return;
  const start = TIME_RE.test(m.start || '') ? m.start : '', end = start ? (TIME_RE.test(m.end || '') && m.end > start ? m.end : `${String(Math.min(23, Number(start.slice(0, 2)) + 1)).padStart(2, '0')}:${start.slice(3)}`) : '';
  const title = String(m.title || '').trim().slice(0, 150); if (!title) return;
  await run(() => db.doc('items/' + m.id).update({title, start, end, updated_at: nowIso(), updated_by: me.id, updated_by_name: me.name, last_change: '디자인팀 보드에서 미팅 수정'}), '미팅을 고쳤어요.');
 }
 async function removeMeeting(m) { if (!isAdmin || !m.id || !confirm(`‘${m.title}’ 미팅을 지울까요? A·B 보드 일정에서도 지워져요.`)) return; await run(() => db.doc('items/' + m.id).delete(), '미팅을 지웠어요.'); }
 async function editComment(c, body) { const t = String(body || '').trim(); if (!t) return; await run(() => db.doc('comments/' + c.id).update({body: t.slice(0, 3000), edited_at: nowIso()})); }
 async function deleteComment(c) { if (!confirm('댓글을 지울까요?')) return; await run(() => db.doc('comments/' + c.id).delete()); }
 async function addLink(x, link) { const cur = teamLinks(x.links); if (cur.length >= 20) throw new Error('링크는 20개까지 넣을 수 있어요.'); await patch(x, {links: [...cur, {id: newCheckId(), label: link.label, url: link.url, shared_by: me.name, shared_at: nowIso()}]}, '링크 추가'); }
 async function removeLink(x, i) { const cur = teamLinks(x.links); await patch(x, {links: cur.filter((_, k) => k !== i)}, '링크 빼기'); }
 // 이현성이 자세히 보기를 열면 A 원본 내용·세부 업무·링크를 다시 읽어 C에 옮겨 둔다(디자이너는 A를 못 읽으므로).
 async function refreshSource(x) {
  if (!isAdmin || !x.src_board || !x.src_id) return;
  try {
   const snap = await db.doc('items/' + x.src_id).get(); if (!snap.exists) return;
   const v = snap.data() || {}, next = {src_title: String(v.title || x.src_title), src_body: String(v.body || ''), src_checks: normChecklist(v.checklist), src_links: teamLinks(v.links)};
   const same = next.src_title === x.src_title && next.src_body === x.src_body && JSON.stringify(next.src_checks) === JSON.stringify(x.src_checks) && JSON.stringify(next.src_links.map(l => l.url)) === JSON.stringify(x.src_links.map(l => l.url));
   if (!same) await db.doc('items/' + x.id).update({...next, src_synced_at: nowIso()});
  } catch (e) { console.error('refresh source', e); }
 }
 // 연결 끊기: 원본(A) 또는 보낸 곳(A·B)의 디자인팀 표시를 지우고 C에서도 연결을 뺀다. 업무 자체는 양쪽에 그대로.
 async function unlink(x, target) {
  if (!confirm('이 연결을 끊을까요? 상대 보드 업무에서 디자인팀 진행 표시가 사라져요.')) return;
  await run(async () => {
   if (target === 'src') { if (x.src_id) { try { await db.doc('items/' + x.src_id).update({c_link: null, c_sync: null}); } catch (e) { console.error('unlink', e); } } await db.doc('items/' + x.id).update({src_board: '', src_id: '', src_title: '', src_body: '', src_checks: [], src_links: [], last_change: `${x.src_board || 'A'} 원본 연결 끊음`, ...stamp()}); }
   else { try { await db.doc('items/' + target).update({c_link: null, c_sync: null}); } catch (e) { console.error('unlink', e); } await db.doc('items/' + x.id).update({out_links: x.out_links.filter(o => o.id !== target), ...stamp()}); }
  }, '연결을 끊었어요.');
 }
 async function createAsk(a) {
  const now = nowIso();
  await run(() => db.doc('items/' + uuid()).set({kind: 'daily', team_type: 'ask', ack: false, title: a.title, body: a.body || '', ask_type: a.ask_type, from: me.name, from_id: me.id, to: a.to, task_id: a.task_id || '', task_title: a.task_title || '', reply_by: a.reply_by || '', state: 'open', done_by: '', done_at: '', answer: '', priority: 'share', status: 'todo', day: today(), assignee: '', links: [], board: 'C', home: 'C', author_id: me.id, author_name: me.name, created_at: now, updated_at: now}), `${a.to === '모두' ? '모두' : a.to}에게 ${ASK_TYPES[a.ask_type]}을 남겼어요.`);
 }
 async function updateAsk(a, fields, ok) { await run(() => db.doc('items/' + a.id).update({...fields, updated_at: nowIso()}), ok); }
 async function deleteAsk(a) { if (!confirm('이 요청을 지울까요?')) return; await run(async () => { for (const c of comments.filter(c => c.item_id === a.id)) await db.doc('comments/' + c.id).delete(); await db.doc('items/' + a.id).delete(); }, '요청을 지웠어요.'); }
 // 오늘의 업무보고: 사람·날짜마다 문서 하나(C-rep-자리-날짜).
 async function saveReport(day, fields, known) {
  const ref = db.doc('items/C-rep-' + me.id + '-' + day), snap = known || await ref.get(), now = nowIso();
  if (snap.exists) await ref.update({...fields, updated_at: now});
  else await ref.set({kind: 'daily', team_type: 'report', ack: false, seat: me.id, name: me.name, day, title: `${me.name} 업무보고 ${day}`, lines: [], note: '', next: '', links: [], priority: 'share', status: 'todo', assignee: '', board: 'C', home: 'C', author_id: me.id, author_name: me.name, created_at: now, updated_at: now, ...fields});
 }
 // 업무보고 고치기: 저장소의 최신 보고 위에서 바꾼다(연달아 넣어도 앞 줄이 빠지지 않게).
 async function reportAct(day, fn, ok) { await run(async () => { const snap = await db.doc('items/C-rep-' + me.id + '-' + day).get(); const cur = snap.exists ? normReport({id: snap.id, ...snap.data()}) : {lines: [], links: [], note: '', next: ''}; await saveReport(day, fn(cur), snap); }, ok); }
 async function importRows(rows, assignee) {
  await run(async () => { for (const r of rows) await create({title: r.title, body: r.body, due: r.due, priority: r.priority, status: r.status, progress: r.progress, start_on: r.start_on, done_at: r.done_at, assignee, topic_label: r.topic, src_board: 'A', src_id: r.id, src_title: r.title, src_body: r.body, src_checks: r.checklist, src_links: r.links, links: r.links, checklist: r.checklist, spec: r.checklist}); }, `${rows.length}건을 오더로 불러왔어요.`);
  setImportOpen(false); setTab('status'); if (stab !== 'all') pickStab('todo');
 }

 const open = items.filter(x => x.status !== 'done'), done = items.filter(x => x.status === 'done');
 const asksForMe = asks.filter(a => a.state === 'open' && a.from_id !== me.id && (a.to === me.name || a.to === '모두'));
 const issues = open.filter(x => x.issue).sort((a, b) => b.issue_at.localeCompare(a.issue_at));
 const t = today(), t1 = offsetDate(t, 1);
 const kpi = {doing: open.filter(x => x.status === 'doing').length, soon: open.filter(x => x.due && x.due >= t && x.due <= t1).length, late: open.filter(teamLate).length, issue: issues.length, none: open.filter(x => !x.assignee).length};
 const cmap = useMemo(() => { const m = {}; for (const c of comments) m[c.item_id] = (m[c.item_id] || 0) + 1; return m; }, [comments]);
 const current = sel ? items.find(x => x.id === sel) : null;
 const myBoards = window.PS_BOARDS || [], boardNames = window.PS_BOARD_NAMES || {};
 const go = (v, w) => { setTab(v); if (w !== undefined) setWho(w); window.scrollTo(0, 0); };
 const common = {cmap, onOpen: id => { setHandoff(null); setSel(id); }, busy, me};

 return html`<div class="app-shell team-shell">
  <header class="app-header"><div class="header-inner"><a href="#top" class="brand" onClick=${e => { e.preventDefault(); go('status'); }}><span>pocket<span> sync</span></span></a><span class="workspace-name">C 보드 : ${String(boardNames.C || '디자인팀').replace(/ 보드$/, '')}</span>
   ${myBoards.length > 1 && html`<div class="board-switch" role="group" aria-label="보드 전환">${myBoards.map(b => html`<button type="button" key=${b} class=${cx('board-tab', b === 'C' && 'on')} aria-pressed=${b === 'C'} onClick=${() => { if (b !== 'C' && window.PS_SWITCH_BOARD) window.PS_SWITCH_BOARD(b); }}>${boardLabel(b, boardNames)}</button>`)}</div>`}
   <div class="header-actions"><div class="tb-account"><button type="button" class="header-profile" aria-haspopup="menu" aria-expanded=${menu} onClick=${() => setMenu(v => !v)}><${Av} name=${me.name} /><strong>${me.name || '로그인'}</strong>${I('ChevronDown', 13)}</button>${menu && html`<div class="tb-menu" role="menu"><p>${window.PS_EMAIL || ''}</p><label class="tb-menu-item" role="menuitem">${I('UserRound', 14)}프로필 사진 바꾸기<input type="file" accept="image/*" hidden onChange=${e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) { setMenu(false); setAvatar(f); } }} /></label>${avatars[me.name] && html`<button type="button" role="menuitem" onClick=${() => { setMenu(false); setAvatar(null); }}>${I('X', 14)}사진 지우기</button>`}<button type="button" role="menuitem" onClick=${() => window.PS_SIGNOUT && window.PS_SIGNOUT()}>${I('LogOut', 14)}로그아웃</button></div>`}</div></div></div></header>
  <main class="board-main team-main" id="top">
   <div class="board-tabs"><${TabsList} class="top-tabs" label="디자인팀 보드 보기" value=${tab} onChange=${v => go(v)} tabs=${Object.entries(TEAM_TABS).map(([k, l]) => ({value: k, content: html`<${Fragment}>${l}${k === 'orders' ? html`<span class="tab-count">${open.length}</span>` : k === 'issues' ? html`<span class=${cx('tab-count', (asksForMe.length + issues.length) && 'notification')} title="나에게 온 확인 요청 + 열린 특이사항">${asksForMe.length + issues.length}</span>` : k === 'report' ? html`<span class="tab-count">${reports.filter(r => r.day === today() && r.lines.length).length}</span>` : k === 'done' ? html`<span class="tab-count">${done.filter(x => !isArchived(x)).length}</span>` : ''}<//>`}))} /></div>
   ${loading ? html`<div class="loading">${I('Loader2', 22, {class: 'spin'})}보드를 불러오고 있어요.</div>` : html`<div class="team-body">
    ${tab === 'status' && html`<${TeamStatus} meet=${meet} onMeetAdd=${addMeeting} onMeetRemove=${removeMeeting} onMeetEdit=${editMeeting} stab=${stab} onStab=${pickStab} items=${open} doneItems=${done.filter(x => !isArchived(x))} kpi=${kpi} issues=${issues} onGo=${go} isAdmin=${isAdmin} onPatch=${patch} onImport=${() => setImportOpen(true)} onCreate=${d => run(() => create(d), '업무를 추가했어요.')} onReorder=${reorder} who=${who} onWho=${setWho} onChecklist=${checklistAct} onAvatar=${setAvatar} ...${common} />`}
    ${tab === 'orders' && html`<${TeamOrders} items=${open} who=${who} onWho=${setWho} isAdmin=${isAdmin} onCreate=${d => run(() => create(d), '오더를 등록했어요.')} onImport=${() => setImportOpen(true)} onPatch=${patch} onChecklist=${checklistAct} ...${common} />`}
    ${tab === 'due' && html`<${TeamDue} items=${open} done=${done} ...${common} />`}
    ${tab === 'issues' && html`<${Fragment}><${TeamAsks} asks=${asks} tasks=${open} comments=${comments} me=${me} busy=${busy} onCreate=${createAsk} onUpdate=${updateAsk} onDelete=${deleteAsk} onComment=${comment} onMark=${markComment} onEditComment=${editComment} onDeleteComment=${deleteComment} onOpenTask=${setSel} /><${TeamIssues} items=${issues} comments=${comments} all=${items} onPatch=${patch} ...${common} /><//>`}
    ${tab === 'report' && html`<${TeamReport} reports=${reports} tasks=${items} comments=${comments} me=${me} busy=${busy} onAct=${reportAct} onCheck=${checklistAct} onProgress=${(x, v) => patch(x, {progress: v}, `진행률 ${v}%`)} onComment=${comment} onMark=${markComment} onEditComment=${editComment} onDeleteComment=${deleteComment} onOpenTask=${setSel} onAvatar=${setAvatar} />`}
    ${tab === 'done' && html`<${TeamDone} items=${done} onPatch=${patch} ...${common} />`}
   </div>`}
  </main>
  ${current && html`<${TeamDetail} key=${current.id} handoffFrom=${handoff && handoff.id === current.id ? handoff.from : null} item=${current} comments=${comments.filter(c => c.item_id === current.id).sort((a, b) => a.created_at.localeCompare(b.created_at))} me=${me} isAdmin=${isAdmin} busy=${busy} onClose=${() => setSel(null)} onPatch=${patch} onChecklist=${checklistAct} onComment=${comment} onEditComment=${editComment} onDeleteComment=${deleteComment} onMark=${markComment} onRemove=${remove} onAddLink=${addLink} onRemoveLink=${removeLink} onRefreshSource=${refreshSource} onSendTo=${sendTo} onUnlink=${unlink} />`}
  ${importOpen && html`<${TeamImport} existing=${new Set(items.map(x => x.src_id).filter(Boolean))} busy=${busy} onClose=${() => setImportOpen(false)} onImport=${importRows} onCreate=${d => run(() => create(d), `'${d.title}' 업무를 만들었어요.`)} />`}
  <${Toaster} />
 </div>`;
}

// 한 줄 업무(현황·마감·특이사항 공용).
// D-day 칩을 누르면 바로 마감일을 바꾼다.
// 오더 목록의 담당: 눌러서 여러 명 고르기.
function TeamWhoPick({x, busy, onPatch, onHandoff}) {
 const [open, setOpen] = useState(false), ref = useRef(null);
 useEffect(() => { if (!open) return; const off = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; const esc = e => { if (e.key === 'Escape') setOpen(false); }; document.addEventListener('pointerdown', off); document.addEventListener('keydown', esc); return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc); }; }, [open]);
 const set = async v => { const n = teamToggle(x.assignee, v); if (n === x.assignee) return; await onPatch(x, {assignee: n}, n ? `담당 ${teamWho(n)}` : '담당 비움'); if (x.assignee && onHandoff) onHandoff(x, x.assignee, n); };
 return html`<span class="tb-whopick" ref=${ref}><button type="button" class=${cx('tb-who', !x.assignee && 'none')} disabled=${busy} title=${teamWho(x.assignee)} onClick=${() => setOpen(v => !v)}>${teamWho(x.assignee)}${I('ChevronDown', 12)}</button>${open && html`<div class="tb-duepop tb-whopop" role="dialog" aria-label="담당 고르기">${[...teamNames().map(n => [n, n]), ['모두', '셋 다'], ['', '미배정']].map(([v, l]) => html`<button type="button" key=${l} class=${cx('chip', teamOn(x.assignee, v) && 'on')} disabled=${busy} onClick=${() => set(v)}>${l}${v && v !== '모두' ? html`<span class="tb-check">${teamOn(x.assignee, v) ? I('Check', 12) : ''}</span>` : ''}</button>`)}<small>여러 명 선택 가능</small></div>`}</span>`;
}
// 상태 배지: 눌러서 바로 바꾼다(예정 · 진행 중 · 보류 · 완료).
function TeamStatusPick({x, busy, onPatch}) {
 const [open, setOpen] = useState(null), ref = useRef(null);
 useEffect(() => { if (!open) return; const off = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); }; const close = () => setOpen(null); document.addEventListener('pointerdown', off); window.addEventListener('scroll', close, true); return () => { document.removeEventListener('pointerdown', off); window.removeEventListener('scroll', close, true); }; }, [open]);
 const L = {todo: '예정', doing: '진행 중', hold: '보류', done: '완료'};
 return html`<span class="tb-stpick" ref=${ref}><button type="button" class=${'tb-stbadge st-' + x.status} disabled=${busy} title="상태 바꾸기" onClick=${e => { if (open) { setOpen(null); return; } const r = e.currentTarget.getBoundingClientRect(); setOpen({left: Math.min(window.innerWidth - 150, r.left), top: r.bottom + 4 + 150 > window.innerHeight ? r.top - 154 : r.bottom + 4}); }}><i></i>${L[x.status]}${I('ChevronDown', 11)}</button>${open && html`<div class="tb-duepop tb-stpop" style=${`position:fixed;left:${open.left}px;top:${open.top}px`}>${Object.entries(L).map(([k, l]) => html`<button type="button" key=${k} class=${cx('chip', 'st-' + k, x.status === k && 'on')} onClick=${() => { setOpen(null); if (x.status !== k) onPatch(x, {status: k}, `상태 ${statuses[k]}`); }}><span><i></i>${l}</span></button>`)}</div>`}</span>`;
}
function TeamDuePick({x, busy, onPatch}) {
 const [open, setOpen] = useState(false), ref = useRef(null), d = dDay(x.due);
 useEffect(() => { if (!open) return; const off = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; const esc = e => { if (e.key === 'Escape') setOpen(false); }; document.addEventListener('pointerdown', off); document.addEventListener('keydown', esc); return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc); }; }, [open]);
 const set = v => { setOpen(false); if (v !== x.due) onPatch(x, {due: v}, v ? `마감 ${shortDate(v)}` : '마감 지움'); };
 return html`<span class="tb-duepick" ref=${ref}><button type="button" class=${cx('dday', d.cls)} title=${x.due ? `마감 ${shortDate(x.due)} · 눌러서 바꾸기` : '마감일 정하기'} disabled=${busy} onClick=${() => setOpen(v => !v)}>${d.label}</button>${open && html`<div class="tb-duepop" role="dialog" aria-label="마감일 바꾸기">${[['', '없음'], [today(), '오늘'], [offsetDate(today(), 1), '내일'], [offsetDate(today(), 2), '모레'], [offsetDate(today(), 7), '일주일 뒤']].map(([v, l]) => html`<button type="button" key=${l} class=${cx('chip', x.due === v && 'on')} onClick=${() => set(v)}>${l}${v ? html`<small>${shortDate(v)}</small>` : ''}</button>`)}<input type="date" aria-label="날짜 직접 선택" value=${x.due} onChange=${e => set(e.target.value)} /></div>`}</span>`;
}
function TeamMini({x, cmap, onOpen, showWho = true, extra, self = ''}) {
 const d = dDay(x.due), co = self ? teamList(x.assignee).filter(n => n !== self) : [];
 return html`<button type="button" class=${cx('tb-mini', x.status === 'doing' && 'doing', x.issue && 'has-issue')} onClick=${() => onOpen(x.id)}>
  <span class=${cx('dday', d.cls)}>${d.label}</span>
  <span class="tb-mini-main"><strong>${x.title}${co.length > 0 && html`<span class="tb-co" title=${`함께: ${co.join(', ')}`}>${I('Users', 12)}${co.map(n => html`<i key=${n}>${n.slice(0, 1)}</i>`)}</span>`}</strong><small>${[showWho && teamWho(x.assignee), teamStartLabel(x) || statuses[x.status], x.checklist.length ? `세부 ${checkStat(x).done}/${x.checklist.length}` : '', cmap[x.id] ? `댓글 ${cmap[x.id]}` : ''].filter(Boolean).join(' · ')}</small></span>
  ${x.issue && html`<span class=${'tb-issue ' + x.issue}>${I('AlertCircle', 12)}${TEAM_ISSUES[x.issue]}</span>`}
  ${extra}
  <span class="tb-prog"><i><b style=${`width:${x.progress || 0}%`}></b></i><em>${x.progress || 0}%</em></span>
 </button>`;
}

function TeamStatus({meet = null, onMeetAdd, onMeetRemove, onMeetEdit, stab, onStab, items, doneItems = [], kpi, issues, cmap, onOpen, onGo, isAdmin, onPatch, onImport, onCreate, onReorder, who, onWho, onChecklist, onHandoff, busy, me, onAvatar}) {
 const [view, setViewState] = useState(() => { try { return localStorage.getItem('ps.teamView') === 'timeline' ? 'timeline' : 'list'; } catch { return 'list'; } });
 const setView = v => { setViewState(v); try { localStorage.setItem('ps.teamView', v); } catch {} };
 const people = [...SEATS.map(s => ({key: s.key, name: s.name, list: items.filter(x => teamHas(x, s.name))}))];
 const tiles = [['진행 중', kpi.doing, () => onGo('status', 'all'), ''], ['오늘·내일 마감', kpi.soon, () => onGo('due'), kpi.soon ? 'warn' : ''], ['지난 마감', kpi.late, () => onGo('due'), kpi.late ? 'alert' : ''], ['특이사항', kpi.issue, () => onGo('issues'), kpi.issue ? 'alert' : ''], ['미배정', kpi.none, () => onGo('status', 'none'), kpi.none ? 'warn' : '']];
 return html`<section class="tb-status">
  ${issues.length > 0 && html`<div class="tb-alert">${I('AlertCircle', 16)}<strong>특이사항 ${issues.length}</strong><span>${issues[0].title} · ${TEAM_ISSUES[issues[0].issue]}${issues[0].issue_note ? ` · ${issues[0].issue_note}` : ''}</span><button type="button" class="text-button" onClick=${() => onGo('issues')}>모두 보기${I('ChevronRight', 13)}</button></div>`}
  <div class=${cx('tb-split', view === 'timeline' && 'tl-on')}><div class="tb-left"><${TeamMeetings} doc=${meet} isAdmin=${isAdmin} busy=${busy} onAdd=${onMeetAdd} onRemove=${onMeetRemove} onEdit=${onMeetEdit} /><${TeamAssignList} view=${view} onView=${setView} stab=${stab} onStab=${onStab} items=${items} doneItems=${doneItems} cmap=${cmap} onOpen=${onOpen} isAdmin=${isAdmin} onPatch=${onPatch} onImport=${onImport} onCreate=${onCreate} onReorder=${onReorder} filter=${who} onFilter=${onWho} onChecklist=${onChecklist} onHandoff=${onHandoff} busy=${busy} /></div>
  <div class="tb-people">${people.map(p => { const doing = p.list.filter(x => x.status === 'doing').sort(teamOrder), wait = p.list.filter(x => x.status !== 'doing').sort(teamOrder), late = p.list.filter(teamLate).length, avg = p.list.length ? Math.round(p.list.reduce((a, x) => a + (x.progress || 0), 0) / p.list.length) : 0; return html`<article class="tb-person" key=${p.key}>
   <div class="tb-person-head">${p.key === 'none' ? html`<span class="avatar ghost">?</span>` : html`<${Av} name=${p.name} editable=${me && (p.name === me.name || me.name === ADMIN_NAME)} busy=${busy} onPick=${f => onAvatar(f, p.name)} />`}<div><strong>${p.name}</strong><small>진행 ${doing.length} · 대기 ${wait.length}${late ? html` · <b class="late">지연 ${late}</b>` : ''} · 평균 ${avg}%</small></div><button type="button" class="text-button" onClick=${() => onGo('status', p.key === 'none' ? 'none' : p.name)}>목록${I('ChevronRight', 13)}</button></div>
   <div class="tb-sub"><span>지금 하는 일</span></div>${doing.length ? doing.map(x => html`<${TeamMini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} showWho=${false} self=${p.name} />`) : html`<p class="tb-none">진행 중인 업무가 없어요.</p>`}
   ${wait.length > 0 && html`<${Fragment}><div class="tb-sub"><span>대기 · 보류</span></div>${wait.slice(0, 6).map(x => html`<${TeamMini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} showWho=${false} self=${p.name} />`)}${wait.length > 6 && html`<button type="button" class="tb-more" onClick=${() => onGo('status', p.key === 'none' ? 'none' : p.name)}>외 ${wait.length - 6}건 더 보기</button>`}<//>`}
  </article>`; })}</div></div>
 </section>`;
}

// 오늘 미팅: 이현성 일정(A·B 보드)을 이현성 화면에서 요약해 둔 문서(items/C-meet-lhs)를 업무 리스트 위에 얇게 보여준다.
// 이현성은 여기서 바로 미팅을 넣을 수 있다(오늘의 공유 일정 칸과 같은 입력 방식, 이현성 혼자 일정으로 저장되어 A·B 보드 일정에도 같이 보인다). 여기서 넣은 미팅은 x로 지운다.
// A·B 보드에서도 같은 틀로 쓴다(그 보드에서 보이는 이현성 일정으로 만든 doc, 누르면 일정 상세).
const josaWa = n => { const c = String(n || '').charCodeAt(String(n || '').length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 === 0 ? '와' : '과'; };
const meetIcon = () => html`<svg class="tb-meet-ico" width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M5.21 3.94H16.79C18.53 3.94 19.94 5.35 19.94 7.09V17.61C19.94 18.71 19.04 19.61 17.94 19.61H4.06C2.96 19.61 2.06 18.71 2.06 17.61V7.09C2.06 5.35 3.47 3.94 5.21 3.94Z" fill="#D3D3D3"/><path d="M4.06 3.94H17.94C19.04 3.94 19.94 4.84 19.94 5.94V7.9H2.06V5.94C2.06 4.84 2.96 3.94 4.06 3.94Z" fill="#C6C6C6"/><path d="M7.44 2.39C8.01 2.39 8.48 2.86 8.48 3.43V4.47H6.4V3.43C6.4 2.86 6.87 2.39 7.44 2.39Z" fill="#C6C6C6"/><path d="M14.56 2.39C15.13 2.39 15.6 2.86 15.6 3.43V4.47H13.52V3.43C13.52 2.86 13.99 2.39 14.56 2.39Z" fill="#C6C6C6"/></svg>`;
function TeamMeetings({doc, isAdmin = false, busy = false, onAdd, onRemove, onEdit, onOpen}) {
 const [, tick] = useState(0), [slot, setSlot] = useState(null), [edit, setEdit] = useState(null), titleRef = useRef(null), editRef = useRef(null);
 useEffect(() => { const h = setInterval(() => tick(n => n + 1), 60000); return () => clearInterval(h); }, []);
 const t = today(), raw = doc && doc.days && Array.isArray(doc.days[t]) ? doc.days[t] : [];
 const list = raw.filter(m => m && typeof m === 'object').map(m => ({id: String(m.id || ''), c: !!m.c, start: TIME_RE.test(m.start || '') ? m.start : '', end: TIME_RE.test(m.end || '') ? m.end : '', title: String(m.title || ''), private: !!m.private, with: String(m.with || '')}));
 const now = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false}).format(new Date());
 const on = m => !!m.start && m.start <= now && (m.end || m.start) > now, past = m => !!m.start && (m.end || m.start) <= now;
 const cur = list.find(on), next = list.find(m => m.start && m.start > now);
 const canAdd = isAdmin && !!onAdd;
 // 이현성이 C에서 고칠 수 있는 미팅: 개인 일정(제목이 가려져 있음) 빼고 모두. A·B에서는 줄을 누르면 일정 상세가 열려 거기서 고친다.
 const canEdit = m => isAdmin && !!onEdit && !onOpen && !!m.id && !m.private;
 // 처음 시간: 다음 정각(최대 21시). 오늘 미팅이 그보다 늦게 끝나면 그 끝 시간부터.
 const open = () => {
  const base = fromMin(Math.min(21 * 60, (Math.floor(toMin(now) / 60) + 1) * 60)), ends = list.filter(m => m.end).map(m => m.end).sort(), lastEnd = ends[ends.length - 1];
  const st = lastEnd && toMin(lastEnd) > toMin(base) && toMin(lastEnd) < 21 * 60 ? lastEnd : base;
  setEdit(null); setSlot({start: st, end: fromMin(Math.min(toMin(st) + 60, 1439)), title: ''});
  setTimeout(() => { if (titleRef.current) titleRef.current.focus(); }, 0);
 };
 const startEdit = m => { setSlot(null); setEdit({id: m.id, start: m.start, end: m.end, title: m.title}); setTimeout(() => { if (editRef.current) { editRef.current.focus(); editRef.current.select(); } }, 0); };
 const check = st => { const title = st.title.trim(); if (!title) return null; if (st.start && st.end && toMin(st.end) <= toMin(st.start)) { toast.error('끝나는 시간을 시작 시간보다 뒤로 맞춰 주세요.'); return null; } return {title: title.slice(0, 150), start: st.start, end: st.start ? st.end : ''}; };
 async function submit(e) { e.preventDefault(); if (!slot || busy) return; const v = check(slot); if (!v) { if (titleRef.current && !slot.title.trim()) titleRef.current.focus(); return; } try { await onAdd(v); setSlot(null); } catch {} }
 async function submitEdit(e) { e.preventDefault(); if (!edit || busy) return; const v = check(edit); if (!v) return; try { await onEdit({id: edit.id, ...v}); setEdit(null); } catch {} }
 // 입력 줄: 오늘의 공유 일정 칸과 같은 모양(시작–끝, 제목, 저장, 취소). 추가·수정에 같이 쓴다.
 const formOf = (st, setSt, onSubmit, ref, label, key) => html`<form key=${key} class="agenda-row slot-form tb-meet-form" aria-label=${label} onSubmit=${onSubmit} onKeyDown=${e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); setSt(null); } }} onFocusOut=${e => { const f = e.currentTarget; setTimeout(() => { if (f.isConnected && !f.contains(document.activeElement)) setSt(x => (x && !x.title.trim() ? null : x)); }, 0); }}>
   <span class="slot-times"><input type="time" aria-label="시작 시간" value=${st.start} onChange=${e => { const v = e.target.value; setSt(x => { if (!x) return x; if (!TIME_RE.test(v)) return {...x, start: v}; const dur = TIME_RE.test(x.start) && TIME_RE.test(x.end) ? Math.max(15, toMin(x.end) - toMin(x.start)) : 60; return {...x, start: v, end: fromMin(Math.min(toMin(v) + dur, 1439))}; }); }} /><span>–</span><input type="time" aria-label="끝 시간" value=${st.end} onChange=${e => { const v = e.target.value; setSt(x => x && {...x, end: v}); }} /></span>
   <input ref=${ref} class="slot-title" aria-label="미팅 제목" placeholder="어떤 미팅인가요? Enter로 저장" maxLength="150" value=${st.title} onInput=${e => { const v = e.target.value; setSt(x => x && {...x, title: v}); }} />
   <button class="slot-ok" aria-label="저장" title="저장" disabled=${busy || !st.title.trim()}>${I('Check', 14)}</button><button type="button" class="slot-cancel" aria-label="취소" title="취소" onClick=${() => setSt(null)}>${I('X', 14)}</button>
  </form>`;
 const none = !doc ? '이현성 일정이 아직 공유되지 않았어요.' : '오늘 잡힌 미팅이 없어요.';
 // 하루 타임라인: 오늘의 공유 일정 줄과 같은 모양(9–19시 기준, 미팅이 그 밖이면 넓힘). 초록 = 지금부터 19시까지 비어 있는 시간, 빨간 선 = 지금.
 const WS = 9 * 60, WE = 19 * 60, nowM = toMin(now);
 const spans = list.filter(m => m.start).map(m => [toMin(m.start), m.end ? Math.max(toMin(m.end), toMin(m.start) + 15) : toMin(m.start) + 60]);
 const r0 = Math.floor(Math.min(WS, ...spans.map(x => x[0])) / 60) * 60, r1 = Math.ceil(Math.max(WE, ...spans.map(x => x[1])) / 60) * 60;
 const pct = m => ((Math.min(Math.max(m, r0), r1) - r0) / (r1 - r0)) * 100;
 const hours = []; for (let m = r0; m <= r1; m += 60) hours.push(m);
 const from = Math.max(WS, Math.ceil(nowM / 30) * 30), windows = from < WE ? freeWindows(spans, from, WE) : [];
 const strip = (doc || list.length) && html`<div class="strip tb-meet-strip" aria-hidden="true"><div class="strip-labels"><${PersonAv} name=${ADMIN_NAME} mini=${true} /></div><div class="strip-area"><div class="strip-hours">${hours.map(m => html`<span key=${m} class=${cx('strip-tick', (m / 60) % 2 === 1 && 'odd')} style=${`left:${pct(m)}%`}><span>${m / 60}</span></span>`)}</div>${hours.map(m => html`<i key=${'l' + m} class="strip-line" style=${`left:${pct(m)}%`}></i>`)}${windows.map(w => html`<i key=${'f' + w[0]} class="strip-free" title=${`비어 있는 시간 ${fromMin(w[0])}–${fromMin(w[1])}`} style=${`left:${pct(w[0])}%;width:${pct(w[1]) - pct(w[0])}%`}></i>`)}${nowM >= r0 && nowM <= r1 && html`<i class="strip-now" style=${`left:${pct(nowM)}%`}></i>`}<div class="strip-track">${list.filter(m => m.start).map((m, i) => { const a = toMin(m.start), b = m.end ? Math.max(toMin(m.end), a + 15) : a + 60; return html`<span key=${m.id || i} class=${cx('strip-block', m.with ? 'joint' : 'lhs', m.private && 'private')} title=${`${m.start}${m.end ? '–' + m.end : ''} ${m.title}${m.with ? ` · ${m.with}${josaWa(m.with)}` : ''}`} style=${`left:${pct(a)}%;width:${Math.max(pct(b) - pct(a), 0.8)}%`}>${m.title}</span>`; })}</div></div></div>`;
 const row = (m, i) => {
  if (edit && edit.id === m.id) return formOf(edit, setEdit, submitEdit, editRef, '미팅 수정', 'edit-' + m.id);
  const inner = html`<span class="agenda-time">${m.start ? html`<strong>${m.start}</strong><small>${m.end ? '–' + m.end : ''}</small>` : html`<strong>종일</strong>`}</span><span class="agenda-title"><span>${m.title}</span>${m.with ? html`<span class="tb-meet-with">${m.with}${josaWa(m.with)}</span>` : ''}${on(m) ? html`<span class="tb-meet-state now">지금</span>` : ''}</span>`, cls = cx('agenda-row ev tb-meet-row', on(m) && 'now', past(m) && 'past', m.private && 'private');
  if (onOpen && m.id) return html`<button type="button" key=${m.id} class=${cls} title="일정 열기" onClick=${() => onOpen(m.id)}>${inner}</button>`;
  const ed = canEdit(m);
  return html`<div key=${m.id || i} class=${cx(cls, ed && 'editable')} role=${ed ? 'button' : undefined} tabIndex=${ed ? 0 : undefined} title=${ed ? '눌러서 수정' : undefined} onClick=${ed ? () => startEdit(m) : undefined} onKeyDown=${ed ? e => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); startEdit(m); } } : undefined}>${inner}${ed && html`<span class="tb-meet-pen" aria-hidden="true">${I('Pencil', 13)}</span>`}${canAdd && m.c && m.id && onRemove && html`<button type="button" class="tb-meet-x" aria-label=${`${m.title} 지우기`} title="지우기" disabled=${busy} onClick=${e => { e.stopPropagation(); onRemove(m); }}>${I('X', 13)}</button>`}</div>`;
 };
 return html`<section class="tb-meet" aria-label="오늘 미팅">
  <div class="tb-meet-head">${meetIcon()}<strong>오늘 미팅</strong><small>이현성 · ${Number(t.slice(5, 7))}월 ${Number(t.slice(8))}일 (${'일월화수목금토'[new Date(t + 'T12:00:00Z').getUTCDay()]})</small>${cur ? html`<span class="tb-meet-state now">지금 미팅 중</span>` : next ? html`<span class="tb-meet-state">다음 ${next.start}</span>` : ''}</div>
  ${strip}
  ${list.length || canAdd || doc ? html`<div class="tb-meet-rows">${list.map(row)}${!list.length && !slot && html`<p class="tb-meet-empty">${none}</p>`}${canAdd && (slot ? formOf(slot, setSlot, submit, titleRef, '미팅 바로 추가', 'add') : html`<button type="button" class="agenda-row slot-add tb-meet-slot" onClick=${open}><span class="slot-plus">${I('Plus', 14)}</span><span>미팅 추가</span></button>`)}</div>` : html`<p class="tb-meet-empty">${none}</p>`}
 </section>`;
}

// 팀 현황의 전체 업무 리스트: 불러온·등록한 업무를 쭉 보고 줄마다 바로 담당을 정한다.
function TeamAssignList({view = 'list', onView, stab, onStab: pickStab, items, doneItems = [], cmap, onOpen, isAdmin, onPatch, onImport, onCreate, onReorder, filter, onFilter: setFilter, onChecklist, onHandoff, busy}) {
 const [checksOpen, setChecksOpen] = useState({});
 const [title, setTitle] = useState(''), [assignee, setAssignee] = useState(null), [dueMode, setDueMode] = useState('none'), [dueDate, setDueDate] = useState(''), [priority, setPriority] = useState('share');
 const pick = assignee !== null ? assignee : filter !== 'all' && filter !== 'none' ? filter : '';
 const dueOf = () => dueMode === 'today' ? today() : dueMode === 'tomorrow' ? offsetDate(today(), 1) : dueMode === 'dayafter' ? offsetDate(today(), 2) : dueMode === 'date' ? dueDate : '';
 const names = teamNames();
 const unas = {key: 'none', label: '미배정', match: x => !teamList(x.assignee).length};
 const tlGroups = filter === 'all' ? [...names.map(n => ({key: n, label: n, name: n, match: x => teamHas(x, n)})), {...unas, hideEmpty: true}] : filter === 'none' ? [unas] : [{key: filter, label: filter, name: filter, match: x => teamHas(x, filter)}];
 const byWho = arr => filter === 'all' ? arr : filter === 'none' ? arr.filter(x => !x.assignee) : arr.filter(x => teamHas(x, filter));
 const pool = [...items, ...doneItems];
 const inTab = (x, k) => k === 'all' ? x.status !== 'done' : x.status === k;
 const STABS = [['doing', '진행 중'], ['todo', '예정'], ['hold', '보류'], ['done', '완료'], ['all', '남은 일 전체']];
 const list = byWho(pool.filter(x => inTab(x, stab))).sort(stab === 'done' ? (a, b) => doneAt(b).localeCompare(doneAt(a)) : teamOrder);
 const inStab = arr => arr.filter(x => inTab(x, stab));
 const cnt = arr => view === 'timeline' ? arr.filter(x => x.status !== 'done') : inStab(arr);
 const filters = [['all', '전체', cnt(pool).length], ['none', '미배정', cnt(pool).filter(x => !x.assignee).length], ...names.map(n => [n, n, cnt(pool).filter(x => teamHas(x, n)).length])];
 const assign = async (x, v) => { const next = teamToggle(x.assignee, v); await onPatch(x, {assignee: next}, next ? `담당 ${teamWho(next)}` : '담당 비움'); if (x.assignee && onHandoff) onHandoff(x, x.assignee, next); };
 async function add(e) { e.preventDefault(); const t = title.trim(); if (!t || busy) return; try { await onCreate({title: t.slice(0, 150), assignee: pick, due: dueOf(), priority}); setTitle(''); if (stab !== 'todo' && stab !== 'all') pickStab('todo'); } catch {} }
 return html`<section class="tb-assign">
  <div class="tb-assign-head"><div><strong>업무 리스트</strong></div><div class="tb-head-right">${onView && html`<div class="tb-view" role="group" aria-label="보기 방식">${[['list', 'List', '리스트'], ['timeline', 'ChartGantt', '타임라인']].map(([v, ic, l]) => html`<button type="button" key=${v} class=${cx(view === v && 'on')} aria-pressed=${view === v} aria-label=${l} title=${l} onClick=${() => onView(v)}>${I(ic, 16)}</button>`)}</div>`}${isAdmin && html`<button type="button" class="tb-import-btn" onClick=${onImport}>${I('Download', 15)}A 보드에서 불러오기</button>`}</div></div>
  <div class="tb-assign-tools"><div class="dv-who" role="group" aria-label="담당 필터">${filters.map(([v, l, n]) => html`<button type="button" key=${v} class="chip" aria-pressed=${filter === v} onClick=${() => setFilter(v)}>${l}<span>${n}</span></button>`)}</div>
   ${view !== 'timeline' && html`<form class="tb-assign-add" onSubmit=${add}>${I('Plus', 15)}<input aria-label="업무 추가" maxLength="150" placeholder=${pick ? `${teamWho(pick)}에게 줄 업무 한 줄 추가 후 Enter` : '업무 한 줄 추가 후 Enter (담당은 줄에서 바로 정하기)'} value=${title} onInput=${e => setTitle(e.target.value)} /><button class="tb-assign-go" disabled=${!title.trim() || busy} aria-label="추가">${I('ArrowRight', 15)}</button></form>`}
  </div>

  ${view === 'timeline' ? html`<${Timeline} items=${items} groups=${tlGroups} coText=${x => teamList(x.assignee).length > 1 ? `함께: ${teamWho(x.assignee)}` : ''} onOpen=${onOpen} onPatch=${onPatch} busy=${busy} />` : html`<${Fragment}><div class="tb-stabs" role="tablist" aria-label="상태별 보기">${STABS.map(([k, l]) => html`<button type="button" role="tab" key=${k} class=${cx('tb-stab', 'st-' + k, stab === k && 'on')} aria-selected=${stab === k} onClick=${() => pickStab(k)}><i></i>${l}<b>${byWho(pool.filter(x => inTab(x, k))).length}</b></button>`)}</div>
  <div class="tb-assign-list" data-sort-list>${!list.length ? html`<p class="tb-none pad">${pool.length ? `${(STABS.find(t => t[0] === stab) || [])[1] || ''} 업무가 없어요.` : isAdmin ? '아직 업무가 없어요. A 보드에서 불러오거나 위에서 추가해 주세요.' : '아직 업무가 없어요.'}</p>` : list.map(x => { const d = dDay(x.due), st = checkStat(x); return html`<div class=${cx('tb-arow', 'st-' + x.status, !x.assignee && x.status !== 'done' && 'unassigned', x.issue && 'has-issue')} key=${x.id} data-sort-id=${x.id}>
   ${list.length > 1 && stab !== 'done' && html`<${SortGrip} id=${x.id} label="끌어서 순서 바꾸기" onDrop=${onReorder} />`}<${TeamDuePick} x=${x} busy=${busy} onPatch=${onPatch} />
   <div class="tb-arow-main"><button type="button" class="tb-arow-title" onClick=${() => onOpen(x.id)}><strong>${x.title}</strong></button><span class="tb-arow-meta"><${TeamStatusPick} x=${x} busy=${busy} onPatch=${onPatch} />${x.src_board && html`<span class="tag tb-src">${x.src_board}${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}${x.priority !== 'share' && html`<span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>`}${x.issue && html`<span class=${'tag tb-issue ' + x.issue}>${TEAM_ISSUES[x.issue]}</span>`}${(t => t && html`<small>${t}</small>`)([teamStartLabel(x), x.progress ? `${x.progress}%` : '', cmap[x.id] ? `댓글 ${cmap[x.id]}` : ''].filter(Boolean).join(' · '))}<button type="button" class=${cx('tb-check-chip', checksOpen[x.id] && 'on', !st.total && 'empty')} aria-expanded=${!!checksOpen[x.id]} onClick=${() => setChecksOpen(o => ({...o, [x.id]: !o[x.id]}))}>${I('ListChecks', 12)}${st.total ? `세부 ${st.done}/${st.total}` : '세부 업무'}${I(checksOpen[x.id] ? 'ChevronUp' : 'ChevronDown', 12)}</button></span></div>
   <div class="tb-assign-btns" role="group" aria-label="담당 정하기">${[...names.map(n => [n, n])].map(([v, l]) => html`<button type="button" key=${v} class=${cx('tb-abtn', teamOn(x.assignee, v) && 'on')} aria-pressed=${teamOn(x.assignee, v)} disabled=${busy} title=${teamOn(x.assignee, v) ? '한 번 더 누르면 빼기' : v === '모두' ? '셋 다 배정' : `${l} 추가 (여러 명 선택 가능)`} onClick=${() => assign(x, v)}>${l}</button>`)}</div>
   ${checksOpen[x.id] && html`<div class="tb-arow-checks"><${Checklist} item=${x} editable=${true} busy=${busy} onAct=${onChecklist} compact=${true} /></div>`}
  </div>`; })}</div><//>`}
 </section>`;
}

// 타임라인(간트): 시작일~마감을 막대로 그린다. 막대 안 채움은 진행률만큼 온 날까지라서, 채움 끝이 오늘 선보다 왼쪽이면 늦어지는 중.
// 시작일: start_on → 없으면 진행 중이 된 날(업무 기록) → 등록일. 예정인데 착수일이 없거나 마감이 없으면 그릴 수 없어 아래에 따로 모은다.
const teamDayNum = d => Math.round(Date.parse(d + 'T12:00:00Z') / 864e5);
const teamWeekday = d => new Date(d + 'T12:00:00Z').getUTCDay();
function teamStartOf(x) {
 if (x.start_on) return x.start_on;
 if (x.status === 'todo') return '';
 const h = (x.history || []).find(e => e.kind === 'status' && e.to === statuses.doing), at = h ? h.at : x.created_at;
 const d = at ? seoulDate(new Date(at)) : '';
 return DATE_RE.test(d) ? d : '';
}
// 보드 공용: groups = [{key, label, name(사진용) | icon, match(x), hideEmpty}], coText(x) = 공동 담당 안내(없으면 ''), whoText(x) = 담당 표시.
function Timeline({items, groups: groupDefs, coText, whoText = x => teamWho(x.assignee), onOpen, onPatch, busy}) {
 const [range, setRangeState] = useState(() => { try { return localStorage.getItem('ps.teamTlRange') === '28' ? 28 : 14; } catch { return 14; } });
 const setRange = v => { setRangeState(v); try { localStorage.setItem('ps.teamTlRange', String(v)); } catch {} };
 const [offset, setOffset] = useState(0), [showShort, setShowShort] = useState(false), [drag, setDrag] = useState(null);
 const justDragged = useRef(false);
 const N = range, t = today(), base = offsetDate(mondayOf(t), offset * 7), last = offsetDate(base, N - 1), b0 = teamDayNum(base), tIdx = teamDayNum(t) - b0, nowPos = tIdx + 0.5;
 const days = Array.from({length: N}, (_, i) => offsetDate(base, i));
 const P = v => `${(v / N * 100).toFixed(3)}%`;
 const mine = x => groupDefs.some(g => g.match(x));
 const bars = [], missing = []; let short = 0, outside = 0;
 for (const x of items) {
  if (x.status === 'done' || !mine(x)) continue;
  const s = teamStartOf(x);
  if (!s || !x.due) { missing.push(x); continue; }
  const ei = teamDayNum(x.due) - b0, si = Math.min(teamDayNum(s) - b0, ei), len = ei - si + 1, late = teamLate(x);
  if (!showShort && len < 3 && !late) { short++; continue; }
  if ((late ? Math.max(ei, tIdx) : ei) < 0 || si > N - 1) { outside++; continue; }
  bars.push({x, s, si, ei, len, late});
 }
 const groups = groupDefs.map(g => ({...g, list: bars.filter(b => g.match(b.x)).sort((a, b) => a.si - b.si || a.ei - b.ei)})).filter(g => !(g.hideEmpty && !g.list.length));
 const geo = b => {
  const {x, si, ei, len, late} = b, L = Math.max(si, 0), R = Math.min(ei + 1, N), prog = x.progress || 0, fillAt = si + prog / 100 * len;
  const fill = R > L ? Math.min(Math.max((fillAt - L) / (R - L), 0), 1) * 100 : 0;
  const risk = !late && x.status !== 'hold' && nowPos > si && nowPos < ei + 1 && nowPos - fillAt >= 1;
  // 급함: 중요도 급함·아주급함이거나 마감이 오늘·내일(보류 제외). 빨강 계열로 표시하고, 마감 지남은 더 진한 빨강 + 점선.
  const soon = !late && teamDayNum(x.due) - teamDayNum(t) <= 1, pri = x.priority === 'urgent' || x.priority === 'critical', hot = !late && x.status !== 'hold' && (pri || soon);
  const meta = [late ? [`마감 ${teamDayNum(t) - teamDayNum(x.due)}일 지남`, 'tl-red'] : [dDay(x.due).label, soon ? 'tl-red' : ''], [x.status === 'hold' ? '보류' : x.status === 'todo' && !prog ? '예정' : `${prog}%`, ''], ...(pri ? [[taskPriorities[x.priority], 'tl-red']] : []), ...(risk ? [[x.status === 'todo' ? '착수 지남' : '지연 위험', 'tl-amber']] : [])];
  return {L, R, fill, extL: late ? Math.max(ei + 1, 0) : 0, extR: late ? Math.min(tIdx + 1, N) : 0, tone: late ? 'late' : hot ? 'hot' : risk ? 'risk' : '', meta, clipL: si < 0, clipR: ei + 1 > N};
 };
 const metaOf = g => g.meta.map(([m, c], i) => html`${i ? ' · ' : ''}<span class=${c}>${m}</span>`);
 const coOf = x => { const ct = coText ? coText(x) : ''; return ct ? html`<span class="tl-co" title=${ct}>${I('Users', 12)}</span>` : ''; };
 const tipOf = b => `${b.x.title}\n${shortDate(b.s)} – ${shortDate(b.x.due)} (${b.len}일) · ${whoText(b.x)} · ${statuses[b.x.status]} ${b.x.progress || 0}%`;
 const fitIn = N === 14 ? 3 : 5, room = N === 14 ? 2 : 4;
 // 끌어서 일정 조정: 막대 가운데 = 시작일·마감 함께 이동, 왼쪽 끝 = 시작일, 오른쪽 끝 = 마감. 하루 단위로 맞춰진다.
 const dragDates = (b, mode, d) => { let s = b.s, e = b.x.due; if (mode === 'move') { s = offsetDate(s, d); e = offsetDate(e, d); } else if (mode === 'start') { s = offsetDate(s, d); if (s > e) s = e; } else { e = offsetDate(e, d); if (e < s) e = s; } return {s, e}; };
 const dragBar = (b, mode, d) => { const {s, e} = dragDates(b, mode, d), si = teamDayNum(s) - b0, ei = teamDayNum(e) - b0; return {...b, s, si, ei, len: ei - si + 1, late: e < t, x: {...b.x, due: e}}; };
 const startDrag = (ev, b) => {
  if (ev.button !== 0 || !onPatch || busy) return;
  const laneEl = ev.currentTarget.closest('.tl-lane'), edge = ev.target.closest && ev.target.closest('[data-edge]');
  if (!laneEl) return;
  const r = {id: b.x.id, b, mode: edge ? edge.dataset.edge : 'move', x0: ev.clientX, px: laneEl.getBoundingClientRect().width / N, moved: false, shown: false, d: 0};
  const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); document.body.classList.remove('tl-dragging', 'tl-resizing'); };
  const move = e => {
   const dx = e.clientX - r.x0;
   if (!r.moved && Math.abs(dx) < 4) return;
   if (!r.moved) { r.moved = true; document.body.classList.add('tl-dragging'); if (r.mode !== 'move') document.body.classList.add('tl-resizing'); }
   let d = Math.round(dx / r.px);
   if (r.mode === 'move') d = Math.max(-r.b.ei, Math.min(N - 1 - r.b.si, d));
   if (d !== r.d || !r.shown) { r.d = d; r.shown = true; setDrag({id: r.id, mode: r.mode, d}); }
  };
  const up = async () => {
   stop();
   if (!r.moved) return;
   justDragged.current = true; setTimeout(() => { justDragged.current = false; }, 0);
   if (!r.d) { setDrag(null); return; }
   const {s, e} = dragDates(r.b, r.mode, r.d);
   const fields = r.mode === 'move' ? {start_on: s, due: e} : r.mode === 'start' ? {start_on: s} : {due: e};
   const text = r.mode === 'move' ? `일정 이동 ${shortDate(s)} – ${shortDate(e)}` : r.mode === 'start' ? `${r.b.x.status === 'todo' ? '착수 예정' : '시작일'} ${shortDate(s)}` : `마감 ${shortDate(e)}`;
   try { await onPatch(r.b.x, fields, text); } catch {} finally { setDrag(null); }
  };
  const cancel = () => { stop(); setDrag(null); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
 };
 const lane = orig => {
  const dg = drag && drag.id === orig.x.id ? drag : null, b = dg ? dragBar(orig, dg.mode, dg.d) : orig;
  const g = geo(b), x = b.x, inside = g.R - g.L >= fitIn, end = Math.max(g.R, g.extR), startVis = g.R > g.L ? g.L : g.extL, outRight = N - end >= room;
  const open = () => { if (justDragged.current) { justDragged.current = false; return; } onOpen(x.id); };
  const canDrag = !!onPatch;
  return html`<div class="tl-lane" key=${x.id}>
   ${g.R > g.L && html`<button type="button" class=${cx('tl-bar', 'tl-' + x.status, g.tone && 'tl-' + g.tone, dg && 'dragging', canDrag && 'can-drag')} style=${`left:${P(g.L)};width:${P(g.R - g.L)}`} title=${dg ? '' : tipOf(b) + (canDrag ? '\n끌어서 일정 이동 · 양 끝을 끌어 시작일·마감 조정' : '')} onClick=${open} onPointerDown=${e => startDrag(e, orig)}>${canDrag && !g.clipL && html`<i class="tl-h l" data-edge="start"></i>`}${g.fill > 0 && html`<i class="tl-fill" style=${`width:${g.fill.toFixed(1)}%`}></i>`}${inside && html`<span class="tl-t">${g.clipL && html`<em>‹ ${shortDate(b.s)}</em>`}${coOf(x)}${x.title}</span>`}${inside && !outRight && !dg && html`<span class="tl-r">${metaOf(g)}${g.clipR && html`<em> ${shortDate(x.due)} ›</em>`}</span>`}${canDrag && !g.clipR && html`<i class="tl-h r" data-edge="end"></i>`}</button>`}
   ${g.extR > g.extL && html`<span class="tl-ext" style=${`left:${P(g.extL)};width:${P(g.extR - g.extL)}`}></span>`}
   ${dg ? html`<span class="tl-drag-tip" style=${outRight ? `left:calc(${P(end)} + 6px)` : `right:calc(${P(N - startVis)} + 6px)`}>${shortDate(b.s)} – ${shortDate(x.due)} · ${b.len}일</span>` : outRight ? html`<button type="button" class="tl-out" style=${`left:${P(end)}`} title=${tipOf(b)} onClick=${open}>${!inside && html`<b>${coOf(x)}${x.title}</b> · `}${metaOf(g)}</button>` : !inside && html`<button type="button" class="tl-out left" style=${`right:${P(N - startVis)}`} title=${tipOf(b)} onClick=${open}><b>${coOf(x)}${x.title}</b> · ${metaOf(g)}</button>`}
  </div>`;
 };
 const mrow = b => {
  const g = geo(b), x = b.x;
  return html`<button type="button" class=${cx('tl-mrow', 'tl-' + x.status, g.tone && 'tl-' + g.tone)} key=${x.id} onClick=${() => onOpen(x.id)}>
   <span class="tl-mtop"><strong>${coOf(x)}${x.title}</strong><small>${metaOf(g)}</small></span>
   <span class="tl-mtrack">${g.R > g.L && html`<i class="tl-mbar" style=${`left:${P(g.L)};width:${P(g.R - g.L)}`}><b style=${`width:${g.fill.toFixed(1)}%`}></b></i>`}${g.extR > g.extL && html`<i class="tl-mext" style=${`left:${P(g.extL)};width:${P(g.extR - g.extL)}`}></i>`}${tIdx >= 0 && tIdx < N && html`<i class="tl-mnow" style=${`left:${P(nowPos)}`}></i>`}</span>
   <span class="tl-mdates">${shortDate(b.s)} – ${shortDate(x.due)} · ${b.len}일</span>
  </button>`;
 };
 const whoOf = g => html`<div class="tl-who">${g.name ? html`<${Av} name=${g.name} mini=${true} />` : g.icon ? html`<span class="avatar mini tl-gicon">${I(g.icon, 14)}</span>` : html`<span class="avatar mini ghost">?</span>`}<span><strong>${g.label}</strong><small>${g.list.length}건</small></span></div>`;
 const md = d => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일`;
 const label = `${md(base)} – ${last.slice(5, 7) === base.slice(5, 7) ? `${Number(last.slice(8))}일` : md(last)}`;
 const cols = `grid-template-columns:repeat(${N},minmax(0,1fr))`;
 const we = d => [0, 6].includes(teamWeekday(d));
 return html`<div class="tl">
  <div class="tl-tools">
   <div class="tl-nav"><button type="button" class="tl-navb" aria-label="이전 주" onClick=${() => setOffset(o => o - 1)}>${I('ChevronLeft', 15)}</button><button type="button" class=${cx('tl-navb', offset === 0 && 'on')} onClick=${() => setOffset(0)}>오늘</button><button type="button" class="tl-navb" aria-label="다음 주" onClick=${() => setOffset(o => o + 1)}>${I('ChevronRight', 15)}</button><strong>${label}</strong></div>
   <div class="tl-opts"><button type="button" class="chip" aria-pressed=${showShort} onClick=${() => setShowShort(v => !v)}>3일 미만도 보기${!showShort && short > 0 && html`<span>${short}</span>`}</button><div class="tl-seg" role="group" aria-label="보는 기간">${[[14, '2주'], [28, '4주']].map(([v, l]) => html`<button type="button" key=${v} class=${cx(range === v && 'on')} aria-pressed=${range === v} onClick=${() => setRange(v)}>${l}</button>`)}</div></div>
  </div>
  <div class="tl-desk"><div class="tl-chart">
   <div class="tl-grid" style=${cols}>${days.map(d => html`<i key=${d} class=${cx(we(d) && 'we')}></i>`)}${tIdx >= 0 && tIdx < N && html`<b class="tl-now" style=${`left:${P(nowPos)}`}></b>`}</div>
   <div class="tl-row tl-head"><span></span><div class="tl-days" style=${cols}>${days.map((d, i) => html`<span key=${d} class=${cx(i === tIdx && 'now', we(d) && 'we')}>${i === 0 || d.endsWith('-01') ? `${Number(d.slice(5, 7))}/${Number(d.slice(8))}` : Number(d.slice(8))}<small>${i === tIdx ? '오늘' : '일월화수목금토'[teamWeekday(d)]}</small></span>`)}</div></div>
   ${groups.map(g => html`<div class="tl-row tl-group" key=${g.key}>${whoOf(g)}<div class="tl-lanes">${g.list.length ? g.list.map(lane) : html`<p class="tl-empty">이 기간 업무 없음</p>`}</div></div>`)}
  </div></div>
  <div class="tl-mob">${groups.map(g => html`<div class="tl-mgroup" key=${g.key}>${whoOf(g)}${g.list.length ? g.list.map(mrow) : html`<p class="tl-empty">이 기간 업무 없음</p>`}</div>`)}</div>
  <div class="tl-foot">
   <div class="tl-legend"><span><i class="sw fill"></i>채움 끝 = 진행률만큼 온 날</span><span><i class="sw now"></i>오늘</span><span><i class="sw todo"></i>예정</span><span><i class="sw hot"></i>급함 · 오늘·내일 마감</span><span><i class="sw late"></i>마감 지남</span><span><i class="sw risk"></i>지연 위험</span>${onPatch ? html`<span class="tl-hint">막대를 끌어 일정 이동 · 양 끝을 끌어 시작일·마감 조정</span>` : ''}${outside > 0 && html`<span class="tl-outside">이 기간 밖 ${outside}건</span>`}</div>
   ${missing.length > 0 && html`<div class="tl-missing"><span>시작일이나 마감이 없어 빠진 업무 ${missing.length}건</span>${missing.slice(0, 8).map(x => html`<button type="button" class="chip" key=${x.id} title="눌러서 시작일·마감 정하기" onClick=${() => onOpen(x.id)}>${x.title}</button>`)}${missing.length > 8 && html`<small>외 ${missing.length - 8}건</small>`}</div>`}
  </div>
 </div>`;
}

function TeamOrders({items, who, onWho, isAdmin, cmap, onOpen, onCreate, onImport, onPatch, onChecklist, onHandoff, busy, me}) {
 const [checksOpen, setChecksOpen] = useState({});
 const [title, setTitle] = useState(''), [assignee, setAssignee] = useState(isAdmin ? '' : (me && me.name) || ''), [dueMode, setDueMode] = useState('none'), [dueDate, setDueDate] = useState(''), [priority, setPriority] = useState('share');
 const names = teamNames();
 const dueOf = () => dueMode === 'today' ? today() : dueMode === 'tomorrow' ? offsetDate(today(), 1) : dueMode === 'dayafter' ? offsetDate(today(), 2) : dueMode === 'date' ? dueDate : '';
 async function submit(e) { e.preventDefault(); const t = title.trim(); if (!t || busy) return; try { await onCreate({title: t.slice(0, 150), assignee, due: dueOf(), priority}); setTitle(''); } catch {} }
 const list = (who === 'all' ? items : who === 'none' ? items.filter(x => !x.assignee) : items.filter(x => teamHas(x, who))).sort(teamByDue);
 const filters = [['all', '전체', items.length], ...names.map(n => [n, n, items.filter(x => teamHas(x, n)).length]), ['none', '미배정', items.filter(x => !x.assignee).length]];
 return html`<section class="tb-orders">
  <form class="quick-task pl-add tb-add" onSubmit=${submit}><div class="quick-compose">${I('Plus', 18)}<input aria-label="오더 제목" placeholder=${isAdmin ? '디자인팀에 맡길 일을 한 줄로 적고 Enter' : '내가 맡은 일이나 팀에 올릴 업무를 한 줄로 적고 Enter'} maxLength="150" value=${title} onInput=${e => setTitle(e.target.value)} /><button class="quick-submit" disabled=${!title.trim() || busy} aria-label="오더 등록">${I('ArrowRight', 18)}</button></div>
   <div class="quick-task-options">
    <div class="chip-group" role="group" aria-label="담당"><span>담당</span>${[['', '미배정'], ...names.map(n => [n, n]), ['모두', '셋 다']].map(([v, l]) => html`<button type="button" key=${l} class="chip" aria-pressed=${teamOn(assignee, v)} onClick=${() => setAssignee(a => teamToggle(a, v))}>${l}</button>`)}</div>
    <div class="chip-group" role="group" aria-label="마감"><span>마감</span>${[['none', '없음'], ['today', '오늘'], ['tomorrow', '내일'], ['dayafter', '모레']].map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${dueMode === v} onClick=${() => setDueMode(v)}>${l}</button>`)}<input type="date" class="chip-date" aria-label="마감일 직접 선택" value=${dueMode === 'date' ? dueDate : ''} onInput=${e => { setDueDate(e.target.value); setDueMode(e.target.value ? 'date' : 'none'); }} /></div>
    <div class="chip-group" role="group" aria-label="중요도"><span>중요도</span>${Object.entries(taskPriorities).map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${priority === v} onClick=${() => setPriority(v)}>${l}</button>`)}</div>
   </div></form>
  <div class="tb-bar"><div class="dv-who" role="group" aria-label="담당 필터">${filters.map(([v, l, n]) => html`<button type="button" key=${v} class="chip" aria-pressed=${who === v} onClick=${() => onWho(v)}>${l}<span>${n}</span></button>`)}</div>${isAdmin && html`<button type="button" class="tb-import-btn" onClick=${onImport}>${I('Download', 15)}A 보드에서 불러오기</button>`}</div>
  <div class="pl-group tb-list">${!list.length ? html`<p class="tb-none pad">${who === 'all' ? '아직 오더가 없어요. 위에서 적거나 A 보드에서 불러와 주세요.' : '해당하는 업무가 없어요.'}</p>` : list.map(x => { const d = dDay(x.due), st = checkStat(x); return html`<div class=${cx('tb-row', x.issue && 'has-issue', x.priority !== 'share' && 'prio-' + x.priority)} key=${x.id}>
   <${TeamDuePick} x=${x} busy=${busy} onPatch=${onPatch} />
   <div class="tb-row-main"><button type="button" class="pl-title" onClick=${() => onOpen(x.id)}><strong>${x.title}</strong>${x.due ? html`<span class="pl-date">${shortDate(x.due)} 마감</span>` : ''}</button>${descLine(x) && html`<button type="button" class="pl-desc" onClick=${() => onOpen(x.id)}>${descLine(x)}</button>`}
    <span class="pl-tags">${teamStartLabel(x) && html`<span class=${cx('tag tb-start', x.start_on < today() && 'late')}>${I('CalendarDays', 12)}${teamStartLabel(x)}</span>`}${x.src_board && html`<span class="tag tb-src" title=${`${x.src_board} 보드 원본: ${x.src_title}`}>${I('Link2', 12)}${x.src_board}${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}${x.issue && html`<span class=${'tag tb-issue ' + x.issue}>${I('AlertCircle', 12)}${TEAM_ISSUES[x.issue]}</span>`}<button type="button" class=${cx('tag tb-check-chip', checksOpen[x.id] && 'on', !st.total && 'empty')} aria-expanded=${!!checksOpen[x.id]} onClick=${() => setChecksOpen(o => ({...o, [x.id]: !o[x.id]}))}>${I('ListChecks', 12)}${st.total ? `세부 ${st.done}/${st.total}` : '세부 업무'}${I(checksOpen[x.id] ? 'ChevronUp' : 'ChevronDown', 12)}</button><button type="button" class=${cx('reply-chip', cmap[x.id] && 'has')} onClick=${() => onOpen(x.id)}>${I('MessageCircle', 12)}${cmap[x.id] ? `댓글 ${cmap[x.id]}` : '댓글'}</button></span></div>
   <${TeamWhoPick} x=${x} busy=${busy} onPatch=${onPatch} onHandoff=${onHandoff} />
   <span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>
   <span class="tb-prog"><i><b style=${`width:${x.progress || 0}%`}></b></i><em>${x.progress || 0}%</em></span>
   <select class=${'tb-status-sel ' + x.status} aria-label="상태" value=${x.status} disabled=${busy} onChange=${e => onPatch(x, {status: e.target.value}, `상태 ${statuses[e.target.value]}`)}>${Object.entries(statuses).map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}</select>
   ${checksOpen[x.id] && html`<div class="tb-arow-checks"><${Checklist} item=${x} editable=${true} busy=${busy} onAct=${onChecklist} compact=${true} /></div>`}
  </div>`; })}</div>
 </section>`;
}

// Mini: 줄 모양(C는 TeamMini, A·B는 AbMini).
function TeamDue({items, done, cmap, onOpen, Mini = TeamMini, tools = null}) {
 const [f, setF] = useState('all');
 const t = today(), wEnd = offsetDate(mondayOf(t), 6), nEnd = offsetDate(wEnd, 7);
 const groups = [['late', '지난 마감', x => x.due && x.due < t, 'late'], ['today', '오늘', x => x.due === t, 'today'], ['week', '이번 주', x => x.due > t && x.due <= wEnd, ''], ['next', '다음 주', x => x.due > wEnd && x.due <= nEnd, ''], ['later', '그 후', x => x.due > nEnd, ''], ['none', '마감 없음', x => !x.due, 'muted']];
 const sorted = [...items].sort(teamByDue), fin = [...done].filter(x => x.due).sort((a, b) => doneAt(b).localeCompare(doneAt(a)));
 const chips = [['all', '전체', items.length], ...groups.map(([k, l, fn]) => [k, l, sorted.filter(fn).length]), ['done', '마감 완료', fin.length]];
 const shown = f === 'all' ? groups : groups.filter(g => g[0] === f);
 const row = x => html`<${Mini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} extra=${x.due ? html`<span class="tb-date">${teamDay(x.due)}</span>` : ''} />`;
 return html`<section class="tb-due">
  <div class="dv-who tb-due-chips" role="group" aria-label="마감 구분">${chips.map(([k, l, n]) => html`<button type="button" key=${k} class=${cx('chip', k === 'late' && n && 'late')} aria-pressed=${f === k} onClick=${() => setF(k)}>${l}<span>${n}</span></button>`)}${tools && html`<span class="dv-tools">${tools}</span>`}</div>
  ${f === 'done' ? (fin.length ? html`<div class="pl-group tb-due-group done"><div class="pl-group-head"><span>마감 완료</span><small>${fin.length}건 · 최근 완료순</small></div>${fin.slice(0, 80).map(x => html`<${Mini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} extra=${html`<span class=${cx('tb-date', inSeoul(doneAt(x)) > x.due && 'late')}>${shortDate(x.due)} 마감 · ${teamDay(inSeoul(doneAt(x)))} 완료${inSeoul(doneAt(x)) > x.due ? ' (늦음)' : ''}</span>`} />`)}</div>` : html`<p class="tb-none pad">마감일이 있던 완료 업무가 아직 없어요.</p>`)
   : shown.map(([k, l, fn, c]) => { const list = sorted.filter(fn); return (list.length > 0 || f !== 'all') && html`<div class=${cx('pl-group tb-due-group', c)} key=${k}><div class="pl-group-head"><span>${l}</span><small>${list.length}건</small></div>${list.length ? list.map(row) : html`<p class="tb-none pad">해당하는 업무가 없어요.</p>`}</div>`; })}
  ${f === 'all' && !items.length && html`<p class="tb-none pad">남은 업무가 없어요.</p>`}
 </section>`;
}

function TeamIssues({items, comments, all, cmap, onOpen, onPatch, busy}) {
 const [view, setView] = useState('open'), [how, setHow] = useState({});
 const resolved = all.flatMap(x => x.issue_log.map((h, i) => ({...h, x, key: x.id + ':' + i}))).sort((a, b) => b.resolved_at.localeCompare(a.resolved_at));
 const recent = comments.filter(c => all.some(x => x.id === c.item_id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15);
 const titleOf = id => (all.find(x => x.id === id) || {}).title || '';
 return html`<section class="tb-issues">
  <div class="pl-group"><div class="pl-group-head tb-issue-head"><span>특이사항</span><div class="dv-who" role="group" aria-label="특이사항 보기"><button type="button" class=${cx('chip', items.length && 'late')} aria-pressed=${view === 'open'} onClick=${() => setView('open')}>열림<span>${items.length}</span></button><button type="button" class="chip" aria-pressed=${view === 'done'} onClick=${() => setView('done')}>해결됨<span>${resolved.length}</span></button></div><small>업무 상세에서 막힘 / 일정 위험 / 확인 필요를 표시하면 여기에 모여요</small></div>
   ${view === 'done' ? (!resolved.length ? html`<p class="tb-none pad">아직 해결된 특이사항이 없어요.</p>` : resolved.map(h => html`<div class="tb-issue-row resolved" key=${h.key}><span class=${'tb-issue ' + h.issue}>${I('Check', 13)}${TEAM_ISSUES[h.issue]}</span><button type="button" class="tb-issue-main" onClick=${() => onOpen(h.x.id)}><strong>${h.x.title}</strong><span>${h.note || TEAM_ISSUE_HINT[h.issue]}</span>${h.how && html`<span class="tb-issue-how">${I('Check', 12)}${h.how}</span>`}<small>보고 ${h.by || '-'}${h.at ? ` · ${teamDay(inSeoul(h.at))} ${teamClock(h.at)}` : ''} → 해결 ${h.resolved_by} · ${teamDay(inSeoul(h.resolved_at))} ${teamClock(h.resolved_at)}</small></button><span class="tb-date">${h.x.status === 'done' ? '업무 완료' : statuses[h.x.status]}</span></div>`)) : !items.length ? html`<p class="tb-none pad">지금 보고된 특이사항이 없어요.</p>` : items.map(x => html`<div class=${'tb-issue-row ' + x.issue} key=${x.id}><span class=${'tb-issue ' + x.issue}>${I('AlertCircle', 13)}${TEAM_ISSUES[x.issue]}</span><button type="button" class="tb-issue-main" onClick=${() => onOpen(x.id)}><strong>${x.title}</strong><span>${x.issue_note || TEAM_ISSUE_HINT[x.issue]}</span><small>${x.issue_by || ''}${x.issue_at ? ` · ${teamDay(inSeoul(x.issue_at))} ${teamClock(x.issue_at)}` : ''} · 담당 ${teamWho(x.assignee)} · ${dDay(x.due).label}</small></button><span class="tb-resolve"><input maxLength="200" placeholder="어떻게 해결했는지 (선택)" value=${how[x.id] || ''} onInput=${e => { const v = e.target.value; setHow(h => ({...h, [x.id]: v})); }} /><button type="button" class="dv-undo" disabled=${busy} onClick=${() => onPatch(x, {issue: '', issue_note: '', issue_how: (how[x.id] || '').trim()}, '특이사항 해결')}>해결</button></span></div>`)}</div>
  <div class="pl-group"><div class="pl-group-head"><span>최근 댓글 · 보고</span><small>${recent.length}건</small></div>${!recent.length ? html`<p class="tb-none pad">아직 댓글이 없어요.</p>` : recent.map(c => html`<button type="button" class="tb-feed" key=${c.id} onClick=${() => onOpen(c.item_id)}><${Av} name=${personName(c.author_name)} mini /><span><strong>${personName(c.author_name)}</strong><em>${titleOf(c.item_id)}</em><p>${c.body}</p></span><small>${teamDay(inSeoul(c.created_at))} ${teamClock(c.created_at)}</small></button>`)}</div>
 </section>`;
}

function TeamDone({items, cmap, onOpen, onPatch, busy}) {
 const [limit, setLimit] = useState(60);
 const list = [...items].sort((a, b) => doneAt(b).localeCompare(doneAt(a)));
 const groups = []; list.slice(0, limit).forEach(x => { const d = inSeoul(doneAt(x)) || '날짜 없음'; const g = groups[groups.length - 1]; if (g && g.day === d) g.items.push(x); else groups.push({day: d, items: [x]}); });
 return html`<section class="done-view">${!list.length && html`<p class="dv-empty">아직 완료한 업무가 없어요.</p>`}${groups.map(g => html`<div class="pl-group dv-group" key=${g.day}><div class="pl-group-head"><span>${teamDay(g.day)}</span><small>${g.items.length}건</small></div>${g.items.map(x => html`<div class="dv-row" key=${x.id}><span class="dv-check">${I('Check', 14)}</span><div class="dv-main"><button type="button" class="dv-title" onClick=${() => onOpen(x.id)}><strong>${x.title}</strong>${x.due ? html`<span class="pl-date">${shortDate(x.due)} 마감${inSeoul(doneAt(x)) > x.due ? ' · 늦게 완료' : ''}</span>` : ''}</button><span class="pl-tags"><span class="tag">${teamWho(x.assignee)}</span>${x.src_board && html`<span class="tag tb-src">${x.src_board}${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}${cmap[x.id] ? html`<span class="tag">댓글 ${cmap[x.id]}</span>` : ''}</span></div><span class="dv-time">${teamClock(doneAt(x))}</span><button type="button" class="dv-undo" disabled=${busy} onClick=${() => onPatch(x, {status: 'doing'}, '완료 취소')}>되돌리기</button></div>`)}</div>`)}${list.length > limit && html`<button type="button" class="dv-more" onClick=${() => setLimit(l => l + 60)}>이전 완료 더 보기 (${list.length - limit}건)</button>`}</section>`;
}

function TeamDetail({handoffFrom = null, item: x, comments, me, isAdmin, busy, onClose, onPatch, onChecklist, onComment, onEditComment, onDeleteComment, onMark, onRemove, onAddLink, onRemoveLink, onRefreshSource, onSendTo, onUnlink}) {
 const [linkOpen, setLinkOpen] = useState(() => { try { return localStorage.getItem('ps.teamLinkOpen') === '1'; } catch { return false; } });
 const toggleLink = () => setLinkOpen(v => { try { localStorage.setItem('ps.teamLinkOpen', v ? '0' : '1'); } catch {} return !v; });
 const [full, setFull] = useState(false), [sendBoard, setSendBoard] = useState(''), startWho = useRef(handoffFrom !== null ? handoffFrom : x.assignee), [hoNote, setHoNote] = useState(''), [hoOpen, setHoOpen] = useState(false), [histAll, setHistAll] = useState(false), [hoAll, setHoAll] = useState(false);
 const whoChanged = startWho.current !== x.assignee && !!startWho.current;
 async function saveHandoff() { const note = hoNote.trim(); if (!note) return; const to = teamWho(x.assignee), from = whoChanged ? teamWho(startWho.current) : to; try { await onPatch(x, {handoffs: [...x.handoffs, {at: nowIso(), by: me.name, from, to, note: note.slice(0, 2000)}]}, from === to ? '인수인계 메모' : `인수인계 ${from} → ${to}`); startWho.current = x.assignee; setHoNote(''); setHoOpen(false); } catch {} }
 const lastHo = x.handoffs[x.handoffs.length - 1];
 useEffect(() => { if (x.src_board) onRefreshSource(x); }, [x.id]);
 const [issue, setIssue] = useState(x.issue), [note, setNote] = useState(x.issue_note), [text, setText] = useState(''), [editing, setEditing] = useState(null), [editText, setEditText] = useState('');
 useEffect(() => { setIssue(x.issue); setNote(x.issue_note); }, [x.id, x.issue, x.issue_note]);
 const names = teamNames(), canDelete = isAdmin || x.author_id === me.id;
 const saveIssue = () => onPatch(x, issue ? {issue, issue_note: note.trim().slice(0, 300), issue_at: nowIso(), issue_by: me.name} : {issue: '', issue_note: ''}, issue ? `특이사항 ${TEAM_ISSUES[issue]}` : '특이사항 해결');
 async function send(e) { e.preventDefault(); if (!text.trim()) return; try { await onComment(x, text); setText(''); } catch {} }
 const header = html`<div class="sheet-head tb-detail-head"><span class=${'tag ' + x.status}>${statuses[x.status]}</span>${x.src_board && html`<span class="tag tb-src">${I('Link2', 12)}${x.src_board} 보드에서 ${x.history.length && /보냄|연결/.test(x.history[0].text) ? '연결' : '불러옴'}${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}</div>`;
 return html`<${Sheet} class="tb-detail" onClose=${onClose} header=${header}>
  <div class="tb-detail-body">
   <${AutoText} class="tb-d-title" single value=${x.title} label="업무 제목" maxLength="150" disabled=${busy} onCommit=${v => onPatch(x, {title: v}, '제목 수정')} />
   <button type="button" class="tb-full-btn" onClick=${() => setFull(true)}>${I('NotebookPen', 15)}업무 자세히 보기<small>${[x.body || x.src_body ? '내용' : '', x.spec.length ? `세부 업무 ${x.spec.length}` : '', x.links.length + x.src_links.length ? `링크 ${x.links.length + x.src_links.length}` : ''].filter(Boolean).join(' · ') || '내용 · 세부 업무 · 링크'}</small>${I('ChevronRight', 15)}</button>
   <${AutoText} class="tb-d-body" value=${x.body} label="설명" placeholder="설명이나 요청 사항을 적어 주세요 (레퍼런스, 사이즈, 톤 등)" maxLength="6000" disabled=${busy} onCommit=${v => onPatch(x, {body: v}, '내용 수정')} />
   <div class="tb-fields">
    <div><span>담당</span><div class="tb-chips">${[['', '미배정'], ...names.map(n => [n, n]), ['모두', '셋 다']].map(([v, l]) => html`<button type="button" key=${l} class="chip" aria-pressed=${teamOn(x.assignee, v)} disabled=${busy} onClick=${() => { const n = teamToggle(x.assignee, v); if (n !== x.assignee) onPatch(x, {assignee: n}, n ? `담당 ${teamWho(n)}` : '담당 비움'); }}>${l}</button>`)}<small class="tb-multi-hint">여러 명 선택 가능</small></div></div>
    <div><span>마감</span><div class="tb-chips">${[['', '없음'], [today(), '오늘'], [offsetDate(today(), 1), '내일'], [offsetDate(today(), 2), '모레']].map(([v, l]) => html`<button type="button" key=${l} class="chip" aria-pressed=${x.due === v} disabled=${busy} onClick=${() => x.due !== v && onPatch(x, {due: v}, v ? `마감 ${shortDate(v)}` : '마감 지움')}>${l}</button>`)}<input type="date" class="chip-date" aria-label="마감일" value=${x.due} disabled=${busy} onChange=${e => onPatch(x, {due: e.target.value}, e.target.value ? `마감 ${shortDate(e.target.value)}` : '마감 지움')} /><b class=${cx('dday', dDay(x.due).cls)}>${dDay(x.due).label}</b></div></div>
    <div><span>중요도</span><div class="tb-chips">${Object.entries(taskPriorities).map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${x.priority === v} disabled=${busy} onClick=${() => x.priority !== v && onPatch(x, {priority: v}, `중요도 ${l}`)}>${l}</button>`)}</div></div>
    <div><span>상태</span><div class="tb-chips">${Object.entries(statuses).map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${x.status === v} disabled=${busy} onClick=${() => x.status !== v && onPatch(x, {status: v}, `상태 ${l}`)}>${l}</button>`)}</div></div>
    ${x.status === 'todo' && html`<div><span>착수 예정</span><div class="tb-chips">${[['', '미정'], [today(), '오늘'], [offsetDate(today(), 1), '내일'], [offsetDate(today(), 2), '모레'], [mondayOf(offsetDate(today(), 7)), '다음 주']].map(([v, l]) => html`<button type="button" key=${l} class="chip" aria-pressed=${x.start_on === v} disabled=${busy} onClick=${() => x.start_on !== v && onPatch(x, {start_on: v}, v ? `착수 예정 ${shortDate(v)}` : '착수 예정 미정')}>${l}${l === '다음 주' ? html`<small class="tb-chip-sub">${shortDate(v)}</small>` : ''}</button>`)}<input type="date" class="chip-date" aria-label="착수 예정일" value=${x.start_on} disabled=${busy} onChange=${e => onPatch(x, {start_on: e.target.value}, e.target.value ? `착수 예정 ${shortDate(e.target.value)}` : '착수 예정 미정')} />${x.start_on && html`<b class=${cx('tb-start-tag', x.start_on < today() && 'late')}>${teamStartLabel(x)}</b>`}</div></div>`}
    ${(x.status === 'doing' || x.status === 'hold') && html`<div><span>시작일</span><div class="tb-chips"><button type="button" class="chip" aria-pressed=${x.start_on === today()} disabled=${busy} onClick=${() => x.start_on !== today() && onPatch(x, {start_on: today()}, `시작일 ${shortDate(today())}`)}>오늘</button><input type="date" class="chip-date" aria-label="시작일" value=${x.start_on} disabled=${busy} onChange=${e => onPatch(x, {start_on: e.target.value}, e.target.value ? `시작일 ${shortDate(e.target.value)}` : '시작일 비움')} />${!x.start_on && teamStartOf(x) && html`<small class="tb-start-auto">${shortDate(teamStartOf(x))}부터로 표시 중</small>`}</div></div>`}
    <div><span>진행률</span><div class="tb-chips">${[0, 25, 50, 75, 100].map(v => html`<button type="button" key=${v} class="chip" aria-pressed=${(x.progress || 0) === v} disabled=${busy || x.checklist.length > 0} title=${x.checklist.length ? '세부 업무 체크로 자동 계산돼요' : ''} onClick=${() => onPatch(x, {progress: v}, `진행률 ${v}%`)}>${v}%</button>`)}${![0, 25, 50, 75, 100].includes(x.progress || 0) && html`<b class="tb-pct">${x.progress}%</b>`}</div></div>
   </div>
   <section class=${cx('tb-issue-box', x.issue && 'on ' + x.issue)}><div class="tb-issue-head"><strong>${I('AlertCircle', 15)}특이사항 보고</strong>${x.issue && html`<small>${x.issue_by}${x.issue_at ? ` · ${teamDay(inSeoul(x.issue_at))} ${teamClock(x.issue_at)}` : ''}</small>`}</div>
    <div class="tb-chips">${[['', '없음'], ...Object.entries(TEAM_ISSUES)].map(([v, l]) => html`<button type="button" key=${l} class=${cx('chip', v && 'issue-' + v)} aria-pressed=${issue === v} onClick=${() => setIssue(v)}>${l}</button>`)}</div>
    ${issue && html`<textarea class="tb-issue-note" rows="2" maxLength="300" placeholder="무엇 때문인지 짧게 적어 주세요 (예: 원본 이미지 해상도 부족, 피드백 대기)" value=${note} onInput=${e => setNote(e.target.value)}></textarea>`}
    ${(issue !== x.issue || (issue && note !== x.issue_note)) && html`<button type="button" class="primary-button tb-issue-save" disabled=${busy} onClick=${saveIssue}>${issue ? '특이사항 보고하기' : '특이사항 해결로 바꾸기'}</button>`}
   </section>
   <section class="tb-links"><h3>${I('Link2', 15)}링크 <span>${x.links.length}</span></h3><${LinkChips} links=${x.links} editable=${true} busy=${busy} max=${20} addLabel="링크 공유" idPrefix=${'tbl-' + x.id} meta=${l => `${l.shared_by ? l.shared_by + ' 공유 · ' : ''}${l.url}`} onAdd=${l => onAddLink(x, l)} onRemove=${i => onRemoveLink(x, i)} /></section>
   ${!x.checklist.length && x.src_checks.length > 0 && html`<button type="button" class="tb-pull-wide" disabled=${busy} onClick=${() => pullSrcChecks(x, onPatch)}>${I('ListChecks', 15)}${x.src_board} 원본 세부 업무 ${x.src_checks.length}개 가져오기</button>`}
   <${Checklist} item=${x} editable=${true} busy=${busy} onAct=${onChecklist} />
   ${isAdmin && html`<section class=${cx('tb-send', linkOpen && 'open')}><button type="button" class="tb-send-toggle" aria-expanded=${linkOpen} onClick=${toggleLink}>${I('ArrowUpRight', 15)}<b>다른 보드 연결</b><small>${[x.src_board ? `${x.src_board} 원본 연결됨` : '', ...x.out_links.map(o => o.board + ' 보드로 보냄')].filter(Boolean).join(' · ') || '연결 없음'}</small>${I(linkOpen ? 'ChevronUp' : 'ChevronDown', 15)}</button>${linkOpen && html`<div class="tb-send-body">
    <h3>보내기</h3>
    <div class="tb-chips">${['A', 'B'].map(b => { const done = linkVisOf(x).includes(b); return html`<button type="button" key=${b} class="chip" aria-pressed=${sendBoard === b} disabled=${busy || done} title=${done ? '이 보드에는 이미 연결된 업무가 보여요' : ''} onClick=${() => setSendBoard(sendBoard === b ? '' : b)}>${b} 보드 : ${b === 'A' ? '권중선' : '정규진'}${done ? ' · 연결됨' : ''}</button>`; })}</div>
    ${sendBoard && html`<div class="tb-send-who"><span>${sendBoard} 보드에서 담당</span>${[['me', '이현성'], ['partner', sendBoard === 'A' ? '권중선' : '정규진'], ['both', '함께']].map(([v, l]) => { const dup = boardsSeen(sendBoardOf(sendBoard, v)).find(b => linkVisOf(x).includes(b)); return html`<button type="button" key=${v} class="secondary-button" disabled=${busy || !!dup} title=${dup ? `이현성 혼자 업무는 A·B 공통이라 ${dup} 보드에 같은 업무가 두 번 보여요` : ''} onClick=${async () => { try { await onSendTo(x, sendBoard, v); setSendBoard(''); } catch {} }}>${l}로 보내기</button>`; })}</div>`}
    ${x.out_links.length > 0 && html`<ul class="tb-out">${x.out_links.map(o => html`<li key=${o.id}>${I('Link2', 13)}${o.board} 보드 : ${o.board === 'A' ? '권중선' : '정규진'}에 보냄${o.at ? ` · ${teamDay(inSeoul(o.at))}` : ''}<button type="button" class="text-button" disabled=${busy} onClick=${() => onUnlink(x, o.id)}>연결 끊기</button></li>`)}</ul>`}<small>연결된 업무는 상태 · 마감 · 시작일 · 중요도 · 세부 업무 · 진행률이 양쪽 같이 바뀌어요(이현성 화면이 열려 있을 때 맞춰져요). 양쪽에서 같은 항목을 동시에 바꾸면 디자인팀 보드 기준이에요. 연결을 끊으면 따로 움직여요.</small>
    ${x.src_board && html`<p class="tb-src-line">${I('Link2', 13)}${x.src_board} 보드 원본: <strong>${x.src_title}</strong>${isAdmin ? html` · 진행 상황이 ${x.src_board} 보드 원본에도 표시돼요<button type="button" class="text-button tb-unlink" disabled=${busy} onClick=${() => onUnlink(x, 'src')}>연결 끊기</button>` : ''}</p>`}</div>`}</section>`}
   ${!isAdmin && x.src_board && html`<p class="tb-src-line">${I('Link2', 13)}${x.src_board} 보드 원본: <strong>${x.src_title}</strong></p>`}
   <section class="tb-comments"><h3>${I('MessageCircle', 15)}댓글 · 보고 <span>${comments.length}</span></h3>
    ${comments.map(c => html`<article class="update" key=${c.id}><${Av} name=${personName(c.author_name)} mini /><div><div class="update-meta"><strong>${personName(c.author_name)}</strong><small>${teamDay(inSeoul(c.created_at))} ${teamClock(c.created_at)}${c.edited_at ? ' · 수정됨' : ''}</small>${c.author_id === me.id && editing !== c.id && html`<span class="tb-c-tools"><button type="button" class="text-button" onClick=${() => { setEditing(c.id); setEditText(c.body); }}>수정</button><button type="button" class="text-button" onClick=${() => onDeleteComment(c)}>삭제</button></span>`}</div>${editing === c.id ? html`<form class="tb-c-edit" onSubmit=${async e => { e.preventDefault(); try { await onEditComment(c, editText); setEditing(null); } catch {} }}><textarea rows="2" value=${editText} onInput=${e => setEditText(e.target.value)}></textarea><div><button type="button" class="secondary-button" onClick=${() => setEditing(null)}>취소</button><button class="primary-button" disabled=${busy || !editText.trim()}>저장</button></div></form>` : html`<${TeamText} text=${c.body} />`}<${TeamMarks} c=${c} me=${me} onMark=${onMark} /></div></article>`)}
    <form class="tb-c-add" onSubmit=${send}><textarea rows="2" maxLength="3000" placeholder="진행 상황, 질문, 시안 링크 등을 남겨 주세요" value=${text} onInput=${e => setText(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e); }}></textarea><button class="primary-button" disabled=${busy || !text.trim()}>${I('Send', 14)}남기기</button></form>
   </section>
   <${TeamHistory} x=${x} />
   <p class="tb-meta">${x.author_name} 등록 · ${fullTime(x.created_at)}${x.last_change ? ` · 최근: ${x.updated_by_name} ${x.last_change}` : ''}</p>
   ${canDelete && html`<button type="button" class="text-button tb-delete" disabled=${busy} onClick=${() => onRemove(x)}>${I('Trash2', 14)}업무 지우기</button>`}
  </div>
  ${full && html`<${TeamFull} x=${x} comments=${comments} busy=${busy} onClose=${() => setFull(false)} onChecklist=${onChecklist} onAddLink=${onAddLink} onRemoveLink=${onRemoveLink} onPatch=${onPatch} />`}
 <//>`;
}

// 업무 자세히 보기: 내용 · 세부 업무 · 레퍼런스 링크(직접 공유 + A 원본 + 글·댓글 속 주소)를 한 화면에.
const pullSrcChecks = (x, onPatch) => { const list = normChecklist(x.src_checks).map(c => ({...c, id: newCheckId()})); return onPatch(x, {checklist: list, progress: checkStat({checklist: list}).pct}, `원본 세부 업무 ${list.length}개 가져옴`); };
// 업무 기록: 날짜별로 묶고, 같은 사람이 10분 안에 같은 항목을 여러 번 바꾸면 '처음 → 마지막' 한 줄로 합친다.
const HIST = {assign: ['UserRound', '담당'], status: ['Check', '상태'], due: ['CalendarClock', '마감'], priority: ['Flag', '중요도'], progress: ['Gauge', '진행률'], check: ['ListChecks', '세부 업무'], spec: ['NotebookPen', '요청 세부'], start: ['CalendarDays', '시작일'], issue: ['AlertCircle', '특이사항'], handoff: ['MoveRight', '인수인계'], link: ['Link2', '링크'], title: ['Pencil', '제목'], body: ['NotebookPen', '설명'], create: ['Plus', '등록'], sync: ['RefreshCw', '보드 연동']};
function TeamHistory({x}) {
 const [all, setAll] = useState(false), [memo, setMemo] = useState({});
 const merged = [];
 for (const h of x.history) {
  const kind = h.kind || (/^인수인계/.test(h.text) ? 'handoff' : /^담당/.test(h.text) ? 'assign' : /^상태/.test(h.text) ? 'status' : /^마감/.test(h.text) ? 'due' : /^중요도/.test(h.text) ? 'priority' : /^진행률/.test(h.text) ? 'progress' : /세부 업무/.test(h.text) ? 'check' : /^특이사항/.test(h.text) ? 'issue' : /링크/.test(h.text) ? 'link' : /^(등록|A 보드에서 불러옴)/.test(h.text) ? 'create' : '');
  const e = {...h, kind}, last = merged[merged.length - 1];
  if (last && ['assign', 'status', 'due', 'priority', 'progress'].includes(kind) && last.kind === kind && last.by === e.by && e.from !== null && last.from !== null && Date.parse(e.at) - Date.parse(last.at) < 600000) { last.to = e.to; last.at = e.at; last.n = (last.n || 1) + 1; }
  else merged.push(e);
 }
 const noteOf = h => h.note || ((x.handoffs || []).find(o => Math.abs(Date.parse(o.at) - Date.parse(h.at)) < 10000) || {}).note || '';
 const rows = merged.reverse().filter(h => !(h.from !== null && h.to !== null && h.from === h.to && h.kind !== 'handoff')), shown = all ? rows : rows.slice(0, 10);
 const groups = []; shown.forEach(h => { const d = inSeoul(h.at); const g = groups[groups.length - 1]; if (g && g.day === d) g.list.push(h); else groups.push({day: d, list: [h]}); });
 const detail = h => h.from !== null && h.to !== null ? (h.kind === 'handoff' && h.from === h.to ? html`<span class="th-val">담당 ${h.to}</span>` : html`<span class="th-val"><s>${h.from}</s><b>→</b><em>${h.to}</em></span>`) : html`<span class="th-val plain">${h.kind && HIST[h.kind] ? h.text.replace(new RegExp('^' + HIST[h.kind][1] + '\\s*'), '') : h.text}</span>`;
 return html`<section class="tb-history"><h3>${I('History', 15)}기록 <span>${rows.length}</span></h3>
  ${!rows.length ? html`<p class="tb-none">아직 기록이 없어요. 이제부터 바뀐 내용이 여기에 쌓여요.</p>` : groups.map(g => html`<div class="th-day" key=${g.day}><div class="th-date">${teamDay(g.day)}</div><ul>${g.list.map((h, i) => { const meta = HIST[h.kind] || ['Pencil', '변경'], note = h.kind === 'handoff' ? noteOf(h) : ''; return html`<li key=${h.at + i} class=${'th-' + (h.kind || 'etc')}>
   <time>${teamClock(h.at)}</time><span class="th-ico">${I(meta[0], 13)}</span><span class="th-label">${meta[1]}</span>${detail(h)}${h.n > 1 ? html`<small class="th-n">${h.n}번 바꿈</small>` : ''}${note && html`<button type="button" class=${cx('th-memo', memo[h.at] && 'on')} title="인수인계 메모 보기" onClick=${() => setMemo(m => ({...m, [h.at]: !m[h.at]}))}>${I('NotebookPen', 13)}메모</button>`}<span class="th-by">${h.by}</span>
   ${note && memo[h.at] && html`<div class="th-note"><${TeamText} text=${note} /></div>`}
  </li>`; })}</ul></div>`)}
  ${rows.length > 10 && html`<button type="button" class="text-button th-more" onClick=${() => setAll(v => !v)}>${all ? '접기' : `전체 ${rows.length}건 보기`}</button>`}
 </section>`;
}
// 자세히 보기의 세부 업무: 처음 요청할 때 정해 두는 항목. 실무 세부 업무(진행률)와 따로 움직인다.
function TeamSpec({x, busy, onPatch}) {
 const [text, setText] = useState(''), [edit, setEdit] = useState(null), [val, setVal] = useState('');
 const save = (list, msg) => onPatch(x, {spec: list}, msg);
 async function add(e) { e.preventDefault(); const t = text.split('\n').map(v => v.trim()).filter(Boolean); if (!t.length || busy) return; try { await save([...x.spec, ...t.map(v => ({id: newCheckId(), text: v.slice(0, 200), done: false}))], `요청 세부 업무 추가`); setText(''); } catch {} }
 const commit = async c => { const t = val.trim(); setEdit(null); if (!t || t === c.text) return; await save(x.spec.map(s => s.id === c.id ? {...s, text: t.slice(0, 200)} : s), '요청 세부 업무 수정'); };
 return html`<div class="tb-spec">${x.spec.length > 0 && html`<ul>${x.spec.map((c, i) => html`<li key=${c.id}><span class="tb-spec-n">${i + 1}</span>${edit === c.id ? html`<input class="check-edit" value=${val} ref=${focusOnMount} maxLength="200" onInput=${e => setVal(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); commit(c); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEdit(null); } }} onBlur=${() => commit(c)} />` : html`<button type="button" class="tb-spec-text" title="눌러서 고치기" disabled=${busy} onClick=${() => { setEdit(c.id); setVal(c.text); }}><${TeamText} text=${c.text} /></button>`}<button type="button" class="link-chip-x" aria-label="빼기" disabled=${busy} onClick=${() => save(x.spec.filter(s => s.id !== c.id), '요청 세부 업무 빼기')}>${I('X', 12)}</button></li>`)}</ul>`}
  <form class="check-add" onSubmit=${add}>${I('Plus', 14)}<input value=${text} maxLength="200" placeholder=${x.spec.length ? '항목 추가 후 Enter' : '요청할 세부 항목을 적고 Enter (여러 줄 붙여넣기 가능)'} onInput=${e => setText(e.target.value)} onPaste=${async e => { const raw = (e.clipboardData && e.clipboardData.getData('text')) || ''; if (!/\n/.test(raw.trim())) return; e.preventDefault(); const t = bodyToChecks(raw); if (t.length && !busy) await save([...x.spec, ...t.map(v => ({id: newCheckId(), text: v, done: false}))], `요청 세부 업무 ${t.length}개 추가`); }} /></form>
  ${!x.spec.length && x.checklist.length > 0 && html`<button type="button" class="tb-pull" disabled=${busy} onClick=${() => save(x.checklist.map(c => ({id: newCheckId(), text: c.text, done: false})), `요청 세부 업무 ${x.checklist.length}개 복사`)}>지금 실무 세부 업무 ${x.checklist.length}개 복사해 오기</button>`}
 </div>`;
}
function TeamFull({x, comments, busy, onClose, onChecklist, onAddLink, onRemoveLink, onPatch}) {
 const d = dDay(x.due), st = checkStat(x), srcSt = checkStat({checklist: x.src_checks});
 const known = new Set([...x.links, ...x.src_links].map(l => l.url));
 const found = []; const push = (url, from, at) => { if (!known.has(url)) { known.add(url); found.push({url, from, at}); } };
 teamUrlsIn(x.body).forEach(u => push(u, '설명', x.created_at)); teamUrlsIn(x.src_body).forEach(u => push(u, `${x.src_board || 'A'} 원본 설명`, ''));
 comments.forEach(c => teamUrlsIn(c.body).forEach(u => push(u, `${personName(c.author_name)} 댓글`, c.created_at)));
 const linkRow = (l, sub, i, removable) => html`<li key=${l.url + i}><a href=${safeLink(l.url)} target="_blank" rel="noreferrer">${I('Link2', 14)}<span><strong>${l.label || linkName(l)}</strong><small>${sub}</small></span>${I('ArrowUpRight', 14)}</a>${removable && html`<button type="button" class="link-chip-x" aria-label="링크 빼기" title="링크 빼기" disabled=${busy} onClick=${() => onRemoveLink(x, i)}>${I('X', 12)}</button>`}</li>`;
 const srcOnly = x.src_links.filter(l => !x.links.some(k => k.url === l.url)), linkCount = x.links.length + srcOnly.length + found.length;
 return html`<${Dialog} class="tb-full" title=${x.title} onClose=${onClose}>
  <div class="tb-full-meta"><span class=${'tag ' + x.status}>${statuses[x.status]}</span><span class="tag">담당 ${teamWho(x.assignee)}</span><span class=${cx('dday', d.cls)}>${x.due ? `${shortDate(x.due)} 마감 · ${d.label}` : '마감 없음'}</span>${x.priority !== 'share' && html`<span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>`}<span class="tb-full-pct"><i><b style=${`width:${x.progress || 0}%`}></b></i>${x.progress || 0}%</span>${x.issue && html`<span class=${'tag tb-issue ' + x.issue}>${TEAM_ISSUES[x.issue]}${x.issue_note ? ` · ${x.issue_note}` : ''}</span>`}</div>
  <div class="tb-full-body">
   <section><h3>내용</h3><${AutoText} class="tb-d-body tb-full-edit" value=${x.body} label="내용" placeholder="요청 내용 · 레퍼런스 · 사이즈 · 톤 등을 적어 주세요" maxLength="6000" disabled=${busy} onCommit=${v => onPatch(x, {body: v}, '내용 수정')} />
    ${x.src_board && x.src_body && x.src_body.trim() !== x.body.trim() && html`<div class="tb-full-src"><h4>${I('Link2', 13)}${x.src_board} 보드 원본 내용</h4><${TeamText} text=${x.src_body} /></div>`}</section>
   <section><h3>세부 업무 <span>${x.spec.length ? `${x.spec.length}개 · 처음 요청할 때 정한 항목` : '처음 요청할 때 정한 항목'}</span></h3><${TeamSpec} x=${x} busy=${busy} onPatch=${onPatch} />
    ${x.src_checks.length > 0 && !x.spec.length && html`<div class="tb-full-src"><h4>${I('Link2', 13)}${x.src_board} 보드 원본 세부 업무 <span>${srcSt.done}/${srcSt.total}</span><button type="button" class="tb-pull" disabled=${busy} onClick=${() => onPatch(x, {spec: normChecklist(x.src_checks).map(c => ({id: newCheckId(), text: c.text, done: false}))}, `요청 세부 업무 ${x.src_checks.length}개 가져옴`)}>여기로 가져오기</button></h4><ul class="tb-src-checks">${x.src_checks.map(c => html`<li key=${c.id} class=${cx(c.done && 'done')}><span class="check-box">${c.done ? I('Check', 11) : ''}</span>${c.text}${!c.done && c.pct ? html`<small>${c.pct}%</small>` : ''}</li>`)}</ul></div>`}</section>
   <section><h3>링크 <span>${linkCount}</span></h3>
    <ul class="tb-full-links">${x.links.map((l, i) => linkRow(l, `${l.shared_by ? l.shared_by + ' 공유' : '공유한 링크'}${l.shared_at ? ` · ${teamDay(inSeoul(l.shared_at))}` : ''} · ${l.url}`, i, true))}${srcOnly.map((l, i) => linkRow(l, `${x.src_board || 'A'} 보드 원본 · ${l.url}`, 'src' + i, false))}${found.map((f, i) => linkRow({url: f.url, label: ''}, `${f.from}에서${f.at ? ` · ${teamDay(inSeoul(f.at))}` : ''}`, 'f' + i, false))}</ul>
    ${!linkCount && html`<p class="tb-none">아직 공유된 링크가 없어요.</p>`}
    <${LinkChips} links=${[]} editable=${true} busy=${busy} max=${20} addLabel="링크 공유" idPrefix=${'tbf-' + x.id} onAdd=${l => onAddLink(x, l)} onRemove=${() => {}} /></section>
  </div>
 <//>`;
}

function TeamImport({existing, busy, onClose, onImport, onCreate}) {
 const [newTitle, setNewTitle] = useState('');
 const [state, setState] = useState({loading: true, rows: [], topics: [], error: ''}), [topic, setTopic] = useState('all'), [picked, setPicked] = useState(new Set()), [assignee, setAssignee] = useState(''), [showDone, setShowDone] = useState(false);
 useEffect(() => { (async () => {
  try {
   if (!window.PS_READ_BOARD) throw new Error('이 화면에서는 A 보드를 읽을 수 없어요.');
   const r = await window.PS_READ_BOARD('A'); const tname = Object.fromEntries(r.topics.map(t => [t.id, t.name]));
   const rows = r.items.filter(d => d.kind === 'task' && (d.home || 'A') === 'A').map(d => ({id: d.id, title: String(d.title || ''), body: String(d.body || ''), due: String(d.due || ''), priority: priorities[d.priority] ? d.priority : 'share', status: statuses[d.status] ? d.status : 'todo', progress: Math.max(0, Math.min(100, Math.round(Number(d.progress) || 0))), start_on: DATE_RE.test(d.start_on || '') ? d.start_on : '', done_at: String(d.done_at || ''), assignee: personName(d.assignee || '함께'), topic_id: String(d.topic_id || ''), topic: tname[d.topic_id] || '', checklist: normChecklist(d.checklist), links: teamLinks(d.links), created_at: String(d.created_at || ''), linked: !!(d.c_link && d.c_link.id)})).sort(teamByDue);
   setState({loading: false, rows, topics: r.topics.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), error: ''});
  } catch (e) { console.error('import read', e); setState({loading: false, rows: [], topics: [], error: friendlyError(e)}); }
 })(); }, []);
 const taken = r => existing.has(r.id) || r.linked;
 const pool = state.rows.filter(r => (showDone || r.status !== 'done') && (topic === 'all' || (topic === 'none' ? !r.topic : r.topic_id === topic)));
 const avail = pool.filter(r => !taken(r));
 const toggle = id => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
 const chosen = state.rows.filter(r => picked.has(r.id) && !taken(r));
 const names = teamNames();
 return html`<${Dialog} class="tb-import" title="A 보드에서 불러오기" description="A 보드 업무를 디자인팀 오더로 가져와요. 원본은 A에 그대로 남고, 디자인팀 진행 상황이 원본에 표시돼요." onClose=${onClose}>
  ${state.loading ? html`<div class="loading">${I('Loader2', 20, {class: 'spin'})}A 보드 업무를 읽는 중이에요.</div>` : state.error ? html`<p class="form-error">${state.error}</p>` : html`<${Fragment}>
   <form class="tb-imp-new" onSubmit=${async e => { e.preventDefault(); const t = newTitle.trim(); if (!t || busy) return; try { await onCreate({title: t.slice(0, 150), assignee}); setNewTitle(''); } catch {} }}>${I('Plus', 15)}<input maxLength="150" placeholder="A에 없는 업무는 여기서 바로 만들기 (담당은 아래에서 선택)" value=${newTitle} onInput=${e => setNewTitle(e.target.value)} /><button class="secondary-button" disabled=${busy || !newTitle.trim()}>만들기</button></form>
   <div class="tb-imp-filter"><div class="dv-who" role="group" aria-label="카테고리">${[['all', '전체'], ...state.topics.map(t => [t.id, t.name]), ['none', '미분류']].map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${topic === v} onClick=${() => setTopic(v)}>${l}<span>${state.rows.filter(r => (showDone || r.status !== 'done') && (v === 'all' || (v === 'none' ? !r.topic : r.topic_id === v))).length}</span></button>`)}</div><label class="tb-imp-done"><input type="checkbox" checked=${showDone} onChange=${e => setShowDone(e.target.checked)} />완료 포함</label></div>
   <div class="tb-imp-head"><label><input type="checkbox" checked=${avail.length > 0 && avail.every(r => picked.has(r.id))} disabled=${!avail.length} onChange=${e => setPicked(p => { const n = new Set(p); avail.forEach(r => e.target.checked ? n.add(r.id) : n.delete(r.id)); return n; })} />보이는 업무 모두 선택</label><small>${pool.length}건 중 불러올 수 있는 ${avail.length}건</small></div>
   <ul class="tb-imp-list">${!pool.length && html`<li class="tb-none pad">해당하는 업무가 없어요.</li>`}${pool.map(r => html`<li key=${r.id} class=${cx(taken(r) && 'taken')}><label><input type="checkbox" checked=${picked.has(r.id) && !taken(r)} disabled=${taken(r)} onChange=${() => toggle(r.id)} /><span class="tb-imp-main"><strong>${r.title}</strong><small>${[r.topic || '미분류', r.assignee, statuses[r.status], r.due ? `${shortDate(r.due)} 마감` : '마감 없음'].join(' · ')}</small></span>${taken(r) ? html`<span class="tag tb-src">이미 불러옴</span>` : r.priority !== 'share' && html`<span class=${'tag priority-tag ' + r.priority}>${taskPriorities[r.priority]}</span>`}</label></li>`)}</ul>
   <div class="tb-imp-foot"><div class="chip-group" role="group" aria-label="불러온 업무 담당"><span>담당</span>${[['', '미배정'], ...names.map(n => [n, n]), ['모두', '셋 다']].map(([v, l]) => html`<button type="button" key=${l} class="chip" aria-pressed=${teamOn(assignee, v)} onClick=${() => setAssignee(a => teamToggle(a, v))}>${l}</button>`)}</div>
    <div class="tb-imp-actions"><button type="button" class="secondary-button" disabled=${busy || !avail.length} onClick=${() => onImport(avail, assignee)}>보이는 업무 전체 불러오기 (${avail.length})</button><button type="button" class="primary-button" disabled=${busy || !chosen.length} onClick=${() => onImport(chosen, assignee)}>선택 불러오기 (${chosen.length})</button></div></div>
  <//>`}
 <//>`;
}

// C 보드는 팀 운영 화면, A·B는 기존 공유 보드.
function AppRoot() { return BOARD === 'C' ? html`<${TeamBoard} />` : html`<${Board} />`; }
if (window.PS_MOUNT) window.PS_MOUNT(AppRoot, ShareView); else render(html`<${AppRoot} />`, document.getElementById('app'));

// 확인 요청: 업무 사이에 필요한 확인·자료·피드백을 사람에게 요청하고, 받은 사람이 확인 완료로 닫는다.
function TeamAsks({asks, tasks, comments, me, busy, onCreate, onUpdate, onDelete, onComment, onMark, onEditComment, onDeleteComment, onOpenTask}) {
 const others = SEATS.filter(s => s.key !== me.id).map(s => s.name);
 const [open, setOpen] = useState(false), [f, setF] = useState('me');
 const [form, setForm] = useState({ask_type: 'confirm', to: others[0] || '모두', task_id: '', title: '', body: '', due: 'none', date: ''});
 const [answer, setAnswer] = useState({}), [thread, setThread] = useState({});
 const isForMe = a => a.from_id !== me.id && (a.to === me.name || a.to === '모두');
 const lists = {me: asks.filter(a => a.state === 'open' && isForMe(a)), sent: asks.filter(a => a.state === 'open' && a.from_id === me.id), all: asks.filter(a => a.state === 'open'), done: asks.filter(a => a.state === 'done')};
 const list = [...lists[f]].sort((a, b) => f === 'done' ? b.done_at.localeCompare(a.done_at) : (a.reply_by || '9999').localeCompare(b.reply_by || '9999') || b.created_at.localeCompare(a.created_at));
 const dueOf = () => form.due === 'today' ? today() : form.due === 'tomorrow' ? offsetDate(today(), 1) : form.due === 'dayafter' ? offsetDate(today(), 2) : form.due === 'date' ? form.date : '';
 async function submit(e) { e.preventDefault(); const t = form.title.trim(); if (!t || busy) return; const task = tasks.find(x => x.id === form.task_id); try { await onCreate({ask_type: form.ask_type, to: form.to, task_id: task ? task.id : '', task_title: task ? task.title : '', title: t.slice(0, 150), body: form.body.trim().slice(0, 3000), reply_by: dueOf()}); setForm(v => ({...v, title: '', body: '', task_id: '', due: 'none', date: ''})); setOpen(false); setF('sent'); } catch {} }
 const set = (k, v) => setForm(x => ({...x, [k]: v}));
 return html`<section class="pl-group tb-asks"><div class="pl-group-head tb-asks-head"><span>확인 요청</span><small>업무에 필요한 확인 · 자료 · 피드백을 사람에게 요청해요</small><button type="button" class="tb-import-btn" onClick=${() => setOpen(v => !v)}>${I(open ? 'X' : 'Plus', 15)}${open ? '닫기' : '확인 요청 남기기'}</button></div>
  ${open && html`<form class="tb-ask-form" onSubmit=${submit}>
   <div class="tb-fields">
    <div><span>종류</span><div class="tb-chips">${Object.entries(ASK_TYPES).map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${form.ask_type === v} onClick=${() => set('ask_type', v)}>${l}</button>`)}</div></div>
    <div><span>받는 사람</span><div class="tb-chips">${[...others, '모두'].map(n => html`<button type="button" key=${n} class="chip" aria-pressed=${form.to === n} onClick=${() => set('to', n)}>${n}</button>`)}</div></div>
    <div><span>관련 업무</span><select class="tb-who tb-ask-task" value=${form.task_id} onChange=${e => set('task_id', e.target.value)}><option value="">선택 안 함</option>${[...tasks].sort(teamByDue).map(x => html`<option key=${x.id} value=${x.id}>${x.title}</option>`)}</select></div>
    <div><span>회신 기한</span><div class="tb-chips">${[['none', '없음'], ['today', '오늘'], ['tomorrow', '내일'], ['dayafter', '모레']].map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${form.due === v} onClick=${() => set('due', v)}>${l}</button>`)}<input type="date" class="chip-date" value=${form.due === 'date' ? form.date : ''} onInput=${e => setForm(x => ({...x, date: e.target.value, due: e.target.value ? 'date' : 'none'}))} /></div></div>
   </div>
   <input class="tb-ask-title" maxLength="150" placeholder="무엇을 확인·요청할까요? (예: 메인 배너 시안 B안 확인 부탁)" value=${form.title} onInput=${e => set('title', e.target.value)} />
   <textarea class="tb-ask-body" rows="3" maxLength="3000" placeholder="구체적으로 필요한 것 · 확인할 범위 · 참고 링크 (선택)" value=${form.body} onInput=${e => set('body', e.target.value)}></textarea>
   <div class="tb-ask-actions"><button class="primary-button" disabled=${busy || !form.title.trim()}>${I('Send', 14)}요청 남기기</button></div>
  </form>`}
  <div class="tb-ask-filter"><div class="dv-who" role="group" aria-label="요청 보기">${[['me', '나에게 온'], ['sent', '내가 보낸'], ['all', '열린 요청 전체'], ['done', '완료']].map(([k, l]) => html`<button type="button" key=${k} class=${cx('chip', k === 'me' && lists.me.length && 'late')} aria-pressed=${f === k} onClick=${() => setF(k)}>${l}<span>${lists[k].length}</span></button>`)}</div></div>
  ${!list.length ? html`<p class="tb-none pad">${f === 'me' ? '나에게 온 확인 요청이 없어요.' : f === 'sent' ? '내가 보낸 열린 요청이 없어요.' : f === 'done' ? '완료된 요청이 없어요.' : '열린 요청이 없어요.'}</p>` : list.map(a => { const cs = comments.filter(c => c.item_id === a.id).sort((x, y) => x.created_at.localeCompare(y.created_at)), d = a.reply_by ? dDay(a.reply_by) : null, mine = a.from_id === me.id, canDone = a.state === 'open' && (isForMe(a) || mine), showThread = thread[a.id] || (cs.length > 0 && cs.length <= 2); return html`<article class=${cx('tb-ask', a.state, 'type-' + a.ask_type)} key=${a.id}>
   <div class="tb-ask-top"><span class=${'tb-ask-type ' + a.ask_type}>${ASK_TYPES[a.ask_type]}</span><strong>${a.title}</strong>${d && a.state === 'open' && html`<span class=${cx('dday', d.cls)}>회신 ${d.label === '오늘' ? '오늘까지' : d.label}</span>`}</div>
   <div class="tb-ask-meta"><span>${a.from} → ${a.to}</span><span>${teamDay(inSeoul(a.created_at))} ${teamClock(a.created_at)}</span>${a.task_id && html`<button type="button" class="tag tb-ask-link" onClick=${() => onOpenTask(a.task_id)}>${I('Layers3', 12)}${a.task_title}</button>`}</div>
   ${a.body && html`<${TeamText} text=${a.body} class="tb-ask-text" />`}
   ${a.state === 'done' && html`<div class="tb-ask-done">${I('Check', 13)}<strong>${a.done_by}</strong> 확인 완료 · ${teamDay(inSeoul(a.done_at))} ${teamClock(a.done_at)}${a.answer ? html`<${TeamText} text=${a.answer} />` : ''}</div>`}
   ${showThread && html`<${TeamCommentList} cs=${cs} me=${me} busy=${busy} onMark=${onMark} onEdit=${onEditComment} onDelete=${onDeleteComment} />`}
   <div class="tb-ask-actions">
    ${cs.length > 2 && html`<button type="button" class="text-button" onClick=${() => setThread(t => ({...t, [a.id]: !t[a.id]}))}>${I('MessageCircle', 13)}댓글 ${cs.length} ${thread[a.id] ? '접기' : '보기'}</button>`}
    <${ReplyForm} key=${'r-' + a.id} busy=${busy} label="확인 요청 댓글" placeholder="댓글 · 질문 · 링크 · Shift+Enter 줄바꿈" onSend=${async t => { await onComment(a, t); setThread(x => ({...x, [a.id]: true})); }} />
    ${canDone && html`<span class="tb-ask-close"><input maxLength="300" placeholder="답변 (선택)" value=${answer[a.id] || ''} onInput=${e => { const v = e.target.value; setAnswer(r => ({...r, [a.id]: v})); }} /><button type="button" class="primary-button" disabled=${busy} onClick=${() => onUpdate(a, {state: 'done', done_by: me.name, done_at: nowIso(), answer: (answer[a.id] || '').trim()}, '확인 완료로 바꿨어요.')}>${I('Check', 14)}확인 완료</button></span>`}
    ${a.state === 'done' && (mine || a.done_by === me.name) && html`<button type="button" class="text-button" disabled=${busy} onClick=${() => onUpdate(a, {state: 'open', done_by: '', done_at: '', answer: ''}, '다시 열었어요.')}>다시 열기</button>`}
    ${mine && html`<button type="button" class="text-button tb-ask-del" disabled=${busy} onClick=${() => onDelete(a)}>${I('Trash2', 13)}지우기</button>`}
   </div>
  </article>`; })}
 </section>`;
}

// 오늘의 업무보고: 사람별로 오늘 한 일 · 링크 · 메모를 남기고, 서로 댓글을 단다.
// 메모 칸 높이 조절: 아래 가장자리 손잡이를 끌어 늘이고 줄인다(키보드 위·아래 화살표도). 고른 높이는 사람마다 기억, 두 번 누르면 기본으로.
function MemoBox({hKey, field = '', children}) {
 const DEF = 120, MIN = 80, MAX = 640, key = 'ps.memoH.' + hKey;
 const [h, setH] = useState(() => { try { const v = Number(localStorage.getItem(key)); return v >= MIN && v <= MAX ? v : DEF; } catch { return DEF; } });
 const refit = () => requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
 const save = v => { try { if (v === DEF) localStorage.removeItem(key); else localStorage.setItem(key, String(v)); } catch {} };
 const set = v => { const n = Math.max(MIN, Math.min(MAX, Math.round(v))); setH(n); refit(); return n; };
 const start = e => {
  if (e.button !== 0) return; e.preventDefault();
  const y0 = e.clientY, h0 = h; let last = h0;
  const move = ev => { last = set(h0 + ev.clientY - y0); };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); document.body.classList.remove('memo-resizing'); save(last); };
  document.body.classList.add('memo-resizing');
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
 };
 return html`<div class="tb-memo-box" data-memo=${field || undefined} style=${`--memo-h:${h}px`}>${children}<div class="tb-memo-grip" role="separator" aria-orientation="horizontal" aria-label="메모 칸 높이 조절" aria-valuenow=${h} aria-valuemin=${MIN} aria-valuemax=${MAX} tabIndex="0" title="끌어서 칸 높이 조절 · 두 번 누르면 기본 높이" onPointerDown=${start} onDblClick=${() => save(set(DEF))} onKeyDown=${e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); save(set(h + (e.key === 'ArrowDown' ? 20 : -20))); } }}><i></i></div></div>`;
}

// 댓글 입력: Enter로 남기고 Shift+Enter로 줄바꿈(한글 조합 중 Enter는 무시). 줄이 늘면 칸이 커진다.
const keySend = (e, fn) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); fn(); return true; } return false; };
const fitArea = el => { if (!el) return; if (!el.value) { el.style.height = ''; return; } el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight + 2, 200) + 'px'; };
function ReplyForm({placeholder, busy, label, onSend}) {
 const [t, setT] = useState(''), ref = useRef(null);
 useEffect(() => fitArea(ref.current), [t]);
 async function send(e) { if (e) e.preventDefault(); const v = t.trim(); if (!v || busy) return; try { await onSend(v); setT(''); } catch {} }
 return html`<form class="tb-ask-reply tb-reply" onSubmit=${send}><textarea ref=${ref} rows="1" maxLength="3000" aria-label=${label} title="Enter로 남기기 · Shift+Enter로 줄바꿈" placeholder=${placeholder} value=${t} onInput=${e => setT(e.target.value)} onKeyDown=${e => keySend(e, send)}></textarea><button class="secondary-button" disabled=${busy || !t.trim()}>남기기</button></form>`;
}
function CommentEdit({c, busy, onCancel, onSave}) {
 const [t, setT] = useState(c.body), ref = useRef(null);
 useEffect(() => { const el = ref.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, []);
 useEffect(() => fitArea(ref.current), [t]);
 async function save(e) { if (e) e.preventDefault(); const v = t.trim(); if (!v || busy) return; try { await onSave(v); } catch {} }
 return html`<form class="tb-c-edit tb-c-inline" onSubmit=${save}><textarea ref=${ref} rows="2" maxLength="3000" aria-label="댓글 고치기" value=${t} onInput=${e => setT(e.target.value)} onKeyDown=${e => { if (!keySend(e, save) && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); } }}></textarea><div><button type="button" class="secondary-button" onClick=${onCancel}>취소</button><button class="primary-button" disabled=${busy || !t.trim()}>저장</button></div></form>`;
}
// 업무보고 · 확인 요청의 댓글 줄: 확인 · 좋아요, 내가 쓴 댓글은 수정 · 삭제.
function TeamCommentList({cs, me, busy, onMark, onEdit, onDelete}) {
 const [editing, setEditing] = useState(null);
 return html`<${Fragment}>${cs.map(c => { const mine = !!onEdit && c.author_id === me.id; return html`<div class="tb-ask-c" key=${c.id}><${Av} name=${personName(c.author_name)} mini /><div class="tb-ask-c-body">
  <div class="tb-ask-c-meta"><b>${personName(c.author_name)}</b><small>${teamDay(inSeoul(c.created_at))} ${teamClock(c.created_at)}${c.edited_at ? ' · 수정됨' : ''}</small>${mine && editing !== c.id && html`<span class="tb-c-tools"><button type="button" class="text-button" onClick=${() => setEditing(c.id)}>수정</button>${onDelete && html`<button type="button" class="text-button" onClick=${() => onDelete(c)}>삭제</button>`}</span>`}</div>
  ${editing === c.id ? html`<${CommentEdit} c=${c} busy=${busy} onCancel=${() => setEditing(null)} onSave=${async t => { await onEdit(c, t); setEditing(null); }} />` : html`<${TeamText} text=${c.body} />`}
  <${TeamMarks} c=${c} me=${me} onMark=${onMark} />
 </div></div>`; })}<//>`;
}

// 오늘 한 일 = 프로젝트(C 업무) → 세부 업무 → 진행률(%). 프로젝트를 고르고 그 세부 업무를 고르거나, 목록에 없으면 새로 적는다(그 업무의 세부 업무로도 추가).
// %를 바꾸면 그 업무의 세부 업무 진행률도 같이 바뀌고(업무 진행률 → 연결된 A·B 업무까지), 보고 줄에는 그때 값이 남는다(지난 날 보고는 그 값, 오늘은 지금 값).
// 세부 업무가 없는 업무는 프로젝트 줄에서 업무 진행률을 바로 고른다. 프로젝트 없이 한 줄로도 적을 수 있다.
// 보고 줄: {id, text, task_id, task_title, check_id, pct}. task_id만 있고 check_id가 없으며 글이 업무 이름으로 시작하면 '프로젝트 줄'(제목만 보임).
// seats: 카드를 만들 자리(기본은 이 보드 자리). viewOnly: A·B 보드 '디자인팀' 탭처럼 보기만 할 때(모든 카드 비활성, 댓글 · 확인 · 좋아요는 onComment · onMark가 있으면 가능).
function TeamReport({reports, tasks, comments, me, busy, onAct, onCheck, onProgress, onComment, onMark, onEditComment, onDeleteComment, onOpenTask, onAvatar, seats = SEATS, viewOnly = false}) {
 const [pickOpen, setPickOpen] = useState(false);
 const [day, setDay] = useState(today()), [text, setText] = useState('');
 const [proj, setProj] = useState(''), [sub, setSub] = useState(''), [subText, setSubText] = useState(''), [subPct, setSubPct] = useState(0);
 // dirty: 마지막 추가 뒤에 사람이 직접 세부 업무 · % · 이름을 고르거나 적었는지. 저장하기는 이때만 추가 전 줄을 함께 넣는다(자동으로 골라 둔 값은 넣지 않음).
 const [dirty, setDirty] = useState(false);
 useEffect(() => { setDirty(false); }, [day]);
 // 자유롭게 적은 줄을 나중에 업무에 잇기: {lineId, proj, how('new' | 세부 업무 id | 'none'), pct}
 const [linking, setLinking] = useState(null);
 const people = [...seats].sort((a, b) => Number(b.key === me.id) - Number(a.key === me.id) || Number(a.name === ADMIN_NAME) - Number(b.name === ADMIN_NAME));
 const repOf = seat => reports.find(r => r.seat === seat && r.day === day);
 const my = repOf(me.id) || {lines: [], links: [], note: '', next: ''};
 const isToday = day === today();
 const taskOf = id => tasks.find(x => x.id === id);
 const projLine = l => !!l.task_id && !l.check_id && String(l.text || '').startsWith(l.task_title || '\u0000');
 const pctOpts = v => [...new Set([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, v])].sort((a, b) => a - b);
 // 프로젝트 후보: 진행 중인 업무 + 이날 끝낸 업무. 내 업무 먼저.
 const cand = tasks.filter(x => x.status !== 'done' || inSeoul(x.done_at) === day);
 const mineT = cand.filter(x => teamHas(x, me.name)).sort(teamOrder), otherT = cand.filter(x => !teamHas(x, me.name)).sort(teamOrder);
 const projTask = proj ? taskOf(proj) : null;
 const usedIn = id => new Set(my.lines.filter(l => l.task_id === id && l.check_id).map(l => l.check_id));
 const subOpts = projTask ? projTask.checklist.filter(c => !usedIn(projTask.id).has(c.id)) : [];
 const firstSub = t => { const used = usedIn(t.id), c = t.checklist.find(x => !used.has(x.id)); return c || null; };
 const pickProj = id => { setProj(id); setSubText(''); setDirty(false); const t = id ? taskOf(id) : null, c = t ? firstSub(t) : null; setSub(c ? c.id : id ? '__new' : ''); setSubPct(c ? c.pct : 0); };
 const pickSub = v => { setSub(v); setDirty(true); const c = projTask && projTask.checklist.find(x => x.id === v); setSubPct(c ? c.pct : 0); };
 const suggest = tasks.filter(x => inSeoul(x.updated_at) === day && x.updated_by === me.id && !my.lines.some(l => l.task_id === x.id)).slice(0, 6);
 const projOnly = x => ({id: newCheckId(), text: x.title, task_id: x.id, task_title: x.title, check_id: '', pct: x.progress || 0});
 // 비슷한 업무 찾기: 적은 글과 업무 제목 · 세부 업무 이름에서 겹치는 낱말(2자 이상, '진행' 같은 흔한 말 제외) 수로 고른다.
 const STOP = new Set(['진행', '진행중', '제작', '작업', '업무', '완료', '수정', '확인', '검토', '정리', '준비', '반영', '오늘', '내일', '예정', '관련', '그리고', '하기', '전달', '공유']);
 const toks = t => String(t || '').toLowerCase().split(/[\s\-–—_\[\]\(\)\{\}·,./:;!?'"|~+]+/).filter(w => w.length >= 2 && !STOP.has(w));
 const simScore = (text, x) => { const a = toks(text); if (!a.length) return 0; const b = [...toks(x.title), ...x.checklist.flatMap(c => toks(c.text))]; return a.filter(w => b.some(v => v.includes(w) || w.includes(v))).length; };
 const similar = text => cand.map(x => ({x, n: simScore(text, x)})).filter(o => o.n > 0).sort((p, q) => q.n - p.n || teamOrder(p.x, q.x)).slice(0, 3).map(o => o.x);
 const startLink = (l, projId) => setLinking({lineId: l.id, proj: projId || '', how: 'new', pct: 0});
 // 잇기: 새 세부 업무로 추가(이 줄 이름 그대로) / 이미 있는 세부 업무로 기록 / 세부 업무 없이 업무에만 묶기.
 async function doLink(l) {
  const lk = linking, t = lk && taskOf(lk.proj); if (!t || busy) return;
  const put = fields => onAct(day, cur => ({lines: cur.lines.map(x => x.id === l.id ? {...x, task_id: t.id, task_title: t.title, ...fields} : x)}), `‘${t.title}’에 이었어요.`);
  try {
   if (lk.how === 'new') { const cid = newCheckId(); await onCheck(t, {type: 'addOne', id: cid, text: l.text.slice(0, 200), pct: lk.pct}); await put({check_id: cid, pct: lk.pct}); }
   else if (lk.how === 'none') await put({check_id: '', pct: null});
   else { const c = t.checklist.find(x => x.id === lk.how); if (!c) return; if (c.pct !== lk.pct) await onCheck(t, {type: 'pct', cid: c.id, pct: lk.pct}); await put({check_id: c.id, pct: lk.pct, text: c.text}); }
   setLinking(null);
  } catch {}
 }
 // 한 줄로 적다가 비슷한 업무를 고르면: 그 업무의 새 세부 업무로 적는 상태로 바꾼다.
 const toProj = x => { setProj(x.id); setSub('__new'); setSubText(text.trim()); setSubPct(0); setText(''); setDirty(true); };
 const subItem = projTask && sub && sub !== '__new' ? subOpts.find(c => c.id === sub) : null;
 const canAdd = proj ? (projTask ? (sub === '__new' ? !!subText.trim() : !!subItem) : false) : !!text.trim();
 // 저장하기 때 함께 넣을 '추가 전 줄': 한 줄로 직접 적은 글, 또는 마지막 추가 뒤 직접 고르거나 적은 세부 업무.
 const pending = canAdd && (proj ? dirty : true);
 const pendingLabel = !pending ? '' : proj ? `${sub === '__new' ? subText.trim() : subItem.text} ${subPct}%` : text.trim();
 async function addEntry() {
  if (busy || !canAdd) return;
  if (!proj) { const t = text.trim().slice(0, 300); await onAct(day, cur => ({lines: [...cur.lines, {id: newCheckId(), text: t, task_id: '', task_title: '', check_id: '', pct: null}]}), ''); setText(''); setDirty(false); return; }
  const t = projTask, v = subPct;
  if (sub !== '__new') {
   const c = subItem;
   if (c.pct !== v) await onCheck(t, {type: 'pct', cid: c.id, pct: v});
   await onAct(day, cur => ({lines: [...cur.lines, {id: newCheckId(), text: c.text, task_id: t.id, task_title: t.title, check_id: c.id, pct: v}]}), '');
  } else {
   const name = subText.trim().slice(0, 200), cid = newCheckId();
   await onCheck(t, {type: 'addOne', id: cid, text: name, pct: v});
   await onAct(day, cur => ({lines: [...cur.lines, {id: newCheckId(), text: name, task_id: t.id, task_title: t.title, check_id: cid, pct: v}]}), '');
   setSubText('');
  }
  // 같은 프로젝트는 그대로 두고 세부 업무 칸은 비운다(다음 세부 업무를 미리 골라 두면 추가하지 않은 줄처럼 보이고 저장하기 때 같이 들어갔음).
  const used = usedIn(t.id); if (sub !== '__new') used.add(sub);
  const left = t.checklist.some(x => !used.has(x.id)); setSub(left ? '' : '__new'); setSubPct(0); setDirty(false);
 }
 async function setLinePct(l, t, c, v) { try { if (c && c.pct !== v) await onCheck(t, {type: 'pct', cid: c.id, pct: v}); await onAct(day, cur => ({lines: cur.lines.map(x => x.id === l.id ? {...x, pct: v} : x)}), ''); } catch {} }
 // 저장하기: 지금 칸에 적혀 있는 것(추가 전인 오늘 한 일, 두 메모)을 한 번에 저장한다. 버튼을 눌러도 입력 칸 포커스가 빠지지 않게 해 두 번 저장되며 겹치지 않게 한다.
 async function saveAll(card) {
  const memo = k => { const el = card && card.querySelector(`[data-memo="${k}"] textarea`); return el ? String(el.value || '').trim().slice(0, 3000) : null; };
  const note = memo('note'), next = memo('next');
  try {
   if (pending) await addEntry();
   await onAct(day, () => ({...(note !== null ? {note} : {}), ...(next !== null ? {next} : {})}), '업무보고를 저장했어요.');
   const a = document.activeElement; if (a && card && card.contains(a) && a.blur) a.blur();
  } catch {}
 }
 const groupsOf = r => { const gs = []; (r ? r.lines : []).forEach(l => { const k = l.task_id || ''; let g = gs.find(x => x.k === k); if (!g) { g = {k, lines: []}; gs.push(g); } g.lines.push(l); }); return [...gs.filter(g => g.k), ...gs.filter(g => !g.k)]; };
 const countOf = r => groupsOf(r).reduce((n, g) => n + (g.k ? Math.max(1, g.lines.filter(l => !projLine(l)).length) : g.lines.length), 0);
 const xBtn = (label, fn) => html`<button type="button" class="link-chip-x" aria-label=${label} title=${label} disabled=${busy} onClick=${fn}>${I('X', 12)}</button>`;
 const pctPick = (v, set, label, cls = '') => html`<${Pick} class=${cls} size=${cls ? '' : 'sm'} grid=${true} label=${label} value=${v} disabled=${busy} options=${pctOpts(v).map(o => ({value: o, label: `${o}%`}))} onChange=${n => set(Number(n))} />`;
 const pctView = (v, set, label) => set ? html`<span class=${cx('tb-rep-pct', v >= 100 && 'full')}><span class="tb-rep-pct-bar"><i style=${`width:${v}%`}></i></span>${pctPick(v, set, label)}</span>` : html`<span class=${cx('tb-rep-pct ro', v >= 100 && 'full')}><span class="tb-rep-pct-bar"><i style=${`width:${v}%`}></i></span><b>${v}%</b></span>`;
 const subLine = (l, t, isMe) => {
  const c = t && l.check_id ? t.checklist.find(x => x.id === l.check_id) : null, v = c && isToday ? c.pct : l.pct, name = c ? c.text : l.text;
  return html`<li key=${l.id}><span class="tb-rep-dot"></span><div class="tb-rep-subtext"><${TeamText} text=${name} />${c && c.by ? html`<small>${c.by}</small>` : ''}</div>${v !== null && v !== undefined ? pctView(v, isMe && c && onCheck ? n => setLinePct(l, t, c, n) : null, `진행률: ${name}`) : html`<span></span>`}${isMe ? xBtn('빼기', () => onAct(day, cur => ({lines: cur.lines.filter(x => x.id !== l.id)}), '')) : ''}</li>`;
 };
 const projView = (g, isMe) => {
  const t = taskOf(g.k), title = t ? t.title : (g.lines[0].task_title || '지워진 업무'), subs = g.lines.filter(l => !projLine(l)), prog = t ? (t.progress || 0) : null;
  const canProg = isMe && t && !t.checklist.length && onProgress;
  return html`<section class="tb-rep-proj" key=${g.k}>
   <div class="tb-rep-proj-head"><span class="tb-rep-proj-ico">${I('Layers3', 13)}</span><button type="button" class="tb-rep-proj-title" disabled=${!t} title=${t ? '업무 열기' : '지워진 업무예요'} onClick=${() => t && onOpenTask(t.id)}>${title}</button>${prog !== null ? pctView(prog, canProg ? v => onProgress(t, v) : null, `업무 진행률: ${title}`) : ''}${isMe ? xBtn('이 프로젝트 줄 모두 빼기', () => onAct(day, cur => ({lines: cur.lines.filter(x => x.task_id !== g.k)}), '')) : ''}</div>
   ${subs.length > 0 && html`<ul class="tb-rep-subs">${subs.map(l => subLine(l, t, isMe))}</ul>`}
  </section>`;
 };
 const linkPanel = l => {
  const lk = linking, t = lk.proj ? taskOf(lk.proj) : null, used = t ? usedIn(t.id) : new Set(), items = t ? t.checklist.filter(c => !used.has(c.id)) : [];
  const top = similar(l.text), seen = new Set(top.map(x => x.id));
  const projOpts = [...top.map(x => ({value: x.id, label: x.title, meta: projMeta(x, !teamHas(x, me.name)), pct: x.progress || 0, group: '비슷한 업무'})), ...mineT.filter(x => !seen.has(x.id)).map(x => ({value: x.id, label: x.title, meta: projMeta(x, false), pct: x.progress || 0, group: '내 업무'})), ...otherT.filter(x => !seen.has(x.id)).map(x => ({value: x.id, label: x.title, meta: projMeta(x, true), pct: x.progress || 0, group: '다른 업무'}))];
  const howOpts = [{value: 'new', label: '새 세부 업무로 추가', meta: `‘${l.text.slice(0, 40)}’ 이름 그대로`}, ...items.map(c => ({value: c.id, label: c.text, meta: c.by || '', pct: c.pct, group: '이미 있는 세부 업무로 기록'})), {value: 'none', label: '세부 업무 없이 업무에만 묶기', meta: '% 없이 그 업무 아래에 둬요', group: '그 밖에'}];
  return html`<div class="tb-rep-link" role="group" aria-label="업무에 잇기">
   <div class="tb-rep-link-head">${I('Link2', 13)}<b>업무에 잇기</b><small>${l.text}</small></div>
   <${Pick} class="tb-rep-sel proj" label="이을 업무" placeholder="이을 업무 고르기" value=${lk.proj} disabled=${busy} options=${projOpts} onChange=${v => setLinking(k => ({...k, proj: v, how: 'new', pct: 0}))} />
   ${t && html`<div class="tb-rep-form-row"><${Pick} class="tb-rep-sel sub" label="잇는 방식" value=${lk.how} disabled=${busy} options=${howOpts} onChange=${v => setLinking(k => ({...k, how: v, pct: v === 'new' || v === 'none' ? k.pct : ((items.find(c => c.id === v) || {}).pct || 0)}))} />${lk.how !== 'none' ? pctPick(lk.pct, v => setLinking(k => ({...k, pct: v})), '진행률', 'tb-rep-sel pct') : ''}</div>`}
   <div class="tb-rep-link-actions"><button type="button" class="text-button" onClick=${() => setLinking(null)}>취소</button><button type="button" class="primary-button" disabled=${busy || !t} onClick=${() => doLink(l)}>${I('Link2', 14)}잇기</button></div>
  </div>`;
 };
 const freeLine = (l, isMe) => {
  const can = isMe && !!onCheck, open = can && linking && linking.lineId === l.id, sug = can && !open ? similar(l.text)[0] : null;
  return html`<li key=${l.id} class=${cx(open && 'linking')}><span class="tb-rep-dot"></span><div class="tb-rep-free"><${TeamText} text=${l.text} />${sug ? html`<button type="button" class="tb-rep-sug" disabled=${busy} title="이 업무에 이어서 세부 업무 · %로 남기기" onClick=${() => startLink(l, sug.id)}>${I('Sparkles', 11)}<span>${sug.title}</span><em>에 잇기</em></button>` : ''}</div>${isMe ? html`<span class="tb-rep-free-tools">${can && !open ? html`<button type="button" class="text-button tb-rep-linkbtn" disabled=${busy} onClick=${() => startLink(l, sug ? sug.id : '')}>${I('Link2', 12)}업무에 잇기</button>` : ''}${xBtn('빼기', () => onAct(day, cur => ({lines: cur.lines.filter(x => x.id !== l.id)}), ''))}</span>` : ''}${open ? linkPanel(l) : ''}</li>`;
 };
 const workView = (r, isMe) => { const gs = groupsOf(r); return gs.length ? html`<div class="tb-rep-work">${gs.map(g => g.k ? projView(g, isMe) : html`<ul class="tb-rep-lines" key="free">${g.lines.map(l => freeLine(l, isMe))}</ul>`)}</div>` : ''; };
 const optT = x => `${x.title}${x.status === 'done' ? ' · 완료' : ` · ${x.progress || 0}%`}`;
 const projMeta = (x, who) => [statuses[x.status], x.due ? dDay(x.due).label : '', who ? teamWho(x.assignee) : ''].filter(Boolean).join(' · ');
 const form = html`<form class="tb-rep-form" onSubmit=${async e => { e.preventDefault(); try { await addEntry(); } catch {} }}>
  <${Pick} class="tb-rep-sel proj" label="프로젝트" placeholder="프로젝트 고르기 (없으면 한 줄로 적기)" value=${proj} disabled=${busy} onChange=${pickProj} options=${[{value: '', label: '프로젝트 없이 한 줄로 적기', meta: '오늘 한 일을 자유롭게 한 줄로', blank: true}, ...mineT.map(x => ({value: x.id, label: x.title, meta: projMeta(x, false), pct: x.progress || 0, group: '내 업무'})), ...otherT.map(x => ({value: x.id, label: x.title, meta: projMeta(x, true), pct: x.progress || 0, group: '다른 업무'}))]} />
  ${proj ? html`<div class="tb-rep-form-row">
   ${sub === '__new' ? html`<${Fragment}>${subOpts.length > 0 && html`<button type="button" class="icon-button tb-rep-back" aria-label="세부 업무 목록에서 고르기" title="세부 업무 목록에서 고르기" onClick=${() => pickSub(subOpts[0].id)}>${I('List', 15)}</button>`}<input class="tb-rep-newsub" ref=${focusOnMount} maxLength="200" aria-label="새 세부 업무" placeholder="오늘 한 일 (이 업무의 세부 업무로도 추가돼요)" value=${subText} onInput=${e => { setSubText(e.target.value); setDirty(true); }} /><//>` : html`<${Pick} class="tb-rep-sel sub" label="세부 업무" placeholder="세부 업무 고르기" value=${sub} disabled=${busy} onChange=${pickSub} options=${[...subOpts.map(c => ({value: c.id, label: c.text, meta: c.by || '', pct: c.pct})), {value: '__new', label: '목록에 없으면 직접 적기', meta: '이 업무의 세부 업무로도 추가돼요', action: true}]} />`}
   ${pctPick(subPct, v => { setSubPct(v); setDirty(true); }, '진행률', 'tb-rep-sel pct')}
   <button class="secondary-button" disabled=${busy || !canAdd}>추가</button>
  </div>` : html`<${Fragment}><div class="tb-rep-form-row"><input maxLength="300" aria-label="오늘 한 일" placeholder="오늘 한 일을 한 줄로 적고 Enter" value=${text} onInput=${e => setText(e.target.value)} /><button class="secondary-button" disabled=${busy || !text.trim()}>추가</button></div>${onCheck && text.trim().length >= 2 && (list => list.length ? html`<div class="tb-rep-hint">${I('Sparkles', 12)}<span>비슷한 업무에 이어 적기</span>${list.map(x => html`<button type="button" key=${x.id} class="chip" title="이 업무의 새 세부 업무로 적어요" onClick=${() => toProj(x)}>${x.title}</button>`)}</div>` : '')(similar(text))}<//>`}
 </form>`;
 const formOff = off => html`<div class="tb-rep-form is-off" title=${off}><div class="pk tb-rep-sel proj"><button type="button" class="pk-btn" disabled aria-label="프로젝트"><span class="pk-val"><span class="pk-ph">프로젝트 고르기</span></span>${I('ChevronDown', 15)}</button></div><div class="tb-rep-form-row"><input disabled aria-label="오늘 한 일" placeholder=${off} /><button type="button" class="secondary-button" disabled>추가</button></div></div>`;
 return html`<section class="tb-report">
  <div class="tb-rep-bar"><button type="button" class="icon-button" aria-label="이전 날" onClick=${() => setDay(offsetDate(day, -1))}>${I('ChevronLeft', 16)}</button><strong>${teamDay(day)} 업무보고</strong><button type="button" class="icon-button" aria-label="다음 날" disabled=${day >= today()} onClick=${() => setDay(offsetDate(day, 1))}>${I('ChevronRight', 16)}</button>${day !== today() && html`<button type="button" class="text-button" onClick=${() => setDay(today())}>오늘로</button>`}<small>${reports.filter(r => r.day === day && r.lines.length && seats.some(s => s.key === r.seat)).length}/${seats.length}명 작성</small></div>
  <div class="tb-rep-grid">${people.map(s => { const r = repOf(s.key), isMe = !viewOnly && s.key === me.id, rid = r ? r.id : `C-rep-${s.key}-${day}`, cs = comments.filter(c => c.item_id === rid).sort((a, b) => a.created_at.localeCompare(b.created_at)), off = viewOnly && s.key === me.id ? '디자인팀 보드에서 쓸 수 있어요' : `${s.name}님만 쓸 수 있어요`; if (!isMe && !r && !cs.length && s.name === ADMIN_NAME) return null; return html`<article class=${cx('tb-rep', isMe && 'mine')} key=${s.key}>
   <div class="tb-person-head"><${Av} name=${s.name} editable=${!viewOnly && (isMe || me.name === ADMIN_NAME)} busy=${busy} onPick=${f => onAvatar(f, s.name)} /><div><strong>${s.name}${isMe ? ' (나)' : ''}</strong><small>${r && (r.lines.length || r.note || r.next || r.links.length) ? `${r.lines.length ? `${countOf(r)}건 · ` : '메모 · '}${teamClock(r.updated_at)} 수정` : '아직 작성 전'}</small></div></div>
   <div class="tb-sub"><span>오늘 한 일</span></div>
   ${workView(r, isMe)}
   ${isMe ? html`<${Fragment}>
    ${form}
    ${suggest.length > 0 && html`<div class="tb-rep-suggest"><span>${I('Sparkles', 13)}오늘 손댄 업무 ${suggest.length}건</span>${pickOpen ? html`<button type="button" class="text-button" disabled=${busy} onClick=${async () => { try { await onAct(day, cur => ({lines: [...cur.lines, ...suggest.filter(x => !cur.lines.some(l => l.task_id === x.id)).map(projOnly)]}), ''); setPickOpen(false); } catch {} }}>한 번에 넣기</button><button type="button" class="text-button" onClick=${() => setPickOpen(false)}>접기</button>` : html`<button type="button" class="text-button" onClick=${() => setPickOpen(true)}>골라 넣기</button>`}${pickOpen && html`<div class="tb-rep-picks">${suggest.map(x => html`<button type="button" key=${x.id} class="chip" disabled=${busy} title="프로젝트로 넣고 세부 업무를 바로 고를 수 있어요" onClick=${async () => { try { await onAct(day, cur => ({lines: cur.lines.some(l => l.task_id === x.id) ? cur.lines : [...cur.lines, projOnly(x)]}), ''); pickProj(x.id); } catch {} }}>${I('Plus', 11)}${optT(x)}</button>`)}</div>`}</div>`}<//>` : formOff(off)}
   <div class="tb-sub"><span>링크</span></div>
   ${isMe ? html`<${LinkChips} wide=${true} links=${my.links} editable=${true} busy=${busy} max=${20} addLabel="링크 공유" idPrefix=${'rep-' + day} onAdd=${l => onAct(day, cur => ({links: [...cur.links, {id: newCheckId(), label: l.label, url: l.url, shared_by: me.name, shared_at: nowIso()}]}), '')} onRemove=${i => onAct(day, cur => ({links: cur.links.filter((_, k) => k !== i)}), '')} />` : r && r.links.length ? html`<${LinkChips} wide=${true} links=${r.links} editable=${false} />` : html`<div class="link-chips wide tb-link-off"><button type="button" class="link-chip add" disabled title=${off}>${I('Plus', 13)}링크 공유</button></div>`}
   <div class="tb-sub"><span>오늘 업무 메모</span></div>
   ${isMe ? html`<${MemoBox} hKey="rep-note" field="note"><${AutoText} class="tb-d-body tb-rep-memo" value=${my.note} label="오늘 업무 메모" placeholder="오늘 진행한 업무의 특이사항, 공유할 내용 (선택)" maxLength="3000" disabled=${busy} onCommit=${v => onAct(day, () => ({note: v}), '')} /><//>` : html`<div class=${cx('tb-d-body tb-rep-memo tb-memo-view', !(r && r.note) && 'empty')} aria-readonly="true" title=${off}>${r && r.note ? html`<${TeamText} text=${r.note} />` : '오늘 진행한 업무의 특이사항, 공유할 내용 (선택)'}</div>`}
   <div class="tb-sub"><span>내일 할 일 메모</span></div>
   ${isMe ? html`<${MemoBox} hKey="rep-next" field="next"><${AutoText} class="tb-d-body tb-rep-memo" value=${my.next} label="내일 할 일 메모" placeholder="내일 이어서 할 일, 미리 준비할 것 (선택)" maxLength="3000" disabled=${busy} onCommit=${v => onAct(day, () => ({next: v}), '')} /><//>` : html`<div class=${cx('tb-d-body tb-rep-memo tb-memo-view', !(r && r.next) && 'empty')} aria-readonly="true" title=${off}>${r && r.next ? html`<${TeamText} text=${r.next} />` : '내일 이어서 할 일, 미리 준비할 것 (선택)'}</div>`}
   ${!isMe && html`<div class="tb-rep-save is-off"><small>${r && r.updated_at ? `${teamClock(r.updated_at)} 저장됨` : '아직 저장 전'}</small><button type="button" class="primary-button tb-rep-save-btn" disabled title=${viewOnly && s.key === me.id ? '디자인팀 보드에서 저장할 수 있어요' : `${s.name}님만 저장할 수 있어요`}>${I('Check', 15)}저장하기</button></div>`}
   ${isMe && html`<div class="tb-rep-save">${pendingLabel ? html`<small class="tb-rep-pending" title="추가를 누르지 않은 줄이에요. 저장하기를 누르면 함께 들어가요.">추가 전인 ‘${pendingLabel.length > 34 ? pendingLabel.slice(0, 33) + '…' : pendingLabel}’도 함께 저장돼요</small>` : html`<small>${r && r.updated_at ? `${teamClock(r.updated_at)} 저장됨` : '아직 저장 전'}</small>`}<button type="button" class="primary-button tb-rep-save-btn" onMouseDown=${e => e.preventDefault()} onClick=${e => saveAll(e.currentTarget.closest('article'))}>${I('Check', 15)}저장하기</button></div>`}
   <div class="tb-rep-comments"><div class="tb-sub"><span>댓글 ${cs.length || ''}</span></div><${TeamCommentList} cs=${cs} me=${me} busy=${busy} onMark=${onMark} onEdit=${onEditComment} onDelete=${onDeleteComment} />${onComment && html`<${ReplyForm} key=${rid} busy=${busy} label=${`${s.name} 업무보고 댓글`} placeholder=${isMe ? '덧붙일 말 · Shift+Enter 줄바꿈' : `${s.name}님에게 댓글 · Shift+Enter 줄바꿈`} onSend=${t => onComment({id: rid}, t)} />`}</div>
  </article>`; })}</div>
 </section>`;
}

/* ===== A·B 보드 '디자인팀' 탭: C 보드를 보기 전용으로 ===== */
// 팀 현황(리스트 · 상태 탭 · 타임라인 · 사람 카드)과 오늘의 업무보고를 C 화면과 같은 틀로 보여준다. 고치는 건 C 보드에서, 댓글과 확인 · 좋아요는 여기서도 남긴다(댓글 문서 board 'C').
// 데이터는 플랫폼의 PS_WATCH_C(board == 'C' 구독)로 받는다. 권중선 · 정규진은 Firestore 규칙에서 C 읽기 · 댓글 쓰기가 허용돼야 한다(firestore.rules.example의 cReader).
// 이 보드의 SEATS는 A·B 자리라서, 담당 계산은 C 자리(PS_C_SEATS)로 따로 한다.
const cSeats = () => (Array.isArray(window.PS_C_SEATS) && window.PS_C_SEATS.length ? window.PS_C_SEATS : [{key: 'lhs', name: ADMIN_NAME}]);
const cNames = () => cSeats().map(s => s.name);
const cList = a => a === '모두' ? cNames() : a === '함께' ? cNames().filter(n => n !== ADMIN_NAME) : String(a || '').split('·').map(t => t.trim()).filter(Boolean);
const cWho = a => { const l = cList(a); return !l.length ? '미배정' : l.length === cNames().length ? '셋 다' : l.join('·'); };
const C_ST = {todo: '예정', doing: '진행 중', hold: '보류', done: '완료'};
const dmPref = (k, ok, def) => { try { const v = localStorage.getItem(k); return ok.includes(v) ? v : def; } catch { return def; } };
const dmKeep = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
function DesignMirror({data, me, db, writable}) {
 const [sub, setSubS] = useState(() => dmPref('ps.dmSub', ['status', 'report'], 'status'));
 const [view, setViewS] = useState(() => dmPref('ps.dmView', ['list', 'timeline'], 'list'));
 const [stab, setStabS] = useState(() => dmPref('ps.dmStab', ['doing', 'todo', 'hold', 'done', 'all'], 'doing'));
 const setSub = v => { setSubS(v); dmKeep('ps.dmSub', v); }, setView = v => { setViewS(v); dmKeep('ps.dmView', v); }, setStab = v => { setStabS(v); dmKeep('ps.dmStab', v); };
 const [who, setWho] = useState('all'), [sel, setSel] = useState(null), [busy, setBusy] = useState(false), [checksOpen, setChecksOpen] = useState({});
 const can = !!(writable && db);
 const all = data.items.filter(x => x.kind === 'task').map(normTeam);
 const open = all.filter(x => x.status !== 'done');
 const head = html`<div class="section-heading dm-head"><h2>디자인팀 ${data.ready && !data.err ? html`<span class="count">${open.length}</span>` : ''}</h2><div class="heading-tools"><span class="dm-ro" title="업무 내용 · 상태 · 일정은 디자인팀 보드에서 바꿔요">${I('Eye', 13)}보기 전용<span class="dm-ro-more"> · 댓글 가능</span></span><${ToggleGroup} class="view-toggle" label="디자인팀 보기" value=${sub} onChange=${setSub} items=${[{value: 'status', content: html`<${Fragment}>${I('Users', 14)}팀 현황<//>`}, {value: 'report', content: html`<${Fragment}>${I('NotebookPen', 14)}오늘의 업무보고<//>`}]} /></div></div>`;
 if (data.err) return html`<section class="dm">${head}<div class="dm-empty">${I(data.err === 'perm' ? 'Lock' : 'AlertCircle', 18)}<div><strong>${data.err === 'perm' ? '아직 디자인팀 업무를 볼 수 없어요' : '디자인팀 업무를 불러오지 못했어요'}</strong><p>${data.err === 'perm' ? 'Firebase 규칙에 이 계정의 디자인팀 보기 권한이 들어가면 바로 보여요. 이현성 님에게 요청해 주세요.' : data.err}</p></div></div></section>`;
 if (!data.ready) return html`<section class="dm">${head}<div class="loading">${I('Loader2', 20, {class: 'spin'})}디자인팀 업무를 불러오고 있어요.</div></section>`;
 const comments = data.comments.map(c => ({...normComment({id: c.id, ...c}), marks: normMarks(c.marks)}));
 const reports = data.items.filter(x => x.team_type === 'report').map(normReport);
 const cmap = {}; comments.forEach(c => { cmap[c.item_id] = (cmap[c.item_id] || 0) + 1; });
 const names = cNames();
 const has = (x, v) => v === 'all' || (v === 'none' ? !cList(x.assignee).length : cList(x.assignee).includes(v));
 const inTab = (x, k) => k === 'all' ? x.status !== 'done' : x.status === k;
 const pool = all.filter(x => x.status !== 'done' || !isArchived(x));
 const STABS = [['doing', '진행 중'], ['todo', '예정'], ['hold', '보류'], ['done', '완료'], ['all', '남은 일 전체']];
 const list = pool.filter(x => has(x, who) && inTab(x, stab)).sort(stab === 'done' ? (a, b) => doneAt(b).localeCompare(doneAt(a)) : teamOrder);
 const cnt = v => pool.filter(x => (view === 'timeline' ? x.status !== 'done' : inTab(x, stab)) && has(x, v)).length;
 const filters = [['all', '전체'], ['none', '미배정'], ...names.map(n => [n, n])];
 const unas = {key: 'none', label: '미배정', match: x => !cList(x.assignee).length};
 const tlGroups = who === 'all' ? [...names.map(n => ({key: n, label: n, name: n, match: x => cList(x.assignee).includes(n)})), {...unas, hideEmpty: true}] : who === 'none' ? [unas] : [{key: who, label: who, name: who, match: x => cList(x.assignee).includes(who)}];
 const run = async fn => { setBusy(true); try { await fn(); } catch (e) { console.error('design mirror', e); toast.error(friendlyError(e)); throw e; } finally { setBusy(false); } };
 const onComment = (x, body) => { const t = String(body || '').trim(); if (!t) return; return run(() => db.doc('comments/' + uuid()).set({item_id: x.id, author_id: me.id, author_name: me.name, body: t.slice(0, 3000), links: [], created_at: nowIso(), board: 'C'})); };
 const onMark = async (c, kind) => { const cur = (c.marks && c.marks[kind]) || [], next = cur.includes(me.name) ? cur.filter(n => n !== me.name) : [...cur, me.name]; try { await db.doc('comments/' + c.id).update({marks: {...(c.marks || {}), [kind]: next}}); } catch (e) { console.error('design mirror mark', e); toast.error(friendlyError(e)); } };
 const onEdit = (c, body) => { const t = String(body || '').trim(); if (!t) return; return run(() => db.doc('comments/' + c.id).update({body: t.slice(0, 3000), edited_at: nowIso()})); };
 const onDelete = c => { if (!confirm('댓글을 지울까요?')) return; return run(() => db.doc('comments/' + c.id).delete()); };
 const row = x => { const d = dDay(x.due), st = checkStat(x), ppl = cList(x.assignee); return html`<div class=${cx('tb-arow dm-row', 'st-' + x.status, !ppl.length && x.status !== 'done' && 'unassigned', x.issue && 'has-issue')} key=${x.id}>
  <span class=${cx('dday', x.status === 'done' ? 'none' : d.cls)} title=${x.due ? `마감 ${shortDate(x.due)}` : '마감 없음'}>${x.status === 'done' ? '완료' : d.label}</span>
  <div class="tb-arow-main"><button type="button" class="tb-arow-title" onClick=${() => setSel(x.id)}><strong>${x.title}</strong></button><span class="tb-arow-meta"><span class=${'tb-stbadge dm-st st-' + x.status}><i></i>${C_ST[x.status]}</span>${x.src_board && html`<span class="tag tb-src">${x.src_board}${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}${x.priority !== 'share' && html`<span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>`}${x.issue && html`<span class=${'tag tb-issue ' + x.issue}>${TEAM_ISSUES[x.issue]}</span>`}${(t => t && html`<small>${t}</small>`)([teamStartLabel(x), x.progress ? `${x.progress}%` : '', cmap[x.id] ? `댓글 ${cmap[x.id]}` : ''].filter(Boolean).join(' · '))}${st.total > 0 && html`<button type="button" class=${cx('tb-check-chip', checksOpen[x.id] && 'on')} aria-expanded=${!!checksOpen[x.id]} onClick=${() => setChecksOpen(o => ({...o, [x.id]: !o[x.id]}))}>${I('ListChecks', 12)}세부 ${st.done}/${st.total}${I(checksOpen[x.id] ? 'ChevronUp' : 'ChevronDown', 12)}</button>`}</span></div>
  <div class="dm-who">${ppl.length ? ppl.map(n => html`<span class="dm-person" key=${n}><${Av} name=${n} mini=${true} />${n}</span>`) : html`<span class="dm-none">미배정</span>`}</div>
  ${checksOpen[x.id] && st.total > 0 && html`<div class="tb-arow-checks"><${Checklist} item=${x} editable=${false} busy=${false} onAct=${() => {}} compact=${true} /></div>`}
 </div>`; };
 const mini = (x, self) => { const d = dDay(x.due), co = cList(x.assignee).filter(n => n !== self); return html`<button type="button" key=${x.id} class=${cx('tb-mini', x.status === 'doing' && 'doing', x.issue && 'has-issue')} onClick=${() => setSel(x.id)}><span class=${cx('dday', d.cls)}>${d.label}</span><span class="tb-mini-main"><strong>${x.title}${co.length > 0 && html`<span class="tb-co" title=${`함께: ${co.join(', ')}`}>${I('Users', 12)}${co.map(n => html`<i key=${n}>${n.slice(0, 1)}</i>`)}</span>`}</strong><small>${[teamStartLabel(x) || C_ST[x.status], x.checklist.length ? `세부 ${checkStat(x).done}/${x.checklist.length}` : '', cmap[x.id] ? `댓글 ${cmap[x.id]}` : ''].filter(Boolean).join(' · ')}</small></span>${x.issue && html`<span class=${'tb-issue ' + x.issue}>${I('AlertCircle', 12)}${TEAM_ISSUES[x.issue]}</span>`}<span class="tb-prog"><i><b style=${`width:${x.progress || 0}%`}></b></i><em>${x.progress || 0}%</em></span></button>`; };
 const people = names.map(n => ({name: n, list: open.filter(x => cList(x.assignee).includes(n))}));
 const selItem = sel && all.find(t => t.id === sel);
 const issues = open.filter(x => x.issue);
 return html`<section class="dm">
  ${head}
  ${sub === 'report' ? html`<${TeamReport} reports=${reports} tasks=${all} comments=${comments} me=${me} busy=${busy} seats=${cSeats()} viewOnly=${true} onComment=${can ? onComment : null} onMark=${can ? onMark : null} onEditComment=${can ? onEdit : null} onDeleteComment=${can ? onDelete : null} onOpenTask=${setSel} />` : html`<${Fragment}>
  ${issues.length > 0 && html`<div class="tb-alert">${I('AlertCircle', 16)}<strong>특이사항 ${issues.length}</strong><span>${issues[0].title} · ${TEAM_ISSUES[issues[0].issue]}${issues[0].issue_note ? ` · ${issues[0].issue_note}` : ''}</span><button type="button" class="text-button" onClick=${() => setSel(issues[0].id)}>열기${I('ChevronRight', 13)}</button></div>`}
  <div class=${cx('tb-split', view === 'timeline' && 'tl-on')}>
   <section class="tb-assign">
    <div class="tb-assign-head"><div><strong>업무 리스트</strong></div><div class="tb-head-right"><div class="tb-view" role="group" aria-label="보기 방식">${[['list', 'List', '리스트'], ['timeline', 'ChartGantt', '타임라인']].map(([v, ic, l]) => html`<button type="button" key=${v} class=${cx(view === v && 'on')} aria-pressed=${view === v} aria-label=${l} title=${l} onClick=${() => setView(v)}>${I(ic, 16)}</button>`)}</div></div></div>
    <div class="tb-assign-tools"><div class="dv-who" role="group" aria-label="담당 필터">${filters.map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${who === v} onClick=${() => setWho(v)}>${l}<span>${cnt(v)}</span></button>`)}</div></div>
    ${view === 'timeline' ? html`<${Timeline} items=${all} groups=${tlGroups} coText=${x => cList(x.assignee).length > 1 ? `함께: ${cWho(x.assignee)}` : ''} whoText=${x => cWho(x.assignee)} onOpen=${setSel} onPatch=${null} busy=${false} />` : html`<${Fragment}><div class="tb-stabs" role="tablist" aria-label="상태별 보기">${STABS.map(([k, l]) => html`<button type="button" role="tab" key=${k} class=${cx('tb-stab', 'st-' + k, stab === k && 'on')} aria-selected=${stab === k} onClick=${() => setStab(k)}><i></i>${l}<b>${pool.filter(x => has(x, who) && inTab(x, k)).length}</b></button>`)}</div><div class="tb-assign-list">${list.length ? list.map(row) : html`<p class="tb-none pad">${all.length ? `${(STABS.find(t => t[0] === stab) || [])[1] || ''} 업무가 없어요.` : '디자인팀 보드에 아직 업무가 없어요.'}</p>`}</div><//>`}
   </section>
   <div class="tb-people">${people.map(p => { const doing = p.list.filter(x => x.status === 'doing').sort(teamOrder), wait = p.list.filter(x => x.status !== 'doing').sort(teamOrder), late = p.list.filter(teamLate).length, avg = p.list.length ? Math.round(p.list.reduce((a, x) => a + (x.progress || 0), 0) / p.list.length) : 0; return html`<article class="tb-person" key=${p.name}>
    <div class="tb-person-head"><${Av} name=${p.name} /><div><strong>${p.name}</strong><small>진행 ${doing.length} · 대기 ${wait.length}${late ? html` · <b class="late">지연 ${late}</b>` : ''} · 평균 ${avg}%</small></div><button type="button" class="text-button" onClick=${() => { setWho(p.name); setView('list'); if (stab === 'done') setStab('all'); }}>목록${I('ChevronRight', 13)}</button></div>
    <div class="tb-sub"><span>지금 하는 일</span></div>${doing.length ? doing.map(x => mini(x, p.name)) : html`<p class="tb-none">진행 중인 업무가 없어요.</p>`}
    ${wait.length > 0 && html`<${Fragment}><div class="tb-sub"><span>대기 · 보류</span></div>${wait.slice(0, 6).map(x => mini(x, p.name))}${wait.length > 6 && html`<button type="button" class="tb-more" onClick=${() => { setWho(p.name); setView('list'); setStab('all'); }}>외 ${wait.length - 6}건 더 보기</button>`}<//>`}
   </article>`; })}</div>
  </div><//>`}
  ${selItem && html`<${MirrorDetail} key=${selItem.id} x=${selItem} comments=${comments.filter(c => c.item_id === selItem.id).sort((a, b) => a.created_at.localeCompare(b.created_at))} me=${me} busy=${busy} writable=${can} onClose=${() => setSel(null)} onComment=${onComment} onMark=${onMark} onEdit=${onEdit} onDelete=${onDelete} />`}
 </section>`;
}
function MirrorDetail({x, comments, me, busy, writable, onClose, onComment, onMark, onEdit, onDelete}) {
 const [text, setText] = useState(''), [editing, setEditing] = useState(null), [editText, setEditText] = useState('');
 const start = teamStartOf(x), d = dDay(x.due);
 async function send(e) { e.preventDefault(); if (!text.trim()) return; try { await onComment(x, text); setText(''); } catch {} }
 const header = html`<div class="sheet-head tb-detail-head"><span class=${'tag ' + x.status}>${statuses[x.status]}</span><span class="tag dm-ro-tag">${I('Eye', 12)}디자인팀 보드 · 보기 전용</span>${x.src_board && html`<span class="tag tb-src">${I('Link2', 12)}${x.src_board} 보드에서 ${x.history.length && /보냄|연결/.test(x.history[0].text) ? '연결' : '불러옴'}${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}</div>`;
 const field = (label, value) => html`<div><span>${label}</span><div class="dm-val">${value}</div></div>`;
 return html`<${Sheet} class="tb-detail dm-detail" onClose=${onClose} header=${header}>
  <div class="tb-detail-body">
   <h2 class="dm-title">${x.title}</h2>
   ${x.body ? html`<div class="dm-body"><${TeamText} text=${x.body} /></div>` : ''}
   <div class="tb-fields dm-fields">
    ${field('담당', html`<span class="dm-who">${cList(x.assignee).length ? cList(x.assignee).map(n => html`<span class="dm-person" key=${n}><${Av} name=${n} mini=${true} />${n}</span>`) : html`<span class="dm-none">미배정</span>`}</span>`)}
    ${field('상태', html`<span class=${'tb-stbadge dm-st st-' + x.status}><i></i>${C_ST[x.status]}</span>`)}
    ${field('마감', x.due ? html`${shortDate(x.due)} <b class=${cx('dday', d.cls)}>${d.label}</b>` : '없음')}
    ${field(x.status === 'todo' ? '착수 예정' : '시작일', x.status === 'todo' ? (x.start_on ? `${shortDate(x.start_on)} · ${teamStartLabel(x)}` : '미정') : start ? shortDate(start) : '없음')}
    ${field('중요도', x.priority === 'share' ? taskPriorities.share : html`<span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>`)}
    ${field('진행률', html`<span class="dm-prog"><i><b style=${`width:${x.progress || 0}%`}></b></i><em>${x.progress || 0}%</em></span>`)}
   </div>
   ${x.issue && html`<div class=${'dm-issue ' + x.issue}>${I('AlertCircle', 14)}<strong>${TEAM_ISSUES[x.issue]}</strong>${x.issue_note ? html`<span>${x.issue_note}</span>` : ''}${x.issue_by ? html`<small>${x.issue_by}${x.issue_at ? ` · ${teamDay(inSeoul(x.issue_at))} ${teamClock(x.issue_at)}` : ''}</small>` : ''}</div>`}
   ${x.spec.length > 0 && html`<section class="dm-sec"><h3>${I('NotebookPen', 15)}요청 세부 업무 <span>${x.spec.length}</span></h3><ul class="dm-list">${x.spec.map(c => html`<li key=${c.id}><span>${c.text}</span></li>`)}</ul></section>`}
   ${x.checklist.length > 0 && html`<${Checklist} item=${x} editable=${false} busy=${false} onAct=${() => {}} />`}
   ${x.links.length > 0 && html`<section class="tb-links"><h3>${I('Link2', 15)}링크 <span>${x.links.length}</span></h3><${LinkChips} links=${x.links} editable=${false} /></section>`}
   <section class="tb-comments"><h3>${I('MessageCircle', 15)}댓글 · 보고 <span>${comments.length}</span></h3>
    ${comments.map(c => html`<article class="update" key=${c.id}><${Av} name=${personName(c.author_name)} mini /><div><div class="update-meta"><strong>${personName(c.author_name)}</strong><small>${teamDay(inSeoul(c.created_at))} ${teamClock(c.created_at)}${c.edited_at ? ' · 수정됨' : ''}</small>${writable && c.author_id === me.id && editing !== c.id && html`<span class="tb-c-tools"><button type="button" class="text-button" onClick=${() => { setEditing(c.id); setEditText(c.body); }}>수정</button><button type="button" class="text-button" onClick=${() => onDelete(c)}>삭제</button></span>`}</div>${editing === c.id ? html`<form class="tb-c-edit" onSubmit=${async e => { e.preventDefault(); try { await onEdit(c, editText); setEditing(null); } catch {} }}><textarea rows="2" value=${editText} onInput=${e => setEditText(e.target.value)}></textarea><div><button type="button" class="secondary-button" onClick=${() => setEditing(null)}>취소</button><button class="primary-button" disabled=${busy || !editText.trim()}>저장</button></div></form>` : html`<${TeamText} text=${c.body} />`}<${TeamMarks} c=${c} me=${me} onMark=${writable ? onMark : null} /></div></article>`)}
    ${comments.length === 0 && html`<p class="tb-none">아직 댓글이 없어요.</p>`}
    ${writable && html`<form class="tb-c-add" onSubmit=${send}><textarea rows="2" maxLength="3000" aria-label="댓글" placeholder="디자인팀에게 남길 말 (확인, 피드백, 질문 등)" value=${text} onInput=${e => setText(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e); }}></textarea><button class="primary-button" disabled=${busy || !text.trim()}>${I('Send', 14)}남기기</button></form>`}
   </section>
   <${TeamHistory} x=${x} />
   <p class="tb-meta">${x.author_name} 등록 · ${fullTime(x.created_at)}${x.last_change ? ` · 최근: ${x.updated_by_name} ${x.last_change}` : ''}</p>
  </div>
 <//>`;
}
