
/* ===== 디자인팀 보드 (C): 이현성 + 디자이너. 팀 단위 오더 · 현황 · 마감 · 특이사항 · 완료 ===== */
// A·B 보드와 달리 두 사람 공유가 아니라 팀 운영용이라 화면을 따로 둔다. 데이터는 같은 items/comments 컬렉션(board 'C').
const TEAM_ISSUES = {blocked: '막힘', risk: '일정 위험', check: '확인 필요'};
const TEAM_ISSUE_HINT = {blocked: '진행이 멈춰 있어요', risk: '마감을 못 맞출 수 있어요', check: '확인이 필요해요'};
const TEAM_TABS = {status: '팀 현황', orders: '오더', due: '마감', issues: '특이사항', done: '완료'};
const teamDesigners = () => SEATS.filter(s => s.name !== ADMIN_NAME);
const teamJoint = () => teamDesigners().map(s => s.name).join('·');
// 담당: 디자이너 이름 | '함께'(디자이너 모두) | ''(미배정)
const teamWho = a => (a === '함께' ? teamJoint() : a || '미배정');
const teamHas = (x, name) => x.assignee === name || (x.assignee === '함께' && teamDesigners().some(s => s.name === name));
function normTeam(d) {
 const b = normItem(d);
 return {...b, assignee: String(d.assignee || ''), topic_label: String(d.topic_label || ''), src_board: String(d.src_board || ''), src_id: String(d.src_id || ''), src_title: String(d.src_title || ''), issue: TEAM_ISSUES[d.issue] ? d.issue : '', issue_note: String(d.issue_note || ''), issue_at: String(d.issue_at || ''), issue_by: String(d.issue_by || '')};
}
const teamByDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || ({critical: 0, urgent: 1, share: 2}[a.priority] - {critical: 0, urgent: 1, share: 2}[b.priority]) || String(a.created_at || '').localeCompare(String(b.created_at || ''));
// 팀 현황 순서: 손으로 정한 순서(prio_no) 먼저, 나머지는 미배정 먼저 · 마감순.
const teamOrder = (a, b) => ((a.prio_no || 999) - (b.prio_no || 999)) || (Number(!!a.assignee) - Number(!!b.assignee)) || teamByDue(a, b);
const teamLate = x => x.status !== 'done' && x.due && x.due < today();
function teamClock(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false}); }
function teamDay(d) { const t = today(); return d === t ? '오늘' : d === offsetDate(t, -1) ? '어제' : d === offsetDate(t, 1) ? '내일' : `${shortDate(d)} (${'일월화수목금토'[new Date(d + 'T12:00:00Z').getUTCDay()]})`; }
// A 원본에 남기는 C 진행 상황(이현성만 A에 쓸 수 있다).
const teamLinkOf = x => ({id: x.id, status: x.status, progress: x.progress || 0, assignee: teamWho(x.assignee), due: x.due || '', issue: x.issue || '', at: x.updated_at || nowIso()});

function TeamBoard() {
 const meKey = window.PS_SEAT || '', me = {id: meKey, name: (SEATS.find(s => s.key === meKey) || {}).name || ''};
 const isAdmin = me.name === ADMIN_NAME;
 const [db, setDb] = useState(null), [items, setItems] = useState([]), [comments, setComments] = useState([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
 const [tab, setTab] = useState(() => { try { return localStorage.getItem('ps.teamTab') || 'status'; } catch { return 'status'; } });
 const [sel, setSel] = useState(null), [importOpen, setImportOpen] = useState(false), [who, setWho] = useState('all'), [menu, setMenu] = useState(false);
 useEffect(() => { try { localStorage.setItem('ps.teamTab', tab); } catch {} }, [tab]);
 useEffect(() => {
  let un = [], dead = false;
  (async () => {
   const d = await useCapability('db'); if (dead || !d) return; setDb(d);
   un.push(d.collection('items').onSnapshot(s => { setItems(s.docs.map(x => normTeam({id: x.id, ...x.data()})).filter(x => x.kind === 'task')); setLoading(false); }, e => { console.error('team items', e); setLoading(false); toast.error(friendlyError(e)); }));
   un.push(d.collection('comments').onSnapshot(s => setComments(s.docs.map(x => normComment({id: x.id, ...x.data()}))), e => console.error('team comments', e)));
  })();
  return () => { dead = true; un.forEach(f => { try { f(); } catch {} }); };
 }, []);
 const stamp = () => ({updated_at: nowIso(), updated_by: me.id, updated_by_name: me.name});
 async function run(fn, ok) { setBusy(true); try { const r = await fn(); if (ok) toast.success(ok); return r; } catch (e) { console.error('team save', e); toast.error(friendlyError(e)); throw e; } finally { setBusy(false); } }
 // A 원본의 C 진행 표시 갱신(이현성일 때만; 디자이너는 A에 쓸 수 없다).
 async function syncLink(x, patch) { if (!isAdmin || x.src_board !== 'A' || !x.src_id) return; try { await db.doc('items/' + x.src_id).update({c_link: patch === null ? null : teamLinkOf({...x, ...patch})}); } catch (e) { console.error('link A', e); } }
 async function patch(x, fields, change) {
  const next = {...fields};
  if ('progress' in next) Object.assign(next, progressFields(x, next.progress));
  const status = next.status || x.status;
  if (status === 'done' && x.status !== 'done') { next.done_at = nowIso(); if (!('progress' in fields)) next.progress = 100; }
  if (status !== 'done' && x.status === 'done') next.done_at = '';
  await run(() => db.doc('items/' + x.id).update({...next, ...stamp(), last_change: change || ''}));
  syncLink(x, next);
 }
 async function create(draft) {
  const id = uuid(), now = nowIso();
  const doc = {kind: 'task', title: draft.title, body: draft.body || '', due: draft.due || '', priority: draft.priority || 'share', status: 'todo', progress: 0, checklist: [], assignee: draft.assignee || '', day: today(), topic_id: '', topic_label: draft.topic_label || '', src_board: draft.src_board || '', src_id: draft.src_id || '', src_title: draft.src_title || '', issue: '', issue_note: '', issue_at: '', issue_by: '', links: [], category: 'work', ack: false, start: '', end: '', pinned: false, prio_no: 0, req: '', demo: 0, board: 'C', home: 'C', author_id: me.id, author_name: me.name, created_at: now, updated_at: now, updated_by: me.id, updated_by_name: me.name, last_change: draft.src_id ? 'A 보드에서 불러옴' : '오더', done_at: ''};
  await db.doc('items/' + id).set(doc);
  if (isAdmin && doc.src_board === 'A' && doc.src_id) { try { await db.doc('items/' + doc.src_id).update({c_link: teamLinkOf({...doc, id})}); } catch (e) { console.error('link A', e); } }
  return id;
 }
 async function checklistAct(x, act) {
  const snap = await db.doc('items/' + x.id).get(); if (!snap.exists) throw new Error('이미 삭제된 업무예요.');
  let list = normChecklist((snap.data() || {}).checklist);
  if (act.type === 'toggle') list = list.map(c => c.id === act.cid ? {...c, done: !!act.done, pct: act.done ? 100 : 0} : c);
  else if (act.type === 'pct') list = list.map(c => c.id === act.cid ? {...c, pct: act.pct, done: act.pct >= 100} : c);
  else if (act.type === 'add') list = [...list, ...act.texts.map(t => ({id: newCheckId(), text: t, done: false}))];
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
 async function editComment(c, body) { const t = String(body || '').trim(); if (!t) return; await run(() => db.doc('comments/' + c.id).update({body: t.slice(0, 3000), edited_at: nowIso()})); }
 async function deleteComment(c) { if (!confirm('댓글을 지울까요?')) return; await run(() => db.doc('comments/' + c.id).delete()); }
 async function importRows(rows, assignee) {
  await run(async () => { for (const r of rows) await create({title: r.title, body: r.body, due: r.due, priority: r.priority, assignee, topic_label: r.topic, src_board: 'A', src_id: r.id, src_title: r.title}); }, `${rows.length}건을 오더로 불러왔어요.`);
  setImportOpen(false); setTab('orders');
 }

 const open = items.filter(x => x.status !== 'done'), done = items.filter(x => x.status === 'done');
 const issues = open.filter(x => x.issue).sort((a, b) => b.issue_at.localeCompare(a.issue_at));
 const t = today(), t1 = offsetDate(t, 1);
 const kpi = {doing: open.filter(x => x.status === 'doing').length, soon: open.filter(x => x.due && x.due >= t && x.due <= t1).length, late: open.filter(teamLate).length, issue: issues.length, none: open.filter(x => !x.assignee).length};
 const cmap = useMemo(() => { const m = {}; for (const c of comments) m[c.item_id] = (m[c.item_id] || 0) + 1; return m; }, [comments]);
 const current = sel ? items.find(x => x.id === sel) : null;
 const myBoards = window.PS_BOARDS || [], boardNames = window.PS_BOARD_NAMES || {};
 const go = (v, w) => { setTab(v); if (w !== undefined) setWho(w); window.scrollTo(0, 0); };
 const common = {cmap, onOpen: setSel, busy, me};

 return html`<div class="app-shell team-shell">
  <header class="app-header"><div class="header-inner"><a href="#top" class="brand" onClick=${e => { e.preventDefault(); go('status'); }}><span class="brand-mark">p</span><span>pocket<span> sync</span></span></a><span class="workspace-name">${boardNames.C || '디자인팀 보드'}</span>
   ${myBoards.length > 1 && html`<div class="board-switch" role="group" aria-label="보드 전환">${myBoards.map(b => html`<button type="button" key=${b} class=${cx('board-tab', b === 'C' && 'on')} aria-pressed=${b === 'C'} onClick=${() => { if (b !== 'C' && window.PS_SWITCH_BOARD) window.PS_SWITCH_BOARD(b); }}>${(boardNames[b] || b).replace(/ 보드$/, '')}<span class="bt-suffix"> 보드</span></button>`)}</div>`}
   <div class="header-actions"><div class="tb-account"><button type="button" class="header-profile" aria-haspopup="menu" aria-expanded=${menu} onClick=${() => setMenu(v => !v)}><span class="avatar">${me.name ? me.name.slice(0, 1) : I('UserRound', 15)}</span><strong>${me.name || '로그인'}</strong>${I('ChevronDown', 13)}</button>${menu && html`<div class="tb-menu" role="menu"><p>${window.PS_EMAIL || ''}</p><button type="button" role="menuitem" onClick=${() => window.PS_SIGNOUT && window.PS_SIGNOUT()}>${I('LogOut', 14)}로그아웃</button></div>`}</div></div></div></header>
  <main class="board-main team-main" id="top">
   <div class="board-tabs"><${TabsList} class="top-tabs" label="디자인팀 보드 보기" value=${tab} onChange=${v => go(v)} tabs=${Object.entries(TEAM_TABS).map(([k, l]) => ({value: k, content: html`<${Fragment}>${l}${k === 'orders' ? html`<span class="tab-count">${open.length}</span>` : k === 'issues' ? html`<span class=${cx('tab-count', issues.length && 'notification')}>${issues.length}</span>` : k === 'done' ? html`<span class="tab-count">${done.filter(x => !isArchived(x)).length}</span>` : ''}<//>`}))} /></div>
   ${loading ? html`<div class="loading">${I('Loader2', 22, {class: 'spin'})}보드를 불러오고 있어요.</div>` : html`<div class="team-body">
    ${tab === 'status' && html`<${TeamStatus} items=${open} kpi=${kpi} issues=${issues} onGo=${go} isAdmin=${isAdmin} onPatch=${patch} onImport=${() => setImportOpen(true)} onCreate=${d => run(() => create(d), '업무를 추가했어요.')} onReorder=${reorder} ...${common} />`}
    ${tab === 'orders' && html`<${TeamOrders} items=${open} who=${who} onWho=${setWho} isAdmin=${isAdmin} onCreate=${d => run(() => create(d), '오더를 등록했어요.')} onImport=${() => setImportOpen(true)} onPatch=${patch} ...${common} />`}
    ${tab === 'due' && html`<${TeamDue} items=${open} ...${common} />`}
    ${tab === 'issues' && html`<${TeamIssues} items=${issues} comments=${comments} all=${items} onPatch=${patch} ...${common} />`}
    ${tab === 'done' && html`<${TeamDone} items=${done} onPatch=${patch} ...${common} />`}
   </div>`}
  </main>
  ${current && html`<${TeamDetail} item=${current} comments=${comments.filter(c => c.item_id === current.id).sort((a, b) => a.created_at.localeCompare(b.created_at))} me=${me} isAdmin=${isAdmin} busy=${busy} onClose=${() => setSel(null)} onPatch=${patch} onChecklist=${checklistAct} onComment=${comment} onEditComment=${editComment} onDeleteComment=${deleteComment} onRemove=${remove} />`}
  ${importOpen && html`<${TeamImport} existing=${new Set(items.map(x => x.src_id).filter(Boolean))} busy=${busy} onClose=${() => setImportOpen(false)} onImport=${importRows} />`}
  <${Toaster} />
 </div>`;
}

// 한 줄 업무(현황·마감·특이사항 공용).
function TeamMini({x, cmap, onOpen, showWho = true, extra}) {
 const d = dDay(x.due);
 return html`<button type="button" class=${cx('tb-mini', x.status === 'doing' && 'doing', x.issue && 'has-issue')} onClick=${() => onOpen(x.id)}>
  <span class=${cx('dday', d.cls)}>${d.label}</span>
  <span class="tb-mini-main"><strong>${x.title}</strong><small>${[showWho && teamWho(x.assignee), statuses[x.status], x.checklist.length ? `세부 ${checkStat(x).done}/${x.checklist.length}` : '', cmap[x.id] ? `댓글 ${cmap[x.id]}` : ''].filter(Boolean).join(' · ')}</small></span>
  ${x.issue && html`<span class=${'tb-issue ' + x.issue}>${I('AlertCircle', 12)}${TEAM_ISSUES[x.issue]}</span>`}
  ${extra}
  <span class="tb-prog"><i><b style=${`width:${x.progress || 0}%`}></b></i><em>${x.progress || 0}%</em></span>
 </button>`;
}

function TeamStatus({items, kpi, issues, cmap, onOpen, onGo, isAdmin, onPatch, onImport, onCreate, onReorder, busy}) {
 const people = [...teamDesigners().map(s => ({key: s.key, name: s.name, list: items.filter(x => teamHas(x, s.name))}))];
 const tiles = [['진행 중', kpi.doing, () => onGo('orders', 'all'), ''], ['오늘·내일 마감', kpi.soon, () => onGo('due'), kpi.soon ? 'warn' : ''], ['지난 마감', kpi.late, () => onGo('due'), kpi.late ? 'alert' : ''], ['특이사항', kpi.issue, () => onGo('issues'), kpi.issue ? 'alert' : ''], ['미배정', kpi.none, () => onGo('orders', 'none'), kpi.none ? 'warn' : '']];
 return html`<section class="tb-status">
  <div class="tb-kpis">${tiles.map(([l, n, f, c]) => html`<button type="button" key=${l} class=${cx('tb-kpi', c)} onClick=${f}><small>${l}</small><strong>${n}</strong></button>`)}</div>
  ${issues.length > 0 && html`<div class="tb-alert">${I('AlertCircle', 16)}<strong>특이사항 ${issues.length}</strong><span>${issues[0].title} · ${TEAM_ISSUES[issues[0].issue]}${issues[0].issue_note ? ` · ${issues[0].issue_note}` : ''}</span><button type="button" class="text-button" onClick=${() => onGo('issues')}>모두 보기${I('ChevronRight', 13)}</button></div>`}
  <div class="tb-split"><${TeamAssignList} items=${items} cmap=${cmap} onOpen=${onOpen} isAdmin=${isAdmin} onPatch=${onPatch} onImport=${onImport} onCreate=${onCreate} onReorder=${onReorder} busy=${busy} />
  <div class="tb-people">${people.map(p => { const doing = p.list.filter(x => x.status === 'doing').sort(teamOrder), wait = p.list.filter(x => x.status !== 'doing').sort(teamOrder), late = p.list.filter(teamLate).length, avg = p.list.length ? Math.round(p.list.reduce((a, x) => a + (x.progress || 0), 0) / p.list.length) : 0; return html`<article class="tb-person" key=${p.key}>
   <div class="tb-person-head"><span class=${cx('avatar', p.key === 'none' && 'ghost')}>${p.key === 'none' ? '?' : p.name.slice(0, 1)}</span><div><strong>${p.name}</strong><small>진행 ${doing.length} · 대기 ${wait.length}${late ? html` · <b class="late">지연 ${late}</b>` : ''} · 평균 ${avg}%</small></div><button type="button" class="text-button" onClick=${() => onGo('orders', p.key === 'none' ? 'none' : p.name)}>목록${I('ChevronRight', 13)}</button></div>
   <div class="tb-sub"><span>지금 하는 일</span></div>${doing.length ? doing.map(x => html`<${TeamMini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} showWho=${x.assignee === '함께'} />`) : html`<p class="tb-none">진행 중인 업무가 없어요.</p>`}
   ${wait.length > 0 && html`<${Fragment}><div class="tb-sub"><span>대기 · 보류</span></div>${wait.slice(0, 6).map(x => html`<${TeamMini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} showWho=${x.assignee === '함께'} />`)}${wait.length > 6 && html`<button type="button" class="tb-more" onClick=${() => onGo('orders', p.key === 'none' ? 'none' : p.name)}>외 ${wait.length - 6}건 더 보기</button>`}<//>`}
  </article>`; })}</div></div>
 </section>`;
}

// 팀 현황의 전체 업무 리스트: 불러온·등록한 업무를 쭉 보고 줄마다 바로 담당을 정한다.
function TeamAssignList({items, cmap, onOpen, isAdmin, onPatch, onImport, onCreate, onReorder, busy}) {
 const [filter, setFilter] = useState('all'), [title, setTitle] = useState('');
 const names = teamDesigners().map(s => s.name);
 const list = (filter === 'all' ? items : filter === 'none' ? items.filter(x => !x.assignee) : items.filter(x => teamHas(x, filter))).sort(teamOrder);
 const filters = [['all', '전체', items.length], ['none', '미배정', items.filter(x => !x.assignee).length], ...names.map(n => [n, n, items.filter(x => teamHas(x, n)).length])];
 const assign = (x, v) => { const next = x.assignee === v ? '' : v; onPatch(x, {assignee: next}, next ? `담당 ${teamWho(next)}` : '담당 비움'); };
 async function add(e) { e.preventDefault(); const t = title.trim(); if (!t || busy) return; try { await onCreate({title: t.slice(0, 150), assignee: filter !== 'all' && filter !== 'none' ? filter : ''}); setTitle(''); } catch {} }
 return html`<section class="tb-assign">
  <div class="tb-assign-head"><div><strong>업무 리스트</strong><small>줄마다 담당을 눌러 바로 배정해요 · 왼쪽 손잡이를 끌어 순서를 바꿔요</small></div>${isAdmin && html`<button type="button" class="tb-import-btn" onClick=${onImport}>${I('Download', 15)}A 보드에서 불러오기</button>`}</div>
  <div class="tb-assign-tools"><div class="dv-who" role="group" aria-label="담당 필터">${filters.map(([v, l, n]) => html`<button type="button" key=${v} class="chip" aria-pressed=${filter === v} onClick=${() => setFilter(v)}>${l}<span>${n}</span></button>`)}</div>
   <form class="tb-assign-add" onSubmit=${add}>${I('Plus', 15)}<input aria-label="업무 추가" maxLength="150" placeholder=${filter !== 'all' && filter !== 'none' ? `${filter}에게 줄 업무 추가 후 Enter` : '업무 추가 후 Enter'} value=${title} onInput=${e => setTitle(e.target.value)} /></form></div>
  <div class="tb-assign-list" data-sort-list>${!list.length ? html`<p class="tb-none pad">${items.length ? '해당하는 업무가 없어요.' : isAdmin ? '아직 업무가 없어요. A 보드에서 불러오거나 위에서 추가해 주세요.' : '아직 업무가 없어요.'}</p>` : list.map(x => { const d = dDay(x.due), st = checkStat(x); return html`<div class=${cx('tb-arow', !x.assignee && 'unassigned', x.issue && 'has-issue')} key=${x.id} data-sort-id=${x.id}>
   ${list.length > 1 && html`<${SortGrip} id=${x.id} label="끌어서 순서 바꾸기" onDrop=${onReorder} />`}<span class=${cx('dday', d.cls)}>${d.label}</span>
   <div class="tb-arow-main"><button type="button" class="tb-arow-title" onClick=${() => onOpen(x.id)}><strong>${x.title}</strong></button><span class="tb-arow-meta">${x.src_board && html`<span class="tag tb-src">A${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}${x.priority !== 'share' && html`<span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>`}${x.issue && html`<span class=${'tag tb-issue ' + x.issue}>${TEAM_ISSUES[x.issue]}</span>`}<small>${[statuses[x.status], x.progress ? `${x.progress}%` : '', st.total ? `세부 ${st.done}/${st.total}` : '', cmap[x.id] ? `댓글 ${cmap[x.id]}` : ''].filter(Boolean).join(' · ')}</small></span></div>
   <div class="tb-assign-btns" role="group" aria-label="담당 정하기">${[...names.map(n => [n, n]), ['함께', '둘 다']].map(([v, l]) => html`<button type="button" key=${v} class=${cx('tb-abtn', x.assignee === v && 'on')} aria-pressed=${x.assignee === v} disabled=${busy} title=${x.assignee === v ? '한 번 더 누르면 미배정으로' : `${l}에게 배정`} onClick=${() => assign(x, v)}>${l}</button>`)}</div>
  </div>`; })}</div>
 </section>`;
}

function TeamOrders({items, who, onWho, isAdmin, cmap, onOpen, onCreate, onImport, onPatch, busy}) {
 const [title, setTitle] = useState(''), [assignee, setAssignee] = useState(''), [dueMode, setDueMode] = useState('none'), [dueDate, setDueDate] = useState(''), [priority, setPriority] = useState('share');
 const names = teamDesigners().map(s => s.name);
 const dueOf = () => dueMode === 'today' ? today() : dueMode === 'tomorrow' ? offsetDate(today(), 1) : dueMode === 'dayafter' ? offsetDate(today(), 2) : dueMode === 'date' ? dueDate : '';
 async function submit(e) { e.preventDefault(); const t = title.trim(); if (!t || busy) return; try { await onCreate({title: t.slice(0, 150), assignee, due: dueOf(), priority}); setTitle(''); } catch {} }
 const list = (who === 'all' ? items : who === 'none' ? items.filter(x => !x.assignee) : items.filter(x => teamHas(x, who))).sort(teamByDue);
 const filters = [['all', '전체', items.length], ...names.map(n => [n, n, items.filter(x => teamHas(x, n)).length]), ['none', '미배정', items.filter(x => !x.assignee).length]];
 return html`<section class="tb-orders">
  <form class="quick-task pl-add tb-add" onSubmit=${submit}><div class="quick-compose">${I('Plus', 18)}<input aria-label="오더 제목" placeholder="디자인팀에 맡길 일을 한 줄로 적고 Enter" maxLength="150" value=${title} onInput=${e => setTitle(e.target.value)} /><button class="quick-submit" disabled=${!title.trim() || busy} aria-label="오더 등록">${I('ArrowRight', 18)}</button></div>
   <div class="quick-task-options">
    <div class="chip-group" role="group" aria-label="담당"><span>담당</span>${[['', '미배정'], ...names.map(n => [n, n]), ['함께', '둘 다']].map(([v, l]) => html`<button type="button" key=${l} class="chip" aria-pressed=${assignee === v} onClick=${() => setAssignee(v)}>${l}</button>`)}</div>
    <div class="chip-group" role="group" aria-label="마감"><span>마감</span>${[['none', '없음'], ['today', '오늘'], ['tomorrow', '내일'], ['dayafter', '모레']].map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${dueMode === v} onClick=${() => setDueMode(v)}>${l}</button>`)}<input type="date" class="chip-date" aria-label="마감일 직접 선택" value=${dueMode === 'date' ? dueDate : ''} onInput=${e => { setDueDate(e.target.value); setDueMode(e.target.value ? 'date' : 'none'); }} /></div>
    <div class="chip-group" role="group" aria-label="중요도"><span>중요도</span>${Object.entries(taskPriorities).map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${priority === v} onClick=${() => setPriority(v)}>${l}</button>`)}</div>
   </div></form>
  <div class="tb-bar"><div class="dv-who" role="group" aria-label="담당 필터">${filters.map(([v, l, n]) => html`<button type="button" key=${v} class="chip" aria-pressed=${who === v} onClick=${() => onWho(v)}>${l}<span>${n}</span></button>`)}</div>${isAdmin && html`<button type="button" class="tb-import-btn" onClick=${onImport}>${I('Download', 15)}A 보드에서 불러오기</button>`}</div>
  <div class="pl-group tb-list">${!list.length ? html`<p class="tb-none pad">${who === 'all' ? '아직 오더가 없어요. 위에서 적거나 A 보드에서 불러와 주세요.' : '해당하는 업무가 없어요.'}</p>` : list.map(x => { const d = dDay(x.due), st = checkStat(x); return html`<div class=${cx('tb-row', x.issue && 'has-issue', x.priority !== 'share' && 'prio-' + x.priority)} key=${x.id}>
   <span class=${cx('dday', d.cls)}>${d.label}</span>
   <div class="tb-row-main"><button type="button" class="pl-title" onClick=${() => onOpen(x.id)}><strong>${x.title}</strong>${x.due ? html`<span class="pl-date">${shortDate(x.due)} 마감</span>` : ''}</button>${descLine(x) && html`<button type="button" class="pl-desc" onClick=${() => onOpen(x.id)}>${descLine(x)}</button>`}
    <span class="pl-tags">${x.src_board && html`<span class="tag tb-src" title=${`A 보드 원본: ${x.src_title}`}>${I('Link2', 12)}A${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}${x.issue && html`<span class=${'tag tb-issue ' + x.issue}>${I('AlertCircle', 12)}${TEAM_ISSUES[x.issue]}</span>`}${st.total > 0 && html`<span class="tag">${I('ListChecks', 12)}세부 ${st.done}/${st.total}</span>`}<button type="button" class=${cx('reply-chip', cmap[x.id] && 'has')} onClick=${() => onOpen(x.id)}>${I('MessageCircle', 12)}${cmap[x.id] ? `댓글 ${cmap[x.id]}` : '댓글'}</button></span></div>
   <select class="tb-who" aria-label="담당" value=${x.assignee} disabled=${busy} onChange=${e => onPatch(x, {assignee: e.target.value}, `담당 ${teamWho(e.target.value)}`)}><option value="">미배정</option>${names.map(n => html`<option key=${n} value=${n}>${n}</option>`)}<option value="함께">둘 다</option></select>
   <span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>
   <span class="tb-prog"><i><b style=${`width:${x.progress || 0}%`}></b></i><em>${x.progress || 0}%</em></span>
   <select class=${'tb-status-sel ' + x.status} aria-label="상태" value=${x.status} disabled=${busy} onChange=${e => onPatch(x, {status: e.target.value}, `상태 ${statuses[e.target.value]}`)}>${Object.entries(statuses).map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}</select>
  </div>`; })}</div>
 </section>`;
}

function TeamDue({items, cmap, onOpen}) {
 const t = today(), t1 = offsetDate(t, 1), wEnd = offsetDate(mondayOf(t), 6), nEnd = offsetDate(wEnd, 7);
 const groups = [['지난 마감', x => x.due && x.due < t, 'late'], ['오늘', x => x.due === t, 'today'], ['내일', x => x.due === t1, ''], ['이번 주', x => x.due > t1 && x.due <= wEnd, ''], ['다음 주', x => x.due > wEnd && x.due <= nEnd, ''], ['그 이후', x => x.due > nEnd, ''], ['마감 없음', x => !x.due, 'muted']];
 const sorted = [...items].sort(teamByDue);
 return html`<section class="tb-due">${groups.map(([l, f, c]) => { const list = sorted.filter(f); return list.length > 0 && html`<div class=${cx('pl-group tb-due-group', c)} key=${l}><div class="pl-group-head"><span>${l}</span><small>${list.length}건</small></div>${list.map(x => html`<${TeamMini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} extra=${x.due ? html`<span class="tb-date">${teamDay(x.due)}</span>` : ''} />`)}</div>`; })}${!items.length && html`<p class="tb-none pad">남은 업무가 없어요.</p>`}</section>`;
}

function TeamIssues({items, comments, all, cmap, onOpen, onPatch, busy}) {
 const recent = comments.filter(c => all.some(x => x.id === c.item_id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15);
 const titleOf = id => (all.find(x => x.id === id) || {}).title || '';
 return html`<section class="tb-issues">
  <div class="pl-group"><div class="pl-group-head"><span>열린 특이사항</span><small>${items.length}건 · 업무 상세에서 막힘 / 일정 위험 / 확인 필요를 표시하면 여기에 모여요</small></div>
   ${!items.length ? html`<p class="tb-none pad">지금 보고된 특이사항이 없어요.</p>` : items.map(x => html`<div class=${'tb-issue-row ' + x.issue} key=${x.id}><span class=${'tb-issue ' + x.issue}>${I('AlertCircle', 13)}${TEAM_ISSUES[x.issue]}</span><button type="button" class="tb-issue-main" onClick=${() => onOpen(x.id)}><strong>${x.title}</strong><span>${x.issue_note || TEAM_ISSUE_HINT[x.issue]}</span><small>${x.issue_by || ''}${x.issue_at ? ` · ${teamDay(inSeoul(x.issue_at))} ${teamClock(x.issue_at)}` : ''} · 담당 ${teamWho(x.assignee)} · ${dDay(x.due).label}</small></button><button type="button" class="dv-undo" disabled=${busy} onClick=${() => onPatch(x, {issue: '', issue_note: ''}, '특이사항 해결')}>해결</button></div>`)}</div>
  <div class="pl-group"><div class="pl-group-head"><span>최근 댓글 · 보고</span><small>${recent.length}건</small></div>${!recent.length ? html`<p class="tb-none pad">아직 댓글이 없어요.</p>` : recent.map(c => html`<button type="button" class="tb-feed" key=${c.id} onClick=${() => onOpen(c.item_id)}><span class="avatar mini">${personName(c.author_name).slice(0, 1)}</span><span><strong>${personName(c.author_name)}</strong><em>${titleOf(c.item_id)}</em><p>${c.body}</p></span><small>${teamDay(inSeoul(c.created_at))} ${teamClock(c.created_at)}</small></button>`)}</div>
 </section>`;
}

function TeamDone({items, cmap, onOpen, onPatch, busy}) {
 const [limit, setLimit] = useState(60);
 const list = [...items].sort((a, b) => doneAt(b).localeCompare(doneAt(a)));
 const groups = []; list.slice(0, limit).forEach(x => { const d = inSeoul(doneAt(x)) || '날짜 없음'; const g = groups[groups.length - 1]; if (g && g.day === d) g.items.push(x); else groups.push({day: d, items: [x]}); });
 return html`<section class="done-view">${!list.length && html`<p class="dv-empty">아직 완료한 업무가 없어요.</p>`}${groups.map(g => html`<div class="pl-group dv-group" key=${g.day}><div class="pl-group-head"><span>${teamDay(g.day)}</span><small>${g.items.length}건</small></div>${g.items.map(x => html`<div class="dv-row" key=${x.id}><span class="dv-check">${I('Check', 14)}</span><div class="dv-main"><button type="button" class="dv-title" onClick=${() => onOpen(x.id)}><strong>${x.title}</strong>${x.due ? html`<span class="pl-date">${shortDate(x.due)} 마감${inSeoul(doneAt(x)) > x.due ? ' · 늦게 완료' : ''}</span>` : ''}</button><span class="pl-tags"><span class="tag">${teamWho(x.assignee)}</span>${x.src_board && html`<span class="tag tb-src">A${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}${cmap[x.id] ? html`<span class="tag">댓글 ${cmap[x.id]}</span>` : ''}</span></div><span class="dv-time">${teamClock(doneAt(x))}</span><button type="button" class="dv-undo" disabled=${busy} onClick=${() => onPatch(x, {status: 'doing'}, '완료 취소')}>되돌리기</button></div>`)}</div>`)}${list.length > limit && html`<button type="button" class="dv-more" onClick=${() => setLimit(l => l + 60)}>이전 완료 더 보기 (${list.length - limit}건)</button>`}</section>`;
}

function TeamDetail({item: x, comments, me, isAdmin, busy, onClose, onPatch, onChecklist, onComment, onEditComment, onDeleteComment, onRemove}) {
 const [issue, setIssue] = useState(x.issue), [note, setNote] = useState(x.issue_note), [text, setText] = useState(''), [editing, setEditing] = useState(null), [editText, setEditText] = useState('');
 useEffect(() => { setIssue(x.issue); setNote(x.issue_note); }, [x.id, x.issue, x.issue_note]);
 const names = teamDesigners().map(s => s.name), canDelete = isAdmin || x.author_id === me.id;
 const saveIssue = () => onPatch(x, issue ? {issue, issue_note: note.trim().slice(0, 300), issue_at: nowIso(), issue_by: me.name} : {issue: '', issue_note: ''}, issue ? `특이사항 ${TEAM_ISSUES[issue]}` : '특이사항 해결');
 async function send(e) { e.preventDefault(); if (!text.trim()) return; try { await onComment(x, text); setText(''); } catch {} }
 const header = html`<div class="sheet-head tb-detail-head"><span class=${'tag ' + x.status}>${statuses[x.status]}</span>${x.src_board && html`<span class="tag tb-src">${I('Link2', 12)}A 보드에서 불러옴${x.topic_label ? ` · ${x.topic_label}` : ''}</span>`}</div>`;
 return html`<${Sheet} class="tb-detail" onClose=${onClose} header=${header}>
  <div class="tb-detail-body">
   <${AutoText} class="tb-d-title" single value=${x.title} label="업무 제목" maxLength="150" disabled=${busy} onCommit=${v => onPatch(x, {title: v}, '제목 수정')} />
   <${AutoText} class="tb-d-body" value=${x.body} label="설명" placeholder="설명이나 요청 사항을 적어 주세요 (레퍼런스, 사이즈, 톤 등)" maxLength="6000" disabled=${busy} onCommit=${v => onPatch(x, {body: v}, '내용 수정')} />
   <div class="tb-fields">
    <div><span>담당</span><div class="tb-chips">${[['', '미배정'], ...names.map(n => [n, n]), ['함께', '둘 다']].map(([v, l]) => html`<button type="button" key=${l} class="chip" aria-pressed=${x.assignee === v} disabled=${busy} onClick=${() => x.assignee !== v && onPatch(x, {assignee: v}, `담당 ${teamWho(v)}`)}>${l}</button>`)}</div></div>
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
   <${Checklist} item=${x} editable=${true} busy=${busy} onAct=${onChecklist} />
   ${x.src_board && html`<p class="tb-src-line">${I('Link2', 13)}A 보드 원본: <strong>${x.src_title}</strong>${isAdmin ? ' · 진행 상황이 A 보드 원본에도 표시돼요' : ''}</p>`}
   <section class="tb-comments"><h3>${I('MessageCircle', 15)}댓글 · 보고 <span>${comments.length}</span></h3>
    ${comments.map(c => html`<article class="update" key=${c.id}><span class="avatar mini">${personName(c.author_name).slice(0, 1)}</span><div><div class="update-meta"><strong>${personName(c.author_name)}</strong><small>${teamDay(inSeoul(c.created_at))} ${teamClock(c.created_at)}${c.edited_at ? ' · 수정됨' : ''}</small>${c.author_id === me.id && editing !== c.id && html`<span class="tb-c-tools"><button type="button" class="text-button" onClick=${() => { setEditing(c.id); setEditText(c.body); }}>수정</button><button type="button" class="text-button" onClick=${() => onDeleteComment(c)}>삭제</button></span>`}</div>${editing === c.id ? html`<form class="tb-c-edit" onSubmit=${async e => { e.preventDefault(); try { await onEditComment(c, editText); setEditing(null); } catch {} }}><textarea rows="2" value=${editText} onInput=${e => setEditText(e.target.value)}></textarea><div><button type="button" class="secondary-button" onClick=${() => setEditing(null)}>취소</button><button class="primary-button" disabled=${busy || !editText.trim()}>저장</button></div></form>` : html`<p>${c.body}</p>`}</div></article>`)}
    <form class="tb-c-add" onSubmit=${send}><textarea rows="2" maxLength="3000" placeholder="진행 상황, 질문, 시안 링크 등을 남겨 주세요" value=${text} onInput=${e => setText(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e); }}></textarea><button class="primary-button" disabled=${busy || !text.trim()}>${I('Send', 14)}남기기</button></form>
   </section>
   <p class="tb-meta">${x.author_name} 등록 · ${fullTime(x.created_at)}${x.last_change ? ` · 최근: ${x.updated_by_name} ${x.last_change}` : ''}</p>
   ${canDelete && html`<button type="button" class="text-button tb-delete" disabled=${busy} onClick=${() => onRemove(x)}>${I('Trash2', 14)}업무 지우기</button>`}
  </div>
 <//>`;
}

function TeamImport({existing, busy, onClose, onImport}) {
 const [state, setState] = useState({loading: true, rows: [], topics: [], error: ''}), [topic, setTopic] = useState('all'), [picked, setPicked] = useState(new Set()), [assignee, setAssignee] = useState(''), [showDone, setShowDone] = useState(false);
 useEffect(() => { (async () => {
  try {
   if (!window.PS_READ_BOARD) throw new Error('이 화면에서는 A 보드를 읽을 수 없어요.');
   const r = await window.PS_READ_BOARD('A'); const tname = Object.fromEntries(r.topics.map(t => [t.id, t.name]));
   const rows = r.items.filter(d => d.kind === 'task' && (d.home || 'A') === 'A').map(d => ({id: d.id, title: String(d.title || ''), body: String(d.body || ''), due: String(d.due || ''), priority: priorities[d.priority] ? d.priority : 'share', status: statuses[d.status] ? d.status : 'todo', assignee: personName(d.assignee || '함께'), topic_id: String(d.topic_id || ''), topic: tname[d.topic_id] || '', created_at: String(d.created_at || ''), linked: !!(d.c_link && d.c_link.id)})).sort(teamByDue);
   setState({loading: false, rows, topics: r.topics.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), error: ''});
  } catch (e) { console.error('import read', e); setState({loading: false, rows: [], topics: [], error: friendlyError(e)}); }
 })(); }, []);
 const taken = r => existing.has(r.id) || r.linked;
 const pool = state.rows.filter(r => (showDone || r.status !== 'done') && (topic === 'all' || (topic === 'none' ? !r.topic : r.topic_id === topic)));
 const avail = pool.filter(r => !taken(r));
 const toggle = id => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
 const chosen = state.rows.filter(r => picked.has(r.id) && !taken(r));
 const names = teamDesigners().map(s => s.name);
 return html`<${Dialog} class="tb-import" title="A 보드에서 불러오기" description="A 보드 업무를 디자인팀 오더로 가져와요. 원본은 A에 그대로 남고, 디자인팀 진행 상황이 원본에 표시돼요." onClose=${onClose}>
  ${state.loading ? html`<div class="loading">${I('Loader2', 20, {class: 'spin'})}A 보드 업무를 읽는 중이에요.</div>` : state.error ? html`<p class="form-error">${state.error}</p>` : html`<${Fragment}>
   <div class="tb-imp-filter"><div class="dv-who" role="group" aria-label="카테고리">${[['all', '전체'], ...state.topics.map(t => [t.id, t.name]), ['none', '미분류']].map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${topic === v} onClick=${() => setTopic(v)}>${l}<span>${state.rows.filter(r => (showDone || r.status !== 'done') && (v === 'all' || (v === 'none' ? !r.topic : r.topic_id === v))).length}</span></button>`)}</div><label class="tb-imp-done"><input type="checkbox" checked=${showDone} onChange=${e => setShowDone(e.target.checked)} />완료 포함</label></div>
   <div class="tb-imp-head"><label><input type="checkbox" checked=${avail.length > 0 && avail.every(r => picked.has(r.id))} disabled=${!avail.length} onChange=${e => setPicked(p => { const n = new Set(p); avail.forEach(r => e.target.checked ? n.add(r.id) : n.delete(r.id)); return n; })} />보이는 업무 모두 선택</label><small>${pool.length}건 중 불러올 수 있는 ${avail.length}건</small></div>
   <ul class="tb-imp-list">${!pool.length && html`<li class="tb-none pad">해당하는 업무가 없어요.</li>`}${pool.map(r => html`<li key=${r.id} class=${cx(taken(r) && 'taken')}><label><input type="checkbox" checked=${picked.has(r.id) && !taken(r)} disabled=${taken(r)} onChange=${() => toggle(r.id)} /><span class="tb-imp-main"><strong>${r.title}</strong><small>${[r.topic || '미분류', r.assignee, statuses[r.status], r.due ? `${shortDate(r.due)} 마감` : '마감 없음'].join(' · ')}</small></span>${taken(r) ? html`<span class="tag tb-src">이미 불러옴</span>` : r.priority !== 'share' && html`<span class=${'tag priority-tag ' + r.priority}>${taskPriorities[r.priority]}</span>`}</label></li>`)}</ul>
   <div class="tb-imp-foot"><div class="chip-group" role="group" aria-label="불러온 업무 담당"><span>담당</span>${[['', '미배정'], ...names.map(n => [n, n]), ['함께', '둘 다']].map(([v, l]) => html`<button type="button" key=${l} class="chip" aria-pressed=${assignee === v} onClick=${() => setAssignee(v)}>${l}</button>`)}</div>
    <div class="tb-imp-actions"><button type="button" class="secondary-button" disabled=${busy || !avail.length} onClick=${() => onImport(avail, assignee)}>보이는 업무 전체 불러오기 (${avail.length})</button><button type="button" class="primary-button" disabled=${busy || !chosen.length} onClick=${() => onImport(chosen, assignee)}>선택 불러오기 (${chosen.length})</button></div></div>
  <//>`}
 <//>`;
}

// C 보드는 팀 운영 화면, A·B는 기존 공유 보드.
function AppRoot() { return BOARD === 'C' ? html`<${TeamBoard} />` : html`<${Board} />`; }
if (window.PS_MOUNT) window.PS_MOUNT(AppRoot, ShareView); else render(html`<${AppRoot} />`, document.getElementById('app'));
