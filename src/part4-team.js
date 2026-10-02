
/* ===== 디자인팀 보드 (C): 이현성 + 디자이너. 팀 단위 오더 · 현황 · 마감 · 특이사항 · 완료 ===== */
// A·B 보드와 달리 두 사람 공유가 아니라 팀 운영용이라 화면을 따로 둔다. 데이터는 같은 items/comments 컬렉션(board 'C').
const TEAM_ISSUES = {blocked: '막힘', risk: '일정 위험', check: '확인 필요'};
const TEAM_ISSUE_HINT = {blocked: '진행이 멈춰 있어요', risk: '마감을 못 맞출 수 있어요', check: '확인이 필요해요'};
const TEAM_TABS = {status: '팀 현황', orders: '오더', due: '마감', issues: '확인 요청 및 특이사항', report: '오늘의 업무보고', done: '완료'};
const ASK_TYPES = {confirm: '확인 요청', need: '자료 필요', feedback: '피드백 요청'};
function normAsk(d) { return {id: d.id, ask_type: ASK_TYPES[d.ask_type] ? d.ask_type : 'confirm', title: String(d.title || ''), body: String(d.body || ''), from: String(d.from || ''), from_id: String(d.from_id || ''), to: String(d.to || '모두'), task_id: String(d.task_id || ''), task_title: String(d.task_title || ''), reply_by: DATE_RE.test(d.reply_by || '') ? d.reply_by : '', state: d.state === 'done' ? 'done' : 'open', done_by: String(d.done_by || ''), done_at: String(d.done_at || ''), answer: String(d.answer || ''), created_at: String(d.created_at || ''), updated_at: String(d.updated_at || '')}; }
function normReport(d) { return {id: d.id, seat: String(d.seat || ''), name: String(d.name || ''), day: String(d.day || ''), lines: (Array.isArray(d.lines) ? d.lines : []).filter(l => l && String(l.text || '').trim()).map((l, i) => ({id: String(l.id || 'r' + i), text: String(l.text), task_id: String(l.task_id || ''), task_title: String(l.task_title || '')})), note: String(d.note || ''), links: teamLinks(d.links), updated_at: String(d.updated_at || '')}; }
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
function normTeam(d) {
 const b = normItem(d);
 return {...b, assignee: String(d.assignee || ''), topic_label: String(d.topic_label || ''), src_board: String(d.src_board || ''), src_id: String(d.src_id || ''), src_title: String(d.src_title || ''), issue: TEAM_ISSUES[d.issue] ? d.issue : '', issue_note: String(d.issue_note || ''), issue_at: String(d.issue_at || ''), issue_by: String(d.issue_by || ''), src_body: String(d.src_body || ''), src_checks: normChecklist(d.src_checks), src_links: teamLinks(d.src_links), src_synced_at: String(d.src_synced_at || ''), spec: normChecklist(d.spec).map(c => ({id: c.id, text: c.text, done: c.done})), issue_log: (Array.isArray(d.issue_log) ? d.issue_log : []).filter(h => h && h.resolved_at).map(h => ({issue: TEAM_ISSUES[h.issue] ? h.issue : 'check', note: String(h.note || ''), by: String(h.by || ''), at: String(h.at || ''), resolved_by: String(h.resolved_by || ''), resolved_at: String(h.resolved_at), how: String(h.how || '')})), history: (Array.isArray(d.history) ? d.history : []).filter(h => h && h.at).map(h => ({at: String(h.at), by: String(h.by || ''), text: String(h.text || ''), kind: String(h.kind || ''), from: h.from === undefined ? null : String(h.from), to: h.to === undefined ? null : String(h.to), note: String(h.note || '')})), handoffs: (Array.isArray(d.handoffs) ? d.handoffs : []).filter(h => h && h.at).map(h => ({at: String(h.at), by: String(h.by || ''), from: String(h.from || ''), to: String(h.to || ''), note: String(h.note || '')})), out_links: (Array.isArray(d.out_links) ? d.out_links : []).filter(o => o && ['A', 'B'].includes(o.board) && o.id).map(o => ({board: o.board, id: String(o.id), at: String(o.at || '')}))};
}
const teamByDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || ({critical: 0, urgent: 1, share: 2}[a.priority] - {critical: 0, urgent: 1, share: 2}[b.priority]) || String(a.created_at || '').localeCompare(String(b.created_at || ''));
// 팀 현황 순서: 손으로 정한 순서(prio_no) 먼저, 나머지는 미배정 먼저 · 마감순.
// 순서: 아직 손으로 순서를 정하지 않은 업무(새로 만든 것 포함)가 맨 위, 최근 만든 것부터. 그 아래는 끌어서 정한 순서.
const teamOrder = (a, b) => (Number(!!a.prio_no) - Number(!!b.prio_no)) || (!a.prio_no ? String(b.created_at || '').localeCompare(String(a.created_at || '')) : a.prio_no - b.prio_no);
const teamLate = x => x.status !== 'done' && x.due && x.due < today();
function teamClock(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false}); }
function teamDay(d) { const t = today(); return d === t ? '오늘' : d === offsetDate(t, -1) ? '어제' : d === offsetDate(t, 1) ? '내일' : `${shortDate(d)} (${'일월화수목금토'[new Date(d + 'T12:00:00Z').getUTCDay()]})`; }
// A 원본에 남기는 C 진행 상황(이현성만 A에 쓸 수 있다).
const teamLinkOf = x => ({id: x.id, status: x.status, progress: x.progress || 0, assignee: teamWho(x.assignee), due: x.due || '', issue: x.issue || '', at: x.updated_at || nowIso()});

function TeamBoard() {
 const meKey = window.PS_SEAT || '', me = {id: meKey, name: (SEATS.find(s => s.key === meKey) || {}).name || ''};
 const isAdmin = me.name === ADMIN_NAME;
 const [asks, setAsks] = useState([]), [reports, setReports] = useState([]);
 const [db, setDb] = useState(null), [items, setItems] = useState([]), [comments, setComments] = useState([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
 const [tab, setTab] = useState(() => { let v = 'status'; try { v = localStorage.getItem('ps.teamTab') || 'status'; } catch {} return TEAM_TABS[v] ? v : 'status'; });
 const [handoff, setHandoff] = useState(null), [sel, setSel] = useState(null), [importOpen, setImportOpen] = useState(false), [who, setWho] = useState('all'), [menu, setMenu] = useState(false);
 useEffect(() => { try { localStorage.setItem('ps.teamTab', tab); } catch {} }, [tab]);
 useEffect(() => {
  let un = [], dead = false;
  (async () => {
   const d = await useCapability('db'); if (dead || !d) return; setDb(d);
   un.push(d.collection('items').onSnapshot(s => { const raw = s.docs.map(x => ({id: x.id, ...x.data()})); setItems(raw.filter(x => x.kind === 'task').map(normTeam)); setAsks(raw.filter(x => x.team_type === 'ask').map(normAsk)); setReports(raw.filter(x => x.team_type === 'report').map(normReport)); setLoading(false); }, e => { console.error('team items', e); setLoading(false); toast.error(friendlyError(e)); }));
   un.push(d.collection('comments').onSnapshot(s => setComments(s.docs.map(x => { const v = x.data() || {}; return {...normComment({id: x.id, ...v}), marks: normMarks(v.marks)}; })), e => console.error('team comments', e)));
  })();
  return () => { dead = true; un.forEach(f => { try { f(); } catch {} }); };
 }, []);
 const stamp = () => ({updated_at: nowIso(), updated_by: me.id, updated_by_name: me.name});
 async function run(fn, ok) { setBusy(true); try { const r = await fn(); if (ok) toast.success(ok); return r; } catch (e) { console.error('team save', e); toast.error(friendlyError(e)); throw e; } finally { setBusy(false); } }
 // A 원본의 C 진행 표시 갱신(이현성일 때만; 디자이너는 A에 쓸 수 없다).
 const linkTargets = x => [...(x.src_board === 'A' && x.src_id ? [x.src_id] : []), ...(x.out_links || []).map(o => o.id)];
 async function syncLink(x, patch) { if (!isAdmin) return; for (const id of linkTargets(x)) { try { await db.doc('items/' + id).update({c_link: patch === null ? null : teamLinkOf({...x, ...patch})}); } catch (e) { console.error('link', e); } } }
 // 이현성: C 업무를 A·B 보드로 보낸다. 보낸 업무에는 디자인팀 진행 상황(c_link)이 붙고 C 쪽에는 out_links로 남긴다.
 async function sendTo(x, board, who) {
  const id = uuid(), now = nowIso(), partner = board === 'A' ? '권중선' : '정규진';
  const assignee = who === 'me' ? ADMIN_NAME : who === 'partner' ? partner : '함께';
  const lhsSolo = assignee === ADMIN_NAME, boardField = lhsSolo && board === 'A' ? 'all' : board;
  const doc = {kind: 'task', title: x.title, body: x.body || '', due: x.due || '', priority: x.priority, status: 'todo', progress: 0, checklist: [], assignee, day: today(), topic_id: '', topic_label: '', topic_map: {}, share_all: false, links: teamLinks(x.links), category: 'work', ack: false, start: '', end: '', pinned: false, pinned_by: '', pinned_at: '', prio_no: 0, req: assignee === partner ? 'pending' : '', req_at: assignee === partner ? now : '', req_reply: '', ref_id: '', reply_by: '', collab: '', demo: 0, board: boardField, home: board, c_link: teamLinkOf(x), author_id: me.id, author_name: me.name, created_at: now, updated_at: now, updated_by: me.id, updated_by_name: me.name, last_change: '디자인팀 보드에서 보냄', done_at: '', plan_day: ''};
  await run(async () => { await db.doc('items/' + id).set(doc); await db.doc('items/' + x.id).update({out_links: [...(x.out_links || []), {board, id, at: now}]}); }, `${board} 보드 : ${partner}에 보냈어요.`);
 }
 async function patch(x, fields, change) {
  const next = {...fields};
  if ('progress' in next) Object.assign(next, progressFields(x, next.progress));
  const status = next.status || x.status;
  if (status === 'done' && x.status !== 'done') { next.done_at = nowIso(); if (!('progress' in fields)) next.progress = 100; }
  if (status !== 'done' && x.status === 'done') next.done_at = '';
  // 특이사항을 해결로 닫으면 해결 기록(issue_log)에 남긴다.
  if ('issue' in fields && !fields.issue && x.issue) next.issue_log = [...(x.issue_log || []), {issue: x.issue, note: x.issue_note, by: x.issue_by, at: x.issue_at, resolved_by: me.name, resolved_at: nowIso(), how: String(fields.issue_how || '')}].slice(-50);
  delete next.issue_how;
  if (change) {
   const f = next.handoffs ? 'handoff' : 'assignee' in fields ? 'assign' : 'status' in fields ? 'status' : 'due' in fields ? 'due' : 'priority' in fields ? 'priority' : 'checklist' in fields ? 'check' : 'spec' in fields ? 'spec' : 'issue' in fields ? 'issue' : 'progress' in fields ? 'progress' : 'links' in fields ? 'link' : 'title' in fields ? 'title' : 'body' in fields ? 'body' : '';
   const fmt = {assign: v => teamWho(v), status: v => statuses[v] || v, due: v => v ? shortDate(v) : '없음', priority: v => taskPriorities[v] || v, progress: v => `${v || 0}%`, title: v => v};
   const ft = fmt[f] ? {from: fmt[f](f === 'assign' ? x.assignee : x[f]), to: fmt[f](f === 'assign' ? next.assignee : f === 'progress' ? next.progress : next[f])} : {};
   const ho = next.handoffs ? next.handoffs[next.handoffs.length - 1] : null;
   next.history = [...(x.history || []), {at: nowIso(), by: me.name, text: change, kind: f, ...ft, ...(ho ? {from: ho.from, to: ho.to, note: ho.note} : {})}].slice(-200);
  }
  await run(() => db.doc('items/' + x.id).update({...next, ...stamp(), last_change: change || ''}));
  syncLink(x, next);
 }
 async function create(draft) {
  const id = uuid(), now = nowIso();
  const doc = {kind: 'task', title: draft.title, body: draft.body || '', due: draft.due || '', priority: draft.priority || 'share', status: 'todo', progress: draft.checklist && normChecklist(draft.checklist).length ? checkStat({checklist: normChecklist(draft.checklist)}).pct : 0, checklist: normChecklist(draft.checklist).map(c => ({...c, id: newCheckId()})), assignee: draft.assignee || '', day: today(), topic_id: '', topic_label: draft.topic_label || '', src_board: draft.src_board || '', src_id: draft.src_id || '', src_title: draft.src_title || '', src_body: draft.src_body || '', src_checks: normChecklist(draft.src_checks), src_links: teamLinks(draft.src_links), src_synced_at: draft.src_id ? now : '', spec: normChecklist(draft.spec).map(c => ({id: newCheckId(), text: c.text, done: false})), issue: '', issue_note: '', issue_at: '', issue_by: '', links: teamLinks(draft.links), category: 'work', ack: false, start: '', end: '', pinned: false, prio_no: 0, req: '', demo: 0, board: 'C', home: 'C', author_id: me.id, author_name: me.name, created_at: now, updated_at: now, updated_by: me.id, updated_by_name: me.name, last_change: draft.src_id ? 'A 보드에서 불러옴' : '오더', done_at: '', history: [{at: now, by: me.name, text: draft.src_id ? 'A 보드에서 불러옴' : '등록', kind: 'create'}], handoffs: []};
  await db.doc('items/' + id).set(doc);
  if (isAdmin && doc.src_board === 'A' && doc.src_id) { try { await db.doc('items/' + doc.src_id).update({c_link: teamLinkOf({...doc, id})}); } catch (e) { console.error('link A', e); } }
  return id;
 }
 async function checklistAct(x, act) {
  const snap = await db.doc('items/' + x.id).get(); if (!snap.exists) throw new Error('이미 삭제된 업무예요.');
  let list = normChecklist((snap.data() || {}).checklist);
  if (act.type === 'toggle') list = list.map(c => c.id === act.cid ? {...c, done: !!act.done, pct: act.done ? 100 : 0} : c);
  else if (act.type === 'pct') list = list.map(c => c.id === act.cid ? {...c, pct: act.pct, done: act.pct >= 100} : c);
  else if (act.type === 'add') list = [...list, ...act.texts.map(t => ({id: newCheckId(), text: t, done: false, by: me.name}))];
  else if (act.type === 'remove') list = list.filter(c => c.id !== act.cid);
  else if (act.type === 'edit') list = list.map(c => c.id === act.cid ? {...c, text: act.text} : c);
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
  syncLink(x, null); setSel(null);
 }
 async function comment(x, body) { const t = String(body || '').trim(); if (!t) return; await run(() => db.doc('comments/' + uuid()).set({item_id: x.id, author_id: me.id, author_name: me.name, body: t.slice(0, 3000), links: [], created_at: nowIso()})); }
 // 댓글 확인·좋아요: 누른 사람 이름을 남긴다(다시 누르면 취소).
 async function markComment(c, kind) { const cur = (c.marks && c.marks[kind]) || [], next = cur.includes(me.name) ? cur.filter(n => n !== me.name) : [...cur, me.name]; try { await db.doc('comments/' + c.id).update({marks: {...(c.marks || {}), [kind]: next}}); } catch (e) { toast.error(friendlyError(e)); } }
 async function editComment(c, body) { const t = String(body || '').trim(); if (!t) return; await run(() => db.doc('comments/' + c.id).update({body: t.slice(0, 3000), edited_at: nowIso()})); }
 async function deleteComment(c) { if (!confirm('댓글을 지울까요?')) return; await run(() => db.doc('comments/' + c.id).delete()); }
 async function addLink(x, link) { const cur = teamLinks(x.links); if (cur.length >= 20) throw new Error('링크는 20개까지 넣을 수 있어요.'); await patch(x, {links: [...cur, {id: newCheckId(), label: link.label, url: link.url, shared_by: me.name, shared_at: nowIso()}]}, '링크 추가'); }
 async function removeLink(x, i) { const cur = teamLinks(x.links); await patch(x, {links: cur.filter((_, k) => k !== i)}, '링크 빼기'); }
 // 이현성이 자세히 보기를 열면 A 원본 내용·세부 업무·링크를 다시 읽어 C에 옮겨 둔다(디자이너는 A를 못 읽으므로).
 async function refreshSource(x) {
  if (!isAdmin || x.src_board !== 'A' || !x.src_id) return;
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
   if (target === 'src') { if (x.src_id) { try { await db.doc('items/' + x.src_id).update({c_link: null}); } catch (e) { console.error('unlink', e); } } await db.doc('items/' + x.id).update({src_board: '', src_id: '', src_title: '', src_body: '', src_checks: [], src_links: [], last_change: 'A 원본 연결 끊음', ...stamp()}); }
   else { try { await db.doc('items/' + target).update({c_link: null}); } catch (e) { console.error('unlink', e); } await db.doc('items/' + x.id).update({out_links: x.out_links.filter(o => o.id !== target), ...stamp()}); }
  }, '연결을 끊었어요.');
 }
 async function createAsk(a) {
  const now = nowIso();
  await run(() => db.doc('items/' + uuid()).set({kind: 'daily', team_type: 'ask', ack: false, title: a.title, body: a.body || '', ask_type: a.ask_type, from: me.name, from_id: me.id, to: a.to, task_id: a.task_id || '', task_title: a.task_title || '', reply_by: a.reply_by || '', state: 'open', done_by: '', done_at: '', answer: '', priority: 'share', status: 'todo', day: today(), assignee: '', links: [], board: 'C', home: 'C', author_id: me.id, author_name: me.name, created_at: now, updated_at: now}), `${a.to === '모두' ? '모두' : a.to}에게 ${ASK_TYPES[a.ask_type]}을 남겼어요.`);
 }
 async function updateAsk(a, fields, ok) { await run(() => db.doc('items/' + a.id).update({...fields, updated_at: nowIso()}), ok); }
 async function deleteAsk(a) { if (!confirm('이 요청을 지울까요?')) return; await run(async () => { for (const c of comments.filter(c => c.item_id === a.id)) await db.doc('comments/' + c.id).delete(); await db.doc('items/' + a.id).delete(); }, '요청을 지웠어요.'); }
 // 오늘의 업무보고: 사람·날짜마다 문서 하나(C-rep-자리-날짜).
 async function saveReport(day, fields) {
  const ref = db.doc('items/C-rep-' + me.id + '-' + day), snap = await ref.get(), now = nowIso();
  if (snap.exists) await ref.update({...fields, updated_at: now});
  else await ref.set({kind: 'daily', team_type: 'report', ack: false, seat: me.id, name: me.name, day, title: `${me.name} 업무보고 ${day}`, lines: [], note: '', links: [], priority: 'share', status: 'todo', assignee: '', board: 'C', home: 'C', author_id: me.id, author_name: me.name, created_at: now, updated_at: now, ...fields});
 }
 async function reportAct(day, fn, ok) { const cur = reports.find(r => r.seat === me.id && r.day === day) || {lines: [], links: [], note: ''}; await run(() => saveReport(day, fn(cur)), ok); }
 async function importRows(rows, assignee) {
  await run(async () => { for (const r of rows) await create({title: r.title, body: r.body, due: r.due, priority: r.priority, assignee, topic_label: r.topic, src_board: 'A', src_id: r.id, src_title: r.title, src_body: r.body, src_checks: r.checklist, src_links: r.links, links: r.links, checklist: r.checklist, spec: r.checklist}); }, `${rows.length}건을 오더로 불러왔어요.`);
  setImportOpen(false); setTab('status');
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
  <header class="app-header"><div class="header-inner"><a href="#top" class="brand" onClick=${e => { e.preventDefault(); go('status'); }}><span class="brand-mark">p</span><span>pocket<span> sync</span></span></a><span class="workspace-name">C 보드 : ${String(boardNames.C || '디자인팀').replace(/ 보드$/, '')}</span>
   ${myBoards.length > 1 && html`<div class="board-switch" role="group" aria-label="보드 전환">${myBoards.map(b => html`<button type="button" key=${b} class=${cx('board-tab', b === 'C' && 'on')} aria-pressed=${b === 'C'} onClick=${() => { if (b !== 'C' && window.PS_SWITCH_BOARD) window.PS_SWITCH_BOARD(b); }}>${boardLabel(b, boardNames)}</button>`)}</div>`}
   <div class="header-actions"><div class="tb-account"><button type="button" class="header-profile" aria-haspopup="menu" aria-expanded=${menu} onClick=${() => setMenu(v => !v)}><span class="avatar">${me.name ? me.name.slice(0, 1) : I('UserRound', 15)}</span><strong>${me.name || '로그인'}</strong>${I('ChevronDown', 13)}</button>${menu && html`<div class="tb-menu" role="menu"><p>${window.PS_EMAIL || ''}</p><button type="button" role="menuitem" onClick=${() => window.PS_SIGNOUT && window.PS_SIGNOUT()}>${I('LogOut', 14)}로그아웃</button></div>`}</div></div></div></header>
  <main class="board-main team-main" id="top">
   <div class="board-tabs"><${TabsList} class="top-tabs" label="디자인팀 보드 보기" value=${tab} onChange=${v => go(v)} tabs=${Object.entries(TEAM_TABS).map(([k, l]) => ({value: k, content: html`<${Fragment}>${l}${k === 'orders' ? html`<span class="tab-count">${open.length}</span>` : k === 'issues' ? html`<span class=${cx('tab-count', (asksForMe.length + issues.length) && 'notification')} title="나에게 온 확인 요청 + 열린 특이사항">${asksForMe.length + issues.length}</span>` : k === 'report' ? html`<span class="tab-count">${reports.filter(r => r.day === today() && r.lines.length).length}</span>` : k === 'done' ? html`<span class="tab-count">${done.filter(x => !isArchived(x)).length}</span>` : ''}<//>`}))} /></div>
   ${loading ? html`<div class="loading">${I('Loader2', 22, {class: 'spin'})}보드를 불러오고 있어요.</div>` : html`<div class="team-body">
    ${tab === 'status' && html`<${TeamStatus} items=${open} kpi=${kpi} issues=${issues} onGo=${go} isAdmin=${isAdmin} onPatch=${patch} onImport=${() => setImportOpen(true)} onCreate=${d => run(() => create(d), '업무를 추가했어요.')} onReorder=${reorder} who=${who} onWho=${setWho} onChecklist=${checklistAct} ...${common} />`}
    ${tab === 'orders' && html`<${TeamOrders} items=${open} who=${who} onWho=${setWho} isAdmin=${isAdmin} onCreate=${d => run(() => create(d), '오더를 등록했어요.')} onImport=${() => setImportOpen(true)} onPatch=${patch} onChecklist=${checklistAct} ...${common} />`}
    ${tab === 'due' && html`<${TeamDue} items=${open} done=${done} ...${common} />`}
    ${tab === 'issues' && html`<${Fragment}><${TeamAsks} asks=${asks} tasks=${open} comments=${comments} me=${me} busy=${busy} onCreate=${createAsk} onUpdate=${updateAsk} onDelete=${deleteAsk} onComment=${comment} onMark=${markComment} onOpenTask=${setSel} /><${TeamIssues} items=${issues} comments=${comments} all=${items} onPatch=${patch} ...${common} /><//>`}
    ${tab === 'report' && html`<${TeamReport} reports=${reports} tasks=${items} comments=${comments} me=${me} busy=${busy} onAct=${reportAct} onComment=${comment} onMark=${markComment} onOpenTask=${setSel} />`}
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
  <span class="tb-mini-main"><strong>${x.title}${co.length > 0 && html`<span class="tb-co" title=${`함께: ${co.join(', ')}`}>${I('Users', 12)}${co.map(n => html`<i key=${n}>${n.slice(0, 1)}</i>`)}</span>`}</strong><small>${[showWho && teamWho(x.assignee), statuses[x.status], x.checklist.length ? `세부 ${checkStat(x).done}/${x.checklist.length}` : '', cmap[x.id] ? `댓글 ${cmap[x.id]}` : ''].filter(Boolean).join(' · ')}</small></span>
  ${x.issue && html`<span class=${'tb-issue ' + x.issue}>${I('AlertCircle', 12)}${TEAM_ISSUES[x.issue]}</span>`}
  ${extra}
  <span class="tb-prog"><i><b style=${`width:${x.progress || 0}%`}></b></i><em>${x.progress || 0}%</em></span>
 </button>`;
}

function TeamStatus({items, kpi, issues, cmap, onOpen, onGo, isAdmin, onPatch, onImport, onCreate, onReorder, who, onWho, onChecklist, onHandoff, busy}) {
 const people = [...SEATS.map(s => ({key: s.key, name: s.name, list: items.filter(x => teamHas(x, s.name))}))];
 const tiles = [['진행 중', kpi.doing, () => onGo('status', 'all'), ''], ['오늘·내일 마감', kpi.soon, () => onGo('due'), kpi.soon ? 'warn' : ''], ['지난 마감', kpi.late, () => onGo('due'), kpi.late ? 'alert' : ''], ['특이사항', kpi.issue, () => onGo('issues'), kpi.issue ? 'alert' : ''], ['미배정', kpi.none, () => onGo('status', 'none'), kpi.none ? 'warn' : '']];
 return html`<section class="tb-status">
  <div class="tb-kpis">${tiles.map(([l, n, f, c]) => html`<button type="button" key=${l} class=${cx('tb-kpi', c)} onClick=${f}><small>${l}</small><strong>${n}</strong></button>`)}</div>
  ${issues.length > 0 && html`<div class="tb-alert">${I('AlertCircle', 16)}<strong>특이사항 ${issues.length}</strong><span>${issues[0].title} · ${TEAM_ISSUES[issues[0].issue]}${issues[0].issue_note ? ` · ${issues[0].issue_note}` : ''}</span><button type="button" class="text-button" onClick=${() => onGo('issues')}>모두 보기${I('ChevronRight', 13)}</button></div>`}
  <div class="tb-split"><${TeamAssignList} items=${items} cmap=${cmap} onOpen=${onOpen} isAdmin=${isAdmin} onPatch=${onPatch} onImport=${onImport} onCreate=${onCreate} onReorder=${onReorder} filter=${who} onFilter=${onWho} onChecklist=${onChecklist} onHandoff=${onHandoff} busy=${busy} />
  <div class="tb-people">${people.map(p => { const doing = p.list.filter(x => x.status === 'doing').sort(teamOrder), wait = p.list.filter(x => x.status !== 'doing').sort(teamOrder), late = p.list.filter(teamLate).length, avg = p.list.length ? Math.round(p.list.reduce((a, x) => a + (x.progress || 0), 0) / p.list.length) : 0; return html`<article class="tb-person" key=${p.key}>
   <div class="tb-person-head"><span class=${cx('avatar', p.key === 'none' && 'ghost')}>${p.key === 'none' ? '?' : p.name.slice(0, 1)}</span><div><strong>${p.name}</strong><small>진행 ${doing.length} · 대기 ${wait.length}${late ? html` · <b class="late">지연 ${late}</b>` : ''} · 평균 ${avg}%</small></div><button type="button" class="text-button" onClick=${() => onGo('status', p.key === 'none' ? 'none' : p.name)}>목록${I('ChevronRight', 13)}</button></div>
   <div class="tb-sub"><span>지금 하는 일</span></div>${doing.length ? doing.map(x => html`<${TeamMini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} showWho=${false} self=${p.name} />`) : html`<p class="tb-none">진행 중인 업무가 없어요.</p>`}
   ${wait.length > 0 && html`<${Fragment}><div class="tb-sub"><span>대기 · 보류</span></div>${wait.slice(0, 6).map(x => html`<${TeamMini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} showWho=${false} self=${p.name} />`)}${wait.length > 6 && html`<button type="button" class="tb-more" onClick=${() => onGo('status', p.key === 'none' ? 'none' : p.name)}>외 ${wait.length - 6}건 더 보기</button>`}<//>`}
  </article>`; })}</div></div>
 </section>`;
}

// 팀 현황의 전체 업무 리스트: 불러온·등록한 업무를 쭉 보고 줄마다 바로 담당을 정한다.
function TeamAssignList({items, cmap, onOpen, isAdmin, onPatch, onImport, onCreate, onReorder, filter, onFilter: setFilter, onChecklist, onHandoff, busy}) {
 const [checksOpen, setChecksOpen] = useState({});
 const [title, setTitle] = useState(''), [assignee, setAssignee] = useState(null), [dueMode, setDueMode] = useState('none'), [dueDate, setDueDate] = useState(''), [priority, setPriority] = useState('share');
 const pick = assignee !== null ? assignee : filter !== 'all' && filter !== 'none' ? filter : '';
 const dueOf = () => dueMode === 'today' ? today() : dueMode === 'tomorrow' ? offsetDate(today(), 1) : dueMode === 'dayafter' ? offsetDate(today(), 2) : dueMode === 'date' ? dueDate : '';
 const names = teamNames();
 const list = (filter === 'all' ? items : filter === 'none' ? items.filter(x => !x.assignee) : items.filter(x => teamHas(x, filter))).sort(teamOrder);
 const filters = [['all', '전체', items.length], ['none', '미배정', items.filter(x => !x.assignee).length], ...names.map(n => [n, n, items.filter(x => teamHas(x, n)).length])];
 const assign = async (x, v) => { const next = teamToggle(x.assignee, v); await onPatch(x, {assignee: next}, next ? `담당 ${teamWho(next)}` : '담당 비움'); if (x.assignee && onHandoff) onHandoff(x, x.assignee, next); };
 async function add(e) { e.preventDefault(); const t = title.trim(); if (!t || busy) return; try { await onCreate({title: t.slice(0, 150), assignee: pick, due: dueOf(), priority}); setTitle(''); } catch {} }
 return html`<section class="tb-assign">
  <div class="tb-assign-head"><div><strong>업무 리스트</strong><small>줄마다 담당을 눌러 바로 배정해요 · 새로 만든 업무는 맨 위 · 왼쪽 손잡이를 끌어 순서를 바꿔요</small></div>${isAdmin && html`<button type="button" class="tb-import-btn" onClick=${onImport}>${I('Download', 15)}A 보드에서 불러오기</button>`}</div>
  <div class="tb-assign-tools"><div class="dv-who" role="group" aria-label="담당 필터">${filters.map(([v, l, n]) => html`<button type="button" key=${v} class="chip" aria-pressed=${filter === v} onClick=${() => setFilter(v)}>${l}<span>${n}</span></button>`)}</div>
   <form class="tb-assign-add" onSubmit=${add}>${I('Plus', 15)}<input aria-label="업무 추가" maxLength="150" placeholder=${pick ? `${teamWho(pick)}에게 줄 업무 한 줄 추가 후 Enter` : '업무 한 줄 추가 후 Enter (담당은 줄에서 바로 정하기)'} value=${title} onInput=${e => setTitle(e.target.value)} /><button class="tb-assign-go" disabled=${!title.trim() || busy} aria-label="추가">${I('ArrowRight', 15)}</button></form>
  </div>

  <div class="tb-assign-list" data-sort-list>${!list.length ? html`<p class="tb-none pad">${items.length ? '해당하는 업무가 없어요.' : isAdmin ? '아직 업무가 없어요. A 보드에서 불러오거나 위에서 추가해 주세요.' : '아직 업무가 없어요.'}</p>` : list.map(x => { const d = dDay(x.due), st = checkStat(x); return html`<div class=${cx('tb-arow', !x.assignee && 'unassigned', x.issue && 'has-issue')} key=${x.id} data-sort-id=${x.id}>
   ${list.length > 1 && html`<${SortGrip} id=${x.id} label="끌어서 순서 바꾸기" onDrop=${onReorder} />`}<${TeamDuePick} x=${x} busy=${busy} onPatch=${onPatch} />
   <div class="tb-arow-main"><button type="button" class="tb-arow-title" onClick=${() => onOpen(x.id)}><strong>${x.title}</strong></button><span class="tb-arow-meta">${x.src_board && html`<span class="tag tb-src">A${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}${x.priority !== 'share' && html`<span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>`}${x.issue && html`<span class=${'tag tb-issue ' + x.issue}>${TEAM_ISSUES[x.issue]}</span>`}<small>${[statuses[x.status], x.progress ? `${x.progress}%` : '', cmap[x.id] ? `댓글 ${cmap[x.id]}` : ''].filter(Boolean).join(' · ')}</small><button type="button" class=${cx('tb-check-chip', checksOpen[x.id] && 'on', !st.total && 'empty')} aria-expanded=${!!checksOpen[x.id]} onClick=${() => setChecksOpen(o => ({...o, [x.id]: !o[x.id]}))}>${I('ListChecks', 12)}${st.total ? `세부 ${st.done}/${st.total}` : '세부 업무'}${I(checksOpen[x.id] ? 'ChevronUp' : 'ChevronDown', 12)}</button></span></div>
   <div class="tb-assign-btns" role="group" aria-label="담당 정하기">${[...names.map(n => [n, n])].map(([v, l]) => html`<button type="button" key=${v} class=${cx('tb-abtn', teamOn(x.assignee, v) && 'on')} aria-pressed=${teamOn(x.assignee, v)} disabled=${busy} title=${teamOn(x.assignee, v) ? '한 번 더 누르면 빼기' : v === '모두' ? '셋 다 배정' : `${l} 추가 (여러 명 선택 가능)`} onClick=${() => assign(x, v)}>${l}</button>`)}</div>
   ${checksOpen[x.id] && html`<div class="tb-arow-checks"><${Checklist} item=${x} editable=${true} busy=${busy} onAct=${onChecklist} compact=${true} /></div>`}
  </div>`; })}</div>
 </section>`;
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
    <span class="pl-tags">${x.src_board && html`<span class="tag tb-src" title=${`A 보드 원본: ${x.src_title}`}>${I('Link2', 12)}A${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}${x.issue && html`<span class=${'tag tb-issue ' + x.issue}>${I('AlertCircle', 12)}${TEAM_ISSUES[x.issue]}</span>`}<button type="button" class=${cx('tag tb-check-chip', checksOpen[x.id] && 'on', !st.total && 'empty')} aria-expanded=${!!checksOpen[x.id]} onClick=${() => setChecksOpen(o => ({...o, [x.id]: !o[x.id]}))}>${I('ListChecks', 12)}${st.total ? `세부 ${st.done}/${st.total}` : '세부 업무'}${I(checksOpen[x.id] ? 'ChevronUp' : 'ChevronDown', 12)}</button><button type="button" class=${cx('reply-chip', cmap[x.id] && 'has')} onClick=${() => onOpen(x.id)}>${I('MessageCircle', 12)}${cmap[x.id] ? `댓글 ${cmap[x.id]}` : '댓글'}</button></span></div>
   <${TeamWhoPick} x=${x} busy=${busy} onPatch=${onPatch} onHandoff=${onHandoff} />
   <span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>
   <span class="tb-prog"><i><b style=${`width:${x.progress || 0}%`}></b></i><em>${x.progress || 0}%</em></span>
   <select class=${'tb-status-sel ' + x.status} aria-label="상태" value=${x.status} disabled=${busy} onChange=${e => onPatch(x, {status: e.target.value}, `상태 ${statuses[e.target.value]}`)}>${Object.entries(statuses).map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}</select>
   ${checksOpen[x.id] && html`<div class="tb-arow-checks"><${Checklist} item=${x} editable=${true} busy=${busy} onAct=${onChecklist} compact=${true} /></div>`}
  </div>`; })}</div>
 </section>`;
}

function TeamDue({items, done, cmap, onOpen}) {
 const [f, setF] = useState('all');
 const t = today(), wEnd = offsetDate(mondayOf(t), 6), nEnd = offsetDate(wEnd, 7);
 const groups = [['late', '지난 마감', x => x.due && x.due < t, 'late'], ['today', '오늘', x => x.due === t, 'today'], ['week', '이번 주', x => x.due > t && x.due <= wEnd, ''], ['next', '다음 주', x => x.due > wEnd && x.due <= nEnd, ''], ['later', '그 후', x => x.due > nEnd, ''], ['none', '마감 없음', x => !x.due, 'muted']];
 const sorted = [...items].sort(teamByDue), fin = [...done].filter(x => x.due).sort((a, b) => doneAt(b).localeCompare(doneAt(a)));
 const chips = [['all', '전체', items.length], ...groups.map(([k, l, fn]) => [k, l, sorted.filter(fn).length]), ['done', '마감 완료', fin.length]];
 const shown = f === 'all' ? groups : groups.filter(g => g[0] === f);
 const row = x => html`<${TeamMini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} extra=${x.due ? html`<span class="tb-date">${teamDay(x.due)}</span>` : ''} />`;
 return html`<section class="tb-due">
  <div class="dv-who tb-due-chips" role="group" aria-label="마감 구분">${chips.map(([k, l, n]) => html`<button type="button" key=${k} class=${cx('chip', k === 'late' && n && 'late')} aria-pressed=${f === k} onClick=${() => setF(k)}>${l}<span>${n}</span></button>`)}</div>
  ${f === 'done' ? (fin.length ? html`<div class="pl-group tb-due-group done"><div class="pl-group-head"><span>마감 완료</span><small>${fin.length}건 · 최근 완료순</small></div>${fin.slice(0, 80).map(x => html`<${TeamMini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} extra=${html`<span class=${cx('tb-date', inSeoul(doneAt(x)) > x.due && 'late')}>${shortDate(x.due)} 마감 · ${teamDay(inSeoul(doneAt(x)))} 완료${inSeoul(doneAt(x)) > x.due ? ' (늦음)' : ''}</span>`} />`)}</div>` : html`<p class="tb-none pad">마감일이 있던 완료 업무가 아직 없어요.</p>`)
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
  <div class="pl-group"><div class="pl-group-head"><span>최근 댓글 · 보고</span><small>${recent.length}건</small></div>${!recent.length ? html`<p class="tb-none pad">아직 댓글이 없어요.</p>` : recent.map(c => html`<button type="button" class="tb-feed" key=${c.id} onClick=${() => onOpen(c.item_id)}><span class="avatar mini">${personName(c.author_name).slice(0, 1)}</span><span><strong>${personName(c.author_name)}</strong><em>${titleOf(c.item_id)}</em><p>${c.body}</p></span><small>${teamDay(inSeoul(c.created_at))} ${teamClock(c.created_at)}</small></button>`)}</div>
 </section>`;
}

function TeamDone({items, cmap, onOpen, onPatch, busy}) {
 const [limit, setLimit] = useState(60);
 const list = [...items].sort((a, b) => doneAt(b).localeCompare(doneAt(a)));
 const groups = []; list.slice(0, limit).forEach(x => { const d = inSeoul(doneAt(x)) || '날짜 없음'; const g = groups[groups.length - 1]; if (g && g.day === d) g.items.push(x); else groups.push({day: d, items: [x]}); });
 return html`<section class="done-view">${!list.length && html`<p class="dv-empty">아직 완료한 업무가 없어요.</p>`}${groups.map(g => html`<div class="pl-group dv-group" key=${g.day}><div class="pl-group-head"><span>${teamDay(g.day)}</span><small>${g.items.length}건</small></div>${g.items.map(x => html`<div class="dv-row" key=${x.id}><span class="dv-check">${I('Check', 14)}</span><div class="dv-main"><button type="button" class="dv-title" onClick=${() => onOpen(x.id)}><strong>${x.title}</strong>${x.due ? html`<span class="pl-date">${shortDate(x.due)} 마감${inSeoul(doneAt(x)) > x.due ? ' · 늦게 완료' : ''}</span>` : ''}</button><span class="pl-tags"><span class="tag">${teamWho(x.assignee)}</span>${x.src_board && html`<span class="tag tb-src">A${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}${cmap[x.id] ? html`<span class="tag">댓글 ${cmap[x.id]}</span>` : ''}</span></div><span class="dv-time">${teamClock(doneAt(x))}</span><button type="button" class="dv-undo" disabled=${busy} onClick=${() => onPatch(x, {status: 'doing'}, '완료 취소')}>되돌리기</button></div>`)}</div>`)}${list.length > limit && html`<button type="button" class="dv-more" onClick=${() => setLimit(l => l + 60)}>이전 완료 더 보기 (${list.length - limit}건)</button>`}</section>`;
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
 const header = html`<div class="sheet-head tb-detail-head"><span class=${'tag ' + x.status}>${statuses[x.status]}</span>${x.src_board && html`<span class="tag tb-src">${I('Link2', 12)}A 보드에서 불러옴${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}</div>`;
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
    <div><span>진행률</span><div class="tb-chips">${[0, 25, 50, 75, 100].map(v => html`<button type="button" key=${v} class="chip" aria-pressed=${(x.progress || 0) === v} disabled=${busy || x.checklist.length > 0} title=${x.checklist.length ? '세부 업무 체크로 자동 계산돼요' : ''} onClick=${() => onPatch(x, {progress: v}, `진행률 ${v}%`)}>${v}%</button>`)}${![0, 25, 50, 75, 100].includes(x.progress || 0) && html`<b class="tb-pct">${x.progress}%</b>`}</div></div>
   </div>
   <section class=${cx('tb-issue-box', x.issue && 'on ' + x.issue)}><div class="tb-issue-head"><strong>${I('AlertCircle', 15)}특이사항 보고</strong>${x.issue && html`<small>${x.issue_by}${x.issue_at ? ` · ${teamDay(inSeoul(x.issue_at))} ${teamClock(x.issue_at)}` : ''}</small>`}</div>
    <div class="tb-chips">${[['', '없음'], ...Object.entries(TEAM_ISSUES)].map(([v, l]) => html`<button type="button" key=${l} class=${cx('chip', v && 'issue-' + v)} aria-pressed=${issue === v} onClick=${() => setIssue(v)}>${l}</button>`)}</div>
    ${issue && html`<textarea class="tb-issue-note" rows="2" maxLength="300" placeholder="무엇 때문인지 짧게 적어 주세요 (예: 원본 이미지 해상도 부족, 피드백 대기)" value=${note} onInput=${e => setNote(e.target.value)}></textarea>`}
    ${(issue !== x.issue || (issue && note !== x.issue_note)) && html`<button type="button" class="primary-button tb-issue-save" disabled=${busy} onClick=${saveIssue}>${issue ? '특이사항 보고하기' : '특이사항 해결로 바꾸기'}</button>`}
   </section>
   <section class="tb-links"><h3>${I('Link2', 15)}링크 <span>${x.links.length}</span></h3><${LinkChips} links=${x.links} editable=${true} busy=${busy} max=${20} addLabel="링크 공유" idPrefix=${'tbl-' + x.id} meta=${l => `${l.shared_by ? l.shared_by + ' 공유 · ' : ''}${l.url}`} onAdd=${l => onAddLink(x, l)} onRemove=${i => onRemoveLink(x, i)} /></section>
   ${!x.checklist.length && x.src_checks.length > 0 && html`<button type="button" class="tb-pull-wide" disabled=${busy} onClick=${() => pullSrcChecks(x, onPatch)}>${I('ListChecks', 15)}A 원본 세부 업무 ${x.src_checks.length}개 가져오기</button>`}
   <${Checklist} item=${x} editable=${true} busy=${busy} onAct=${onChecklist} />
   ${isAdmin && html`<section class=${cx('tb-send', linkOpen && 'open')}><button type="button" class="tb-send-toggle" aria-expanded=${linkOpen} onClick=${toggleLink}>${I('ArrowUpRight', 15)}<b>다른 보드 연결</b><small>${[x.src_board ? 'A 원본 연결됨' : '', ...x.out_links.map(o => o.board + ' 보드로 보냄')].filter(Boolean).join(' · ') || '연결 없음'}</small>${I(linkOpen ? 'ChevronUp' : 'ChevronDown', 15)}</button>${linkOpen && html`<div class="tb-send-body">
    <h3>보내기</h3>
    <div class="tb-chips">${['A', 'B'].map(b => { const done = (x.src_board === b) || x.out_links.some(o => o.board === b); return html`<button type="button" key=${b} class="chip" aria-pressed=${sendBoard === b} disabled=${busy || done} title=${done ? '이미 연결된 보드예요' : ''} onClick=${() => setSendBoard(sendBoard === b ? '' : b)}>${b} 보드 : ${b === 'A' ? '권중선' : '정규진'}${done ? ' · 연결됨' : ''}</button>`; })}</div>
    ${sendBoard && html`<div class="tb-send-who"><span>${sendBoard} 보드에서 담당</span>${[['me', '이현성'], ['partner', sendBoard === 'A' ? '권중선' : '정규진'], ['both', '함께']].map(([v, l]) => html`<button type="button" key=${v} class="secondary-button" disabled=${busy} onClick=${async () => { try { await onSendTo(x, sendBoard, v); setSendBoard(''); } catch {} }}>${l}로 보내기</button>`)}</div>`}
    ${x.out_links.length > 0 && html`<ul class="tb-out">${x.out_links.map(o => html`<li key=${o.id}>${I('Link2', 13)}${o.board} 보드 : ${o.board === 'A' ? '권중선' : '정규진'}에 보냄${o.at ? ` · ${teamDay(inSeoul(o.at))}` : ''}<button type="button" class="text-button" disabled=${busy} onClick=${() => onUnlink(x, o.id)}>연결 끊기</button></li>`)}</ul>`}<small>보낸 업무에는 디자인팀 진행 상황이 함께 표시돼요. 연결을 끊으면 그 표시가 사라져요.</small>
    ${x.src_board && html`<p class="tb-src-line">${I('Link2', 13)}A 보드 원본: <strong>${x.src_title}</strong>${isAdmin ? html` · 진행 상황이 A 보드 원본에도 표시돼요<button type="button" class="text-button tb-unlink" disabled=${busy} onClick=${() => onUnlink(x, 'src')}>연결 끊기</button>` : ''}</p>`}</div>`}</section>`}
   ${!isAdmin && x.src_board && html`<p class="tb-src-line">${I('Link2', 13)}A 보드 원본: <strong>${x.src_title}</strong></p>`}
   <section class="tb-comments"><h3>${I('MessageCircle', 15)}댓글 · 보고 <span>${comments.length}</span></h3>
    ${comments.map(c => html`<article class="update" key=${c.id}><span class="avatar mini">${personName(c.author_name).slice(0, 1)}</span><div><div class="update-meta"><strong>${personName(c.author_name)}</strong><small>${teamDay(inSeoul(c.created_at))} ${teamClock(c.created_at)}${c.edited_at ? ' · 수정됨' : ''}</small>${c.author_id === me.id && editing !== c.id && html`<span class="tb-c-tools"><button type="button" class="text-button" onClick=${() => { setEditing(c.id); setEditText(c.body); }}>수정</button><button type="button" class="text-button" onClick=${() => onDeleteComment(c)}>삭제</button></span>`}</div>${editing === c.id ? html`<form class="tb-c-edit" onSubmit=${async e => { e.preventDefault(); try { await onEditComment(c, editText); setEditing(null); } catch {} }}><textarea rows="2" value=${editText} onInput=${e => setEditText(e.target.value)}></textarea><div><button type="button" class="secondary-button" onClick=${() => setEditing(null)}>취소</button><button class="primary-button" disabled=${busy || !editText.trim()}>저장</button></div></form>` : html`<${TeamText} text=${c.body} />`}<${TeamMarks} c=${c} me=${me} onMark=${onMark} /></div></article>`)}
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
const HIST = {assign: ['UserRound', '담당'], status: ['Check', '상태'], due: ['CalendarClock', '마감'], priority: ['Flag', '중요도'], progress: ['Gauge', '진행률'], check: ['ListChecks', '세부 업무'], spec: ['NotebookPen', '요청 세부'], issue: ['AlertCircle', '특이사항'], handoff: ['MoveRight', '인수인계'], link: ['Link2', '링크'], title: ['Pencil', '제목'], body: ['NotebookPen', '설명'], create: ['Plus', '등록']};
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
 teamUrlsIn(x.body).forEach(u => push(u, '설명', x.created_at)); teamUrlsIn(x.src_body).forEach(u => push(u, 'A 원본 설명', ''));
 comments.forEach(c => teamUrlsIn(c.body).forEach(u => push(u, `${personName(c.author_name)} 댓글`, c.created_at)));
 const linkRow = (l, sub, i, removable) => html`<li key=${l.url + i}><a href=${safeLink(l.url)} target="_blank" rel="noreferrer">${I('Link2', 14)}<span><strong>${l.label || linkName(l)}</strong><small>${sub}</small></span>${I('ArrowUpRight', 14)}</a>${removable && html`<button type="button" class="link-chip-x" aria-label="링크 빼기" title="링크 빼기" disabled=${busy} onClick=${() => onRemoveLink(x, i)}>${I('X', 12)}</button>`}</li>`;
 const srcOnly = x.src_links.filter(l => !x.links.some(k => k.url === l.url)), linkCount = x.links.length + srcOnly.length + found.length;
 return html`<${Dialog} class="tb-full" title=${x.title} onClose=${onClose}>
  <div class="tb-full-meta"><span class=${'tag ' + x.status}>${statuses[x.status]}</span><span class="tag">담당 ${teamWho(x.assignee)}</span><span class=${cx('dday', d.cls)}>${x.due ? `${shortDate(x.due)} 마감 · ${d.label}` : '마감 없음'}</span>${x.priority !== 'share' && html`<span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>`}<span class="tb-full-pct"><i><b style=${`width:${x.progress || 0}%`}></b></i>${x.progress || 0}%</span>${x.issue && html`<span class=${'tag tb-issue ' + x.issue}>${TEAM_ISSUES[x.issue]}${x.issue_note ? ` · ${x.issue_note}` : ''}</span>`}</div>
  <div class="tb-full-body">
   <section><h3>내용</h3><${AutoText} class="tb-d-body tb-full-edit" value=${x.body} label="내용" placeholder="요청 내용 · 레퍼런스 · 사이즈 · 톤 등을 적어 주세요" maxLength="6000" disabled=${busy} onCommit=${v => onPatch(x, {body: v}, '내용 수정')} />
    ${x.src_board && x.src_body && x.src_body.trim() !== x.body.trim() && html`<div class="tb-full-src"><h4>${I('Link2', 13)}A 보드 원본 내용</h4><${TeamText} text=${x.src_body} /></div>`}</section>
   <section><h3>세부 업무 <span>${x.spec.length ? `${x.spec.length}개 · 처음 요청할 때 정한 항목` : '처음 요청할 때 정한 항목'}</span></h3><${TeamSpec} x=${x} busy=${busy} onPatch=${onPatch} />
    ${x.src_checks.length > 0 && !x.spec.length && html`<div class="tb-full-src"><h4>${I('Link2', 13)}A 보드 원본 세부 업무 <span>${srcSt.done}/${srcSt.total}</span><button type="button" class="tb-pull" disabled=${busy} onClick=${() => onPatch(x, {spec: normChecklist(x.src_checks).map(c => ({id: newCheckId(), text: c.text, done: false}))}, `요청 세부 업무 ${x.src_checks.length}개 가져옴`)}>여기로 가져오기</button></h4><ul class="tb-src-checks">${x.src_checks.map(c => html`<li key=${c.id} class=${cx(c.done && 'done')}><span class="check-box">${c.done ? I('Check', 11) : ''}</span>${c.text}${!c.done && c.pct ? html`<small>${c.pct}%</small>` : ''}</li>`)}</ul></div>`}</section>
   <section><h3>링크 <span>${linkCount}</span></h3>
    <ul class="tb-full-links">${x.links.map((l, i) => linkRow(l, `${l.shared_by ? l.shared_by + ' 공유' : '공유한 링크'}${l.shared_at ? ` · ${teamDay(inSeoul(l.shared_at))}` : ''} · ${l.url}`, i, true))}${srcOnly.map((l, i) => linkRow(l, `A 보드 원본 · ${l.url}`, 'src' + i, false))}${found.map((f, i) => linkRow({url: f.url, label: ''}, `${f.from}에서${f.at ? ` · ${teamDay(inSeoul(f.at))}` : ''}`, 'f' + i, false))}</ul>
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
   const rows = r.items.filter(d => d.kind === 'task' && (d.home || 'A') === 'A').map(d => ({id: d.id, title: String(d.title || ''), body: String(d.body || ''), due: String(d.due || ''), priority: priorities[d.priority] ? d.priority : 'share', status: statuses[d.status] ? d.status : 'todo', assignee: personName(d.assignee || '함께'), topic_id: String(d.topic_id || ''), topic: tname[d.topic_id] || '', checklist: normChecklist(d.checklist), links: teamLinks(d.links), created_at: String(d.created_at || ''), linked: !!(d.c_link && d.c_link.id)})).sort(teamByDue);
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
function TeamAsks({asks, tasks, comments, me, busy, onCreate, onUpdate, onDelete, onComment, onMark, onOpenTask}) {
 const others = SEATS.filter(s => s.key !== me.id).map(s => s.name);
 const [open, setOpen] = useState(false), [f, setF] = useState('me');
 const [form, setForm] = useState({ask_type: 'confirm', to: others[0] || '모두', task_id: '', title: '', body: '', due: 'none', date: ''});
 const [answer, setAnswer] = useState({}), [reply, setReply] = useState({}), [thread, setThread] = useState({});
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
   ${showThread && cs.map(c => html`<div class="tb-ask-c" key=${c.id}><span class="avatar mini">${personName(c.author_name).slice(0, 1)}</span><div><b>${personName(c.author_name)}</b><small>${teamDay(inSeoul(c.created_at))} ${teamClock(c.created_at)}</small><${TeamText} text=${c.body} /><${TeamMarks} c=${c} me=${me} onMark=${onMark} /></div></div>`)}
   <div class="tb-ask-actions">
    ${cs.length > 2 && html`<button type="button" class="text-button" onClick=${() => setThread(t => ({...t, [a.id]: !t[a.id]}))}>${I('MessageCircle', 13)}댓글 ${cs.length} ${thread[a.id] ? '접기' : '보기'}</button>`}
    <form class="tb-ask-reply" onSubmit=${async e => { e.preventDefault(); const t = (reply[a.id] || '').trim(); if (!t) return; try { await onComment(a, t); setReply(r => ({...r, [a.id]: ''})); setThread(x => ({...x, [a.id]: true})); } catch {} }}><input maxLength="3000" placeholder="댓글 · 질문 · 링크" value=${reply[a.id] || ''} onInput=${e => { const v = e.target.value; setReply(r => ({...r, [a.id]: v})); }} /><button class="secondary-button" disabled=${busy || !(reply[a.id] || '').trim()}>남기기</button></form>
    ${canDone && html`<span class="tb-ask-close"><input maxLength="300" placeholder="답변 (선택)" value=${answer[a.id] || ''} onInput=${e => { const v = e.target.value; setAnswer(r => ({...r, [a.id]: v})); }} /><button type="button" class="primary-button" disabled=${busy} onClick=${() => onUpdate(a, {state: 'done', done_by: me.name, done_at: nowIso(), answer: (answer[a.id] || '').trim()}, '확인 완료로 바꿨어요.')}>${I('Check', 14)}확인 완료</button></span>`}
    ${a.state === 'done' && (mine || a.done_by === me.name) && html`<button type="button" class="text-button" disabled=${busy} onClick=${() => onUpdate(a, {state: 'open', done_by: '', done_at: '', answer: ''}, '다시 열었어요.')}>다시 열기</button>`}
    ${mine && html`<button type="button" class="text-button tb-ask-del" disabled=${busy} onClick=${() => onDelete(a)}>${I('Trash2', 13)}지우기</button>`}
   </div>
  </article>`; })}
 </section>`;
}

// 오늘의 업무보고: 사람별로 오늘 한 일 · 링크 · 메모를 남기고, 서로 댓글을 단다.
function TeamReport({reports, tasks, comments, me, busy, onAct, onComment, onMark, onOpenTask}) {
 const [day, setDay] = useState(today()), [text, setText] = useState(''), [taskId, setTaskId] = useState(''), [reply, setReply] = useState({});
 const people = [...SEATS].sort((a, b) => Number(b.key === me.id) - Number(a.key === me.id) || Number(a.name === ADMIN_NAME) - Number(b.name === ADMIN_NAME));
 const mineTasks = tasks.filter(x => teamHas(x, me.name) || (me.name === ADMIN_NAME && x.author_id === me.id));
 const repOf = seat => reports.find(r => r.seat === seat && r.day === day);
 const my = repOf(me.id) || {lines: [], links: [], note: ''};
 const suggest = tasks.filter(x => inSeoul(x.updated_at) === day && x.updated_by === me.id && !my.lines.some(l => l.task_id === x.id)).slice(0, 6);
 const lineOf = x => `${x.title}${x.status === 'done' ? ' · 완료' : x.progress ? ` · ${x.progress}%` : ''}`;
 const addLine = (t, task) => onAct(day, cur => ({lines: [...cur.lines, {id: newCheckId(), text: t, task_id: task ? task.id : '', task_title: task ? task.title : ''}]}), '');
 async function submit(e) { e.preventDefault(); const t = text.trim(); const task = tasks.find(x => x.id === taskId); if ((!t && !task) || busy) return; try { await addLine(t || lineOf(task), task); setText(''); setTaskId(''); } catch {} }
 return html`<section class="tb-report">
  <div class="tb-rep-bar"><button type="button" class="icon-button" aria-label="이전 날" onClick=${() => setDay(offsetDate(day, -1))}>${I('ChevronLeft', 16)}</button><strong>${teamDay(day)} 업무보고</strong><button type="button" class="icon-button" aria-label="다음 날" disabled=${day >= today()} onClick=${() => setDay(offsetDate(day, 1))}>${I('ChevronRight', 16)}</button>${day !== today() && html`<button type="button" class="text-button" onClick=${() => setDay(today())}>오늘로</button>`}<small>${reports.filter(r => r.day === day && r.lines.length).length}/${SEATS.length}명 작성</small></div>
  <div class="tb-rep-grid">${people.map(s => { const r = repOf(s.key), isMe = s.key === me.id, cs = r ? comments.filter(c => c.item_id === r.id).sort((a, b) => a.created_at.localeCompare(b.created_at)) : []; if (!isMe && !r && s.name === ADMIN_NAME) return null; return html`<article class=${cx('tb-rep', isMe && 'mine')} key=${s.key}>
   <div class="tb-person-head"><span class="avatar">${s.name.slice(0, 1)}</span><div><strong>${s.name}${isMe ? ' (나)' : ''}</strong><small>${r && r.lines.length ? `${r.lines.length}건 · ${teamClock(r.updated_at)} 수정` : '아직 작성 전'}</small></div></div>
   <div class="tb-sub"><span>오늘 한 일</span></div>
   ${r && r.lines.length ? html`<ul class="tb-rep-lines">${r.lines.map(l => html`<li key=${l.id}><span class="tb-rep-dot"></span><div><${TeamText} text=${l.text} />${l.task_id && html`<button type="button" class="tag tb-ask-link" onClick=${() => onOpenTask(l.task_id)}>${I('Layers3', 12)}${l.text.startsWith(l.task_title) ? '업무 열기' : l.task_title}</button>`}</div>${isMe && html`<button type="button" class="link-chip-x" aria-label="빼기" disabled=${busy} onClick=${() => onAct(day, cur => ({lines: cur.lines.filter(x => x.id !== l.id)}), '')}>${I('X', 12)}</button>`}</li>`)}</ul>` : html`<p class="tb-none">${isMe ? '아래 칸에 오늘 한 일을 적어 주세요.' : '아직 남긴 내용이 없어요.'}</p>`}
   ${isMe && html`<${Fragment}>
    ${suggest.length > 0 && html`<div class="tb-rep-suggest"><small>오늘 손댄 내 업무</small>${suggest.map(x => html`<button type="button" key=${x.id} class="chip" disabled=${busy} onClick=${() => addLine(lineOf(x), x)}>${I('Plus', 12)}${lineOf(x)}</button>`)}</div>`}
    <form class="tb-rep-add" onSubmit=${submit}><input maxLength="300" placeholder="오늘 한 일을 한 줄로 적고 Enter" value=${text} onInput=${e => setText(e.target.value)} /><select class="tb-who" aria-label="관련 업무" value=${taskId} onChange=${e => setTaskId(e.target.value)}><option value="">관련 업무 (선택)</option>${[...mineTasks].sort(teamByDue).map(x => html`<option key=${x.id} value=${x.id}>${x.title}</option>`)}</select><button class="secondary-button" disabled=${busy || (!text.trim() && !taskId)}>추가</button></form>`}
   <div class="tb-sub"><span>링크</span></div>
   ${isMe ? html`<${LinkChips} links=${my.links} editable=${true} busy=${busy} max=${20} addLabel="링크 공유" idPrefix=${'rep-' + day} onAdd=${l => onAct(day, cur => ({links: [...cur.links, {id: newCheckId(), label: l.label, url: l.url, shared_by: me.name, shared_at: nowIso()}]}), '')} onRemove=${i => onAct(day, cur => ({links: cur.links.filter((_, k) => k !== i)}), '')} />` : r && r.links.length ? html`<${LinkChips} links=${r.links} editable=${false} />` : html`<p class="tb-none">공유한 링크가 없어요.</p>`}
   <div class="tb-sub"><span>메모 · 내일 할 일</span></div>
   ${isMe ? html`<${AutoText} class="tb-d-body" value=${my.note} label="메모" placeholder="특이사항, 내일 할 일 등 (선택)" maxLength="3000" disabled=${busy} onCommit=${v => onAct(day, () => ({note: v}), '')} />` : r && r.note ? html`<${TeamText} text=${r.note} />` : html`<p class="tb-none">메모가 없어요.</p>`}
   ${r && html`<div class="tb-rep-comments"><div class="tb-sub"><span>댓글 ${cs.length || ''}</span></div>${cs.map(c => html`<div class="tb-ask-c" key=${c.id}><span class="avatar mini">${personName(c.author_name).slice(0, 1)}</span><div><b>${personName(c.author_name)}</b><small>${teamDay(inSeoul(c.created_at))} ${teamClock(c.created_at)}</small><${TeamText} text=${c.body} /><${TeamMarks} c=${c} me=${me} onMark=${onMark} /></div></div>`)}<form class="tb-ask-reply" onSubmit=${async e => { e.preventDefault(); const t = (reply[r.id] || '').trim(); if (!t) return; try { await onComment(r, t); setReply(x => ({...x, [r.id]: ''})); } catch {} }}><input maxLength="3000" placeholder=${isMe ? '덧붙일 말' : `${s.name}님에게 댓글`} value=${reply[r.id] || ''} onInput=${e => { const v = e.target.value; setReply(x => ({...x, [r.id]: v})); }} /><button class="secondary-button" disabled=${busy || !(reply[r.id] || '').trim()}>남기기</button></form></div>`}
  </article>`; })}</div>
 </section>`;
}
