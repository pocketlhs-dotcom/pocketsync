
/* ===== A·B 보드 '업무 현황' (10-07) ===== */
// C 팀 현황과 같은 틀(왼쪽: 오늘 일정 + 업무 리스트, 오른쪽: 사람 카드)에 A·B에 필요한 것을 붙였다:
// 두 사람 일정 · 비는 시간, 카테고리, 업무 요청(맡을게요 · 어려워요), '함께' 담당, 오늘의 나 · 지금 상태 · 한마디.
// A·B 담당은 이름 하나 또는 '함께'(두 사람). C처럼 줄마다 담당 버튼을 눌러 바꾼다(둘 다 켜면 함께).
const abNames = () => SEATS.map(s => s.name);
const abWho = x => personName(x.assignee) || '함께';
const abHas = (x, n) => { const w = abWho(x); return w === '함께' || w === n || w.split('·').includes(n); };
const abToggleWho = (x, n) => { const all = abNames(), w = abWho(x), cur = w === '함께' ? all : [w], next = cur.includes(n) ? cur.filter(v => v !== n) : [...cur, n]; if (!next.length) return null; return next.length >= all.length ? '함께' : all.find(v => next.includes(v)); };
const abLane = n => (abNames().indexOf(n) === 0 ? 'lhs' : 'kjs');

// 사람 카드 · 마감 탭의 작은 줄(C의 TeamMini와 같은 모양, A·B 담당 표시).
function AbMini({x, cmap = {}, onOpen, showWho = true, extra, self = ''}) {
 const d = dDay(x.due), w = abWho(x), co = self && w === '함께' ? abNames().filter(n => n !== self) : [];
 return html`<button type="button" class=${cx('tb-mini', x.status === 'doing' && 'doing')} onClick=${() => onOpen(x.id)}>
  <span class=${cx('dday', x.status === 'done' ? 'none' : d.cls)}>${x.status === 'done' ? '완료' : d.label}</span>
  <span class="tb-mini-main"><strong>${x.title}${co.length > 0 && html`<span class="tb-co" title=${`함께: ${co.join(', ')}`}>${I('Users', 12)}${co.map(n => html`<i key=${n}>${n.slice(0, 1)}</i>`)}</span>`}</strong><small>${[showWho && w, teamStartLabel(x) || statuses[x.status], x.checklist.length ? `세부 ${checkStat(x).done}/${x.checklist.length}` : '', cmap[x.id] ? `댓글 ${cmap[x.id]}` : ''].filter(Boolean).join(' · ')}</small></span>
  <span class="ab-mini-side">${x.priority !== 'share' && html`<span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>`}${extra}</span>
  <span class="tb-prog"><i><b style=${`width:${x.progress || 0}%`}></b></i><em>${x.progress || 0}%</em></span>
 </button>`;
}

// 오늘 일정: 두 사람 일정을 사람마다 한 칸인 하루 띠와 시간순 목록으로. 비는 시간 칩을 누르면 함께 일정 만들기, '+ 일정 추가'로 바로 넣는다.
function AbToday({events, meId, meName, writable, busy, onOpen, onCreate, onCompose, freshIds}) {
 const [, tick] = useState(0), [slot, setSlot] = useState(null), titleRef = useRef(null);
 useEffect(() => { const h = setInterval(() => tick(n => n + 1), 60000); return () => clearInterval(h); }, []);
 const t = today(), nowM = nowMinutesSeoul(), now = fromMin(nowM);
 const list = [...events].sort((a, b) => (a.start || '').localeCompare(b.start || '') || (a.end || '').localeCompare(b.end || ''));
 const spanOf = e => eventSpan(e) || [WORK_START, WORK_END];
 const on = e => !!e.start && e.start <= now && (e.end || e.start) > now, past = e => !!e.start && (e.end || e.start) <= now;
 const cur = list.find(on), next = list.find(e => e.start && e.start > now);
 const timedList = list.filter(e => e.start), timed = timedList.map(spanOf);
 const r0 = Math.floor(Math.min(WORK_START, ...timed.map(x => x[0])) / 60) * 60, r1 = Math.ceil(Math.max(WORK_END, ...timed.map(x => x[1])) / 60) * 60;
 const pct = m => ((Math.min(Math.max(m, r0), r1) - r0) / (r1 - r0)) * 100;
 const hours = []; for (let m = r0; m <= r1; m += 60) hours.push(m);
 const from = Math.max(WORK_START, Math.ceil(nowM / 30) * 30), windows = from < WORK_END ? freeWindows(list.map(spanOf), from, WORK_END) : [];
 const other = (SEATS.find(s => s.name !== meName) || SEATS[1]).name;
 const whoChoices = meName ? [[meName, '나'], [other, other], ['함께', '함께']] : [...abNames().map(n => [n, n]), ['함께', '함께']];
 const open = () => { const base = fromMin(Math.min(21 * 60, (Math.floor(nowM / 60) + 1) * 60)), ends = list.filter(e => e.end && involves(e, meName || '함께')).map(e => e.end).sort(), lastEnd = ends[ends.length - 1], st = lastEnd && toMin(lastEnd) > toMin(base) && toMin(lastEnd) < 21 * 60 ? lastEnd : base; setSlot({start: st, end: fromMin(Math.min(toMin(st) + 60, 1439)), title: '', who: meName || '함께'}); setTimeout(() => { if (titleRef.current) titleRef.current.focus(); }, 0); };
 async function submit(e) {
  e.preventDefault(); if (!slot || busy) return;
  const title = slot.title.trim(); if (!title) { if (titleRef.current) titleRef.current.focus(); return; }
  if (!TIME_RE.test(slot.start) || !TIME_RE.test(slot.end)) { toast.error('시작과 끝 시간을 넣어 주세요.'); return; }
  if (toMin(slot.end) <= toMin(slot.start)) { toast.error('끝나는 시간을 시작 시간보다 뒤로 맞춰 주세요.'); return; }
  try { await onCreate({kind: 'event', title: title.slice(0, 150), start: slot.start, end: slot.end, assignee: slot.who, category: 'work'}); setSlot(null); } catch {}
 }
 const block = (e, lane) => { const masked = isMasked(e, meId), joint = abWho(e) === '함께', [a, b] = spanOf(e); return html`<button type="button" key=${e.id + lane} class=${cx('strip-block', joint ? 'joint' : lane, masked && 'private')} style=${`left:${pct(a)}%;width:${Math.max(pct(b) - pct(a), 1)}%`} title=${`${timeRangeLabel(e)} ${displayTitle(e, meId)} · ${abWho(e)}`} onClick=${() => onOpen(e.id)}>${displayTitle(e, meId)}</button>`; };
 const strip = html`<div class="strip tb-meet-strip ab-strip" aria-hidden="true"><div class="strip-labels">${abNames().map(n => html`<${PersonAv} key=${n} name=${n} mini=${true} cls=${abLane(n) === 'kjs' ? 'amber' : ''} />`)}</div><div class="strip-area"><div class="strip-hours">${hours.map(m => html`<span key=${m} class=${cx('strip-tick', (m / 60) % 2 === 1 && 'odd')} style=${`left:${pct(m)}%`}><span>${m / 60}</span></span>`)}</div>${hours.map(m => html`<i key=${'l' + m} class="strip-line" style=${`left:${pct(m)}%`}></i>`)}${windows.map(w => html`<i key=${'f' + w[0]} class="strip-free" title=${`둘 다 비는 시간 ${fromMin(w[0])}–${fromMin(w[1])}`} style=${`left:${pct(w[0])}%;width:${pct(w[1]) - pct(w[0])}%`}></i>`)}${nowM >= r0 && nowM <= r1 && html`<i class="strip-now" style=${`left:${pct(nowM)}%`}></i>`}${abNames().map(n => html`<div class="strip-track" key=${n}>${timedList.filter(e => involves(e, n)).map(e => block(e, abLane(n)))}</div>`)}</div></div>`;
 const row = e => {
  const masked = isMasked(e, meId), w = abWho(e);
  return html`<button type="button" key=${e.id} class=${cx('agenda-row ev tb-meet-row ab-day-row', on(e) && 'now', past(e) && 'past', masked && 'private')} title="일정 열기" onClick=${() => onOpen(e.id)}><span class="agenda-time">${e.start ? html`<strong>${e.start}</strong><small>${e.end ? '–' + e.end : ''}</small>` : html`<strong>종일</strong>`}</span><span class="agenda-title">${freshIds && freshIds.has(e.id) && html`<i class="fresh-dot"></i>`}${masked && I('Lock', 13)}<span>${displayTitle(e, meId)}</span><span class=${cx('ab-who', w === '함께' && 'joint')}><${WhoAvatars} name=${e.assignee} />${w === meName ? '나' : w}</span><${CollabTag} item=${e} meId=${meId} />${on(e) ? html`<span class="tb-meet-state now">지금</span>` : ''}</span></button>`;
 };
 const form = slot && html`<form key="ab-slot" class="agenda-row slot-form tb-meet-form ab-day-form" aria-label="일정 바로 추가" onSubmit=${submit} onKeyDown=${e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); setSlot(null); } }}>
  <span class="slot-times"><input type="time" aria-label="시작 시간" value=${slot.start} onChange=${e => { const v = e.target.value; setSlot(x => { if (!x) return x; if (!TIME_RE.test(v)) return {...x, start: v}; const dur = TIME_RE.test(x.start) && TIME_RE.test(x.end) ? Math.max(15, toMin(x.end) - toMin(x.start)) : 60; return {...x, start: v, end: fromMin(Math.min(toMin(v) + dur, 1439))}; }); }} /><span>–</span><input type="time" aria-label="끝 시간" value=${slot.end} onChange=${e => { const v = e.target.value; setSlot(x => x && {...x, end: v}); }} /></span>
  <input ref=${titleRef} class="slot-title" aria-label="일정 제목" placeholder="어떤 일정인가요? Enter로 저장" maxLength="150" value=${slot.title} onInput=${e => { const v = e.target.value; setSlot(x => x && {...x, title: v}); }} />
  <span class="ab-day-who" role="group" aria-label="누구 일정">${whoChoices.map(([v, l]) => html`<button type="button" key=${v} class="chip" aria-pressed=${slot.who === v} onClick=${() => setSlot(x => x && {...x, who: v})}>${l}</button>`)}</span>
  <button class="slot-ok" aria-label="저장" title="저장" disabled=${busy || !slot.title.trim()}>${I('Check', 14)}</button><button type="button" class="slot-cancel" aria-label="취소" title="취소" onClick=${() => setSlot(null)}>${I('X', 14)}</button>
 </form>`;
 return html`<section class="tb-meet ab-day" aria-label="오늘 일정">
  <div class="tb-meet-head">${meetIcon()}<strong>오늘 일정</strong><small>${Number(t.slice(5, 7))}월 ${Number(t.slice(8))}일 (${'일월화수목금토'[new Date(t + 'T12:00:00Z').getUTCDay()]})</small>${cur ? html`<span class="tb-meet-state now">지금 ${abWho(cur) === '함께' ? '함께 ' : ''}일정 중</span>` : next ? html`<span class="tb-meet-state">다음 ${next.start}</span>` : ''}
   ${windows.length > 0 ? html`<span class="ab-free"><small>둘 다 비는 시간</small>${windows.slice(0, 3).map(w => html`<button type="button" key=${w[0]} class="chip free-chip" disabled=${!writable} title="이 시간에 함께 일정 잡기" onClick=${() => onCompose({title: '짧은 싱크', start: fromMin(w[0]), end: fromMin(Math.min(w[0] + 30, w[1])), assignee: '함께', category: 'work'})}>${fromMin(w[0])}–${fromMin(w[1])}</button>`)}</span>` : ''}</div>
  ${timedList.length > 0 && strip}
  <div class="tb-meet-rows">${list.map(row)}${!list.length && !slot && html`<p class="tb-meet-empty">오늘 잡힌 일정이 없어요. 바쁜 시간을 남겨 두면 서로 연락할 때를 맞추기 쉬워요.</p>`}${writable && (slot ? form : html`<button type="button" class="agenda-row slot-add tb-meet-slot" onClick=${open}><span class="slot-plus">${I('Plus', 14)}</span><span>일정 추가</span></button>`)}</div>
 </section>`;
}

// 업무 리스트: C 팀 현황과 같은 틀(사람 필터 · 한 줄 추가 · 상태 탭 · 줄마다 상태 · 마감 · 담당 바로 바꾸기 · 세부 업무 · 끌어서 순서 · 리스트/타임라인).
// A·B 것: 카테고리(고르기 + 줄 태그), 업무 요청(요청 칩 · 수락 대기 태그), 확인 요청 중 · 협업 · 디자인팀 연결 · 다른 보드에서 공유된 업무(보기 전용).
// clink: 디자인팀(C) 연결 패널을 그리는 함수(이현성만). 줄의 '+ 디자인팀'을 누르면 줄 아래에 펼친다.
function AbTaskList({tasks, view, onView, stab, onStab, who, onWho, topic, onTopic, topics, topicName, cmap = {}, confirmIds, freshIds, meId, meName, writable, busy, onOpen, onPatch, onChecklist, onCreate, onReorder, onTopicAdd, onTopicManage, clink = null}) {
 const [title, setTitle] = useState(''), [checksOpen, setChecksOpen] = useState({}), [linkOpen, setLinkOpen] = useState({});
 const names = abNames();
 const inTopic = x => topic === 'all' || (x.topic_id || 'unassigned') === topic;
 const pool0 = tasks.filter(x => x.status !== 'done' || !isArchived(x)), pool = pool0.filter(inTopic);
 const byWho = (x, v) => v === 'all' || (v === 'req' ? x.req === 'pending' : v === '함께' ? abWho(x) === '함께' : abHas(x, v));
 const inTab = (x, k) => k === 'open' ? x.status !== 'done' : x.status === k;
 const STABS = [['doing', '진행 중'], ['todo', '예정'], ['hold', '보류'], ['done', '완료'], ['open', '남은 일 전체']];
 const list = pool.filter(x => byWho(x, who) && inTab(x, stab)).sort(stab === 'done' ? (a, b) => doneAt(b).localeCompare(doneAt(a)) : teamOrder);
 const cnt = v => pool.filter(x => (view === 'timeline' ? x.status !== 'done' : inTab(x, stab)) && byWho(x, v)).length;
 const reqN = pool.filter(x => x.req === 'pending' && x.status !== 'done').length;
 const filters = [['all', '전체'], ['함께', '함께'], ...names.map(n => [n, n === meName ? `${n} (나)` : n]), ...(reqN || who === 'req' ? [['req', '요청']] : [])];
 const pick = who !== 'all' && who !== 'req' ? who : '함께';
 const newTopic = topic === 'all' || topic === 'unassigned' ? '' : topic;
 async function add(e) { e.preventDefault(); const t = title.trim(); if (!t || busy) return; try { await onCreate({kind: 'task', title: t.slice(0, 150), assignee: pick, topic_id: newTopic, status: 'todo', priority: 'share', due: ''}); setTitle(''); if (stab !== 'todo' && stab !== 'open') onStab('todo'); } catch {} }
 const openN = f => pool0.filter(x => x.status !== 'done' && f(x)).length;
 const topicOpts = [{value: 'all', label: '전체 카테고리', meta: `남은 업무 ${openN(() => true)}`}, ...topics.map(t => ({value: t.id, label: t.name, meta: `남은 업무 ${openN(x => x.topic_id === t.id)}`})), {value: 'unassigned', label: TOPIC_NONE, meta: `남은 업무 ${openN(x => !x.topic_id)}`}, ...(writable ? [{value: '__add', label: '카테고리 추가', action: true}, {value: '__manage', label: '카테고리 관리', meta: '이름 · 순서 · 삭제 · 다른 보드 공유', action: true, icon: 'Settings2'}] : [])];
 const tlJoint = {key: 'joint', label: '함께', icon: 'Users', match: x => abWho(x) === '함께'}, tlSolo = n => ({key: n, label: n, name: n, match: x => abWho(x) === n});
 const tlGroups = who === '함께' ? [tlJoint] : names.includes(who) ? [tlSolo(who), tlJoint] : [tlJoint, ...[...names].sort((a, b) => Number(b === meName) - Number(a === meName)).map(tlSolo)];
 const canEdit = x => writable && !x.foreign;
 const row = x => {
  const st = checkStat(x), ed = canEdit(x), w = abWho(x), cc = cmap[x.id] || 0, d = dDay(x.due);
  return html`<div class=${cx('tb-arow ab-row', 'st-' + x.status, x.req === 'pending' && 'is-req', x.foreign && 'is-foreign')} key=${x.id} data-sort-id=${x.id}>
   ${ed && list.length > 1 && stab !== 'done' && html`<${SortGrip} id=${x.id} label="끌어서 순서 바꾸기" onDrop=${onReorder} />`}
   ${ed ? html`<${TeamDuePick} x=${x} busy=${busy} onPatch=${onPatch} />` : html`<span class="tb-duepick"><span class=${cx('dday', x.status === 'done' ? 'none' : d.cls)}>${x.status === 'done' ? '완료' : d.label}</span></span>`}
   <div class="tb-arow-main"><button type="button" class="tb-arow-title" onClick=${() => onOpen(x.id)}><strong>${freshIds && freshIds.has(x.id) && html`<i class="fresh-dot" title="새 소식"></i>`}${x.pinned && html`<span class="pin-mark">${I('Pin', 12)}</span>`}${x.title}</strong></button><span class="tb-arow-meta">${ed ? html`<${TeamStatusPick} x=${x} busy=${busy} onPatch=${onPatch} />` : html`<span class=${'tb-stbadge dm-st st-' + x.status}><i></i>${statuses[x.status]}</span>`}<span class="tag tb-src ab-topic" title="카테고리">${topicName(x.topic_id)}</span>${x.priority !== 'share' && html`<span class=${'tag priority-tag ' + x.priority}>${taskPriorities[x.priority]}</span>`}<${ReqTag} item=${x} meId=${meId} /><${CLinkTag} item=${x} />${confirmIds && confirmIds.has(x.id) && html`<span class="tag confirm-tag">확인 요청 중</span>`}${x.collab === 'requested' && html`<span class="tag collab-tag requested">${x.collab_by === meId ? '협업 요청 중' : '협업 요청 받음'}</span>`}${x.foreign && html`<span class="tag ab-foreign" title="다른 보드에서 카테고리를 공유한 업무예요. 여기서는 볼 수만 있어요.">${I('Eye', 11)}${(window.PS_BOARD_NAMES || {})[x.home] || '다른 보드'}</span>`}${(s => s && html`<small>${s}</small>`)([teamStartLabel(x), x.progress ? `${x.progress}%` : '', cc ? `댓글 ${cc}` : ''].filter(Boolean).join(' · '))}${(st.total > 0 || ed) && html`<button type="button" class=${cx('tb-check-chip', checksOpen[x.id] && 'on', !st.total && 'empty')} aria-expanded=${!!checksOpen[x.id]} onClick=${() => setChecksOpen(o => ({...o, [x.id]: !o[x.id]}))}>${I('ListChecks', 12)}${st.total ? `세부 ${st.done}/${st.total}` : '세부 업무'}${I(checksOpen[x.id] ? 'ChevronUp' : 'ChevronDown', 12)}</button>`}${clink && ed && !x.c_link && x.status !== 'done' && html`<button type="button" class=${cx('tb-check-chip ab-clink-chip', !linkOpen[x.id] && 'empty', linkOpen[x.id] && 'on')} aria-expanded=${!!linkOpen[x.id]} title="디자인팀 보드에 새 업무로 보내거나 이미 있는 업무에 잇기" onClick=${() => setLinkOpen(o => ({...o, [x.id]: !o[x.id]}))}>${I(linkOpen[x.id] ? 'ChevronUp' : 'Plus', 12)}디자인팀</button>`}</span></div>
   <div class="tb-assign-btns ab-who-btns" role="group" aria-label="담당 정하기">${names.map(n => { const onN = abHas(x, n), next = abToggleWho(x, n); return html`<button type="button" key=${n} class=${cx('tb-abtn', onN && 'on')} aria-pressed=${onN} disabled=${!ed || busy} title=${!next ? `${n} 담당 · 다른 사람을 켜면 함께가 돼요` : w === '함께' ? `누르면 ${next} 혼자 맡기` : onN ? `${n} 담당` : `${n}도 함께 맡기`} onClick=${() => { if (!next) { toast.info('담당은 한 명 이상이어야 해요. 다른 사람을 켜면 함께가 돼요.'); return; } if (next !== w) onPatch(x, {assignee: next}); }}>${n}</button>`; })}</div>
   ${checksOpen[x.id] && html`<div class="tb-arow-checks"><${Checklist} item=${x} editable=${ed} busy=${busy} onAct=${onChecklist} compact=${true} /></div>`}
   ${clink && linkOpen[x.id] && !x.c_link && html`<div class="tb-arow-checks ab-clink-row">${clink.panel(x, () => setLinkOpen(o => ({...o, [x.id]: false})))}</div>`}
  </div>`;
 };
 return html`<section class="tb-assign ab-assign">
  <div class="tb-assign-head"><div><strong>업무 리스트</strong></div><div class="tb-head-right"><${Pick} class="ab-topic-pick" label="카테고리" value=${topic} options=${topicOpts} onChange=${v => (v === '__add' ? onTopicAdd() : v === '__manage' ? onTopicManage() : onTopic(v))} /><div class="tb-view" role="group" aria-label="보기 방식">${[['list', 'List', '리스트'], ['timeline', 'ChartGantt', '타임라인']].map(([v, ic, l]) => html`<button type="button" key=${v} class=${cx(view === v && 'on')} aria-pressed=${view === v} aria-label=${l} title=${l} onClick=${() => onView(v)}>${I(ic, 16)}</button>`)}</div></div></div>
  <div class="tb-assign-tools"><div class="dv-who" role="group" aria-label="담당 필터">${filters.map(([v, l]) => html`<button type="button" key=${v} class=${cx('chip', v === 'req' && reqN && 'late')} aria-pressed=${who === v} onClick=${() => onWho(v)}>${l}<span>${v === 'req' ? reqN : cnt(v)}</span></button>`)}</div>
   ${view !== 'timeline' && writable && html`<form class="tb-assign-add" onSubmit=${add}>${I('Plus', 15)}<input aria-label="업무 추가" maxLength="150" placeholder=${(pick === '함께' ? '함께 할 업무' : pick === meName ? '내 업무' : `${pick}님에게 부탁할 업무`) + ` 한 줄 추가 후 Enter${newTopic ? ` · ${topicName(newTopic)}` : ' (담당은 줄에서 바로 정하기)'}`} value=${title} onInput=${e => setTitle(e.target.value)} /><button class="tb-assign-go" disabled=${!title.trim() || busy} aria-label="추가">${I('ArrowRight', 15)}</button></form>`}
  </div>
  ${view === 'timeline' ? html`<${Timeline} items=${pool.filter(x => !x.foreign && byWho(x, who === 'req' ? 'all' : who))} groups=${tlGroups} whoText=${x => abWho(x)} coText=${x => (abWho(x) === '함께' ? `함께: ${names.join(', ')}` : '')} onOpen=${onOpen} onPatch=${writable ? onPatch : null} busy=${busy} />` : html`<${Fragment}><div class="tb-stabs" role="tablist" aria-label="상태별 보기">${STABS.map(([k, l]) => html`<button type="button" role="tab" key=${k} class=${cx('tb-stab', 'st-' + k, stab === k && 'on')} aria-selected=${stab === k} onClick=${() => onStab(k)}><i></i>${l}<b>${pool.filter(x => byWho(x, who) && inTab(x, k)).length}</b></button>`)}</div>
  <div class="tb-assign-list" data-sort-list>${list.length ? list.map(row) : html`<p class="tb-none pad">${pool.length ? `${(STABS.find(t => t[0] === stab) || [])[1] || ''} 업무가 없어요.` : '아직 업무가 없어요. 위에서 한 줄로 추가해 보세요.'}</p>`}</div><//>`}
 </section>`;
}

// 사람 카드: 오늘의 나(지금 상태 · 일의 양 → 마음 → 바라는 것 · 반응), 요청받은 일(맡을게요 · 어려워요), 지금 하는 일, 대기 · 보류.
function AbPerson({seat, isMe, tasks, cmap = {}, checkin, latest, facts, reaction, presence, writable, busy, notesN = 0, onOpen, onList, onCheckin, onReact, onReactNote, onHistory, onPresence, onThread, onAvatar, onAcceptReq, onDeclineReq}) {
 const [declining, setDeclining] = useState(null), [why, setWhy] = useState('');
 const n = seat.name;
 const mine = tasks.filter(x => x.status !== 'done' && !x.foreign && abHas(x, n));
 const pending = mine.filter(x => x.req === 'pending' && abWho(x) === n), work = mine.filter(x => !pending.includes(x));
 const doing = work.filter(x => x.status === 'doing').sort(teamOrder), wait = work.filter(x => x.status !== 'doing').sort(teamOrder);
 const late = work.filter(teamLate).length, avg = work.length ? Math.round(work.reduce((a, x) => a + (x.progress || 0), 0) / work.length) : 0;
 const reqRow = x => { const d = dDay(x.due); return html`<div class="ab-req" key=${x.id}><button type="button" class="ab-req-main" onClick=${() => onOpen(x.id)}><span class=${cx('dday', d.cls)}>${d.label}</span><span class="ab-req-text"><strong>${x.title}</strong><small>${personName(x.author_name)}님이 부탁${x.priority !== 'share' ? ` · ${taskPriorities[x.priority]}` : ''}</small></span></button>${isMe && writable ? (declining === x.id ? html`<form class="req-decline" onSubmit=${async e => { e.preventDefault(); try { await onDeclineReq(x, why.trim()); setDeclining(null); setWhy(''); } catch {} }}><input ref=${focusOnMount} maxLength="300" placeholder="어려운 이유 (선택)" value=${why} onInput=${e => setWhy(e.target.value)} onKeyDown=${e => { if (e.key === 'Escape') { e.stopPropagation(); setDeclining(null); } }} /><button class="primary-button small" disabled=${busy}>보내기</button></form>` : html`<div class="req-actions"><button type="button" class="primary-button small" disabled=${busy} onClick=${() => onAcceptReq(x)}>맡을게요</button><button type="button" class="secondary-button small" disabled=${busy} onClick=${() => { setDeclining(x.id); setWhy(''); }}>어려워요</button></div>`) : html`<span class="req-wait">수락 기다리는 중</span>`}</div>`; };
 const mini = x => html`<${AbMini} key=${x.id} x=${x} cmap=${cmap} onOpen=${onOpen} showWho=${false} self=${n} />`;
 return html`<article class=${cx('tb-person ab-person', isMe && 'mine')}>
  <div class="tb-person-head"><${Av} name=${n} editable=${isMe && writable && !!onAvatar} busy=${busy} onPick=${f => onAvatar(f)} /><div><strong>${n}${isMe ? html`<span class="you-tag">나</span>` : ''}</strong><small>진행 ${doing.length} · 대기 ${wait.length}${late ? html` · <b class="late">지연 ${late}</b>` : ''} · 평균 ${avg}%</small></div><span class="ab-person-tools">${onThread && html`<button type="button" class=${cx('text-button ab-thread', notesN > 0 && 'has')} title="오늘 하루에 대한 한마디" onClick=${onThread}>${I('MessageCircle', 13)}${notesN || '한마디'}</button>`}<button type="button" class="text-button" onClick=${onList}>목록${I('ChevronRight', 13)}</button></span></div>
  <${CheckinCard} bare=${true} seat=${seat} date=${today()} isToday=${true} checkin=${checkin} latest=${latest} facts=${facts} reaction=${reaction} isMe=${isMe} writable=${writable} busy=${busy} onEdit=${onCheckin} onReact=${onReact} onHistory=${onHistory} presence=${presence} onPresence=${onPresence} onReactNote=${onReactNote} />
  ${pending.length > 0 && html`<${Fragment}><div class="tb-sub ab-req-head"><span>요청받은 일 ${pending.length}</span></div>${pending.map(reqRow)}<//>`}
  <div class="tb-sub"><span>지금 하는 일</span></div>${doing.length ? doing.map(mini) : html`<p class="tb-none">진행 중인 업무가 없어요.</p>`}
  ${wait.length > 0 && html`<${Fragment}><div class="tb-sub"><span>대기 · 보류</span></div>${wait.slice(0, 6).map(mini)}${wait.length > 6 && html`<button type="button" class="tb-more" onClick=${onList}>외 ${wait.length - 6}건 더 보기</button>`}<//>`}
 </article>`;
}

// 디자인팀(C) 연결 폼(이현성만: C 업무를 쓸 수 있는 사람). A·B 업무를 C 보드 새 업무로 보내거나(제목 · 설명 · 세부 업무 · 링크 · 상태 · 마감 그대로),
// 이미 있는 C 업무에 잇는다(그 C 업무의 원본이 이 업무가 됨). 그 뒤로는 연결 맞추기(watchTeamLinks)가 상태 · 마감 · 시작일 · 중요도 · 세부 업무 · 진행률을 양쪽 같게 둔다.
const abWords = t => String(t || '').toLowerCase().replace(/[\[\]()<>{}·,.:;!?'"“”‘’/\\_\-+]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
function CLinkForm({item, cTasks = [], cReady = false, cErr = '', busy, onSend, onLink, onClose, onNeed}) {
 const [mode, setMode] = useState('new'), [who, setWho] = useState([]), [pick, setPick] = useState('');
 useEffect(() => { if (onNeed) onNeed(); }, []);
 const names = cNames(), mine = new Set(abWords(item.title));
 const similar = c => abWords(c.title).some(w => mine.has(w) || [...mine].some(m => m.length >= 3 && (w.includes(m) || m.includes(w))));
 const sorted = [...cTasks].sort((a, b) => Number(similar(b)) - Number(similar(a)) || teamOrder(a, b));
 const opts = sorted.map(c => ({value: c.id, label: c.title, group: similar(c) ? '비슷한 디자인팀 업무' : '디자인팀 업무', meta: [cWho(c.assignee), C_ST[c.status], c.due ? dDay(c.due).label : ''].filter(Boolean).join(' · '), pct: c.progress || 0}));
 const toggle = n => setWho(w => (w.includes(n) ? w.filter(v => v !== n) : [...w, n]));
 const actions = (ok, label, icon, run) => html`<div class="ab-clink-actions"><button type="button" class="secondary-button small" onClick=${onClose}>취소</button><button type="button" class="primary-button small" disabled=${busy || !ok} onClick=${async () => { try { await run(); onClose(); } catch {} }}>${I(icon, 14)}${label}</button></div>`;
 return html`<div class="ab-clink">
  <div class="tb-fields ab-clink-fields">
   <div><span>연결</span><div class="tb-chips" role="group" aria-label="연결 방법"><button type="button" class="chip" aria-pressed=${mode === 'new'} onClick=${() => setMode('new')}>새 업무로 보내기</button><button type="button" class="chip" aria-pressed=${mode === 'link'} onClick=${() => setMode('link')}>이미 있는 업무에 잇기</button></div></div>
   ${mode === 'new' ? html`<div><span>담당</span><div class="tb-chips">${names.map(n => html`<button type="button" key=${n} class="chip" aria-pressed=${who.includes(n)} onClick=${() => toggle(n)}>${n}</button>`)}<small class="tb-multi-hint">${who.length ? '여러 명 선택 가능' : '안 고르면 미배정'}</small></div></div>`
    : html`<div><span>업무</span><div class="tb-chips">${cErr ? html`<small class="ab-clink-hint">${cErr}</small>` : !cReady ? html`<small class="ab-clink-hint">${I('Loader2', 13, {class: 'spin'})}디자인팀 업무를 불러오는 중이에요</small>` : opts.length ? html`<${Pick} class="ab-clink-pick" label="이을 디자인팀 업무" value=${pick} options=${opts} placeholder="디자인팀 업무 고르기" onChange=${setPick} />` : html`<small class="ab-clink-hint">이을 수 있는 디자인팀 업무가 없어요(완료 · 이미 이 보드와 연결된 업무 제외)</small>`}</div></div>`}
  </div>
  <p class="ab-clink-hint">${mode === 'new' ? '제목 · 설명 · 세부 업무 · 링크 · 상태 · 마감을 그대로 보내요. 그다음부터 상태 · 마감 · 시작일 · 중요도 · 세부 업무 · 진행률이 양쪽 같이 바뀌어요.' : '이으면 상태 · 마감 · 시작일 · 중요도는 디자인팀 업무 기준으로 맞추고, 세부 업무는 합쳐요. 그다음부터 양쪽 같이 바뀌어요.'}</p>
  ${mode === 'new' ? actions(true, '디자인팀 보드에 보내기', 'ArrowUpRight', () => onSend(item, who)) : actions(!!pick, '이 업무에 잇기', 'Link2', () => onLink(item, pick))}
 </div>`;
}
