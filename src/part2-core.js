/* ===== Pocket Sync board — runtime (Preact + htm, Claude artifact db) ===== */
const {h, render, Fragment} = preact;
const {useState, useEffect, useRef, useMemo, useCallback} = preactHooks;
const html = htm.bind(h);

/* ---------- Icons (lucide node data, inlined) ---------- */
function Icon({name, size = 16, class: cls = '', ...rest}) {
 const nodes = ICONS[name] || [];
 return html`<svg xmlns="http://www.w3.org/2000/svg" width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class=${'lucide ' + cls} aria-hidden="true" focusable="false" ...${rest}>${nodes.map(([tag, attrs], i) => h(tag, {...attrs, key: i}))}</svg>`;
}
const I = (name, size, extra) => html`<${Icon} name=${name} size=${size} ...${extra || {}} />`;

/* ---------- Board model (port of lib/board-types.ts + lib/board-model.ts) ---------- */
const SEATS = [{key: 'lhs', name: '이현성'}, {key: 'kjs', name: '권중선'}];
const team = SEATS.map(s => ({name: s.name}));
const moods = [
 {value: 'sad', icon: 'CloudRain', label: '슬픔'},
 {value: 'normal', icon: 'Smile', label: '정상'},
 {value: 'help', icon: 'LifeBuoy', label: '도와줘'},
 {value: 'great', icon: 'Flame', label: '아주좋아 빠이팅'}
];
/* Daily check-in: how much work (fact + self-rating) -> how I feel -> what I'd like from you. */
const LOADS = {light: '여유', ok: '적당', many: '많음', limit: '한계'};
const LOAD_LONG = {light: '여유 있어요', ok: '적당해요', many: '많아요', limit: '한계예요'};
const MOODS = {great: '좋아요', normal: '괜찮아요', tired: '지쳐요', sad: '힘들어요'};
const MOOD_ICONS = {great: 'Flame', normal: 'Smile', tired: 'BatteryLow', sad: 'CloudRain'};
const ASKS = {none: '특별히 없어요', know: '그냥 알아줘요', cheer: '응원해줘요', space: '여유를 줘요', help: '도와줘요'};
const ASK_ICONS = {none: 'Check', know: 'Eye', cheer: 'Sparkles', space: 'Coffee', help: 'HeartHandshake'};
const REACTIONS = {seen: '알겠어요', cheer: '응원해요', help: '도와줄게요'};
const REACTION_ICONS = {seen: 'Eye', cheer: 'Sparkles', help: 'HeartHandshake'};
const migrateMood = (mood, ask) => mood === 'help' ? {mood: 'tired', ask: ask && ASKS[ask] ? ask : 'help'} : {mood: MOODS[mood] ? mood : '', ask: ASKS[ask] ? ask : 'none'};
function suggestLoad(f) { const score = f.busyMin / 60 + f.open * 0.5 + f.joint * 0.25 + f.dueToday + f.overdue * 1.5 + (f.allDay ? 2 : 0); return score >= 7 ? 'limit' : score >= 4 ? 'many' : score >= 1.5 ? 'ok' : 'light'; }
function factsLine(f) { const parts = [`일정 ${f.events}`]; if (f.allDay) parts.push('종일 일정'); else if (f.busyMin) parts.push(`바쁜 ${durationLabel(f.busyMin)}`); parts.push(`업무 ${f.open}${f.joint ? `(+함께 ${f.joint})` : ''}`); if (f.dueToday) parts.push(`오늘 마감 ${f.dueToday}`); if (f.overdue) parts.push(`지연 ${f.overdue}`); return parts.join(' · '); }
const priorities = {share: '그냥 공유', urgent: '급함', critical: '아주급함'};
const taskPriorities = {share: '보통', urgent: '급함', critical: '아주급함'};
const priorityLabel = item => item.kind === 'task' ? (taskPriorities[item.priority] || '') : item.kind === 'daily' ? (item.ack ? (item.priority === 'share' ? '확인 요청' : priorities[item.priority]) : '') : '';
const KIND_HINTS = {event: '시간이 정해진 약속이면 일정. 두 사람의 하루에 나란히 놓여요.', daily: '상대에게 전하는 말이면 전할 말. 사정, 부탁, 오늘 있었던 일 같은 것들이에요. 꼭 읽어야 하면 확인 요청을 켜요.', task: '끝까지 챙겨야 할 일이면 업무. 상태·담당·마감일을 두고 보드에서 옮겨요. 전할 말이 일이 되면 종류를 업무로 바꾸면 돼요.'};
const statuses = {todo: '예정', doing: '진행 중', hold: '잠시 보류', done: '완료'};
const memberOptions = {'함께': '함께', '이현성': '이현성', '권중선': '권중선'};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const KINDS = {event: '일정', daily: '전할 말', task: '업무'};
const ACK_MODES = {none: '확인 필요 없음', share: '확인 요청', urgent: '급함', critical: '아주급함'};
const COLLAB = {requested: '협업 요청', accepted: '협업 수락', declined: '협업 어려움'};
const REPLY_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const PRESENCE = {focus: '집중 중', away: '회의·외근', free: '연락 편해요', deadline: '마감 중'};
const PRESENCE_ICONS = {focus: 'EyeOff', away: 'CalendarClock', free: 'MessagesSquare', deadline: 'Flag'};
const PRESENCE_HOURS = 3;
// Seoul wall-clock 'YYYY-MM-DDTHH:MM' for now (+ minutes), used by reply-by times and presence expiry.
function seoulStamp(addMin = 0) { const d = new Date(Date.now() + addMin * 60000); const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(d).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; }
function replyLabel(v) { if (!REPLY_RE.test(v || '')) return ''; const [d, t] = v.split('T'); return d === today() ? `오늘 ${t}` : d === offsetDate(today(), 1) ? `내일 ${t}` : `${shortDate(d)} ${t}`; }
function progressFields(item, v) { const p = Math.max(0, Math.min(100, Math.round(Number(v) || 0))); return {progress: p, ...(p === 100 && item.status !== 'done' ? {status: 'done'} : p < 100 && item.status === 'done' ? {status: 'doing'} : p > 0 && item.status === 'todo' ? {status: 'doing'} : {})}; }
function dDay(due) { if (!due) return {label: '마감 없음', cls: 'none', n: null}; const n = Math.round((Date.parse(due + 'T00:00:00+09:00') - Date.parse(today() + 'T00:00:00+09:00')) / 864e5); return n < 0 ? {label: `D+${-n}`, cls: 'late', n} : n === 0 ? {label: 'D-day', cls: 'today', n} : {label: `D-${n}`, cls: n <= 3 ? 'soon' : '', n}; }
// 업무 안의 세부 업무 목록. 진행률은 체크한 비율로 자동 계산된다.
// 세부 업무마다 진행률(pct)을 가진다. 체크 = 100%, 업무 진행률 = 세부 업무 진행률의 평균.
function normChecklist(v) { return (Array.isArray(v) ? v : []).filter(c => c && String(c.text || '').trim()).slice(0, 60).map((c, i) => { const pct = c.done ? 100 : Math.max(0, Math.min(100, Math.round(Number(c.pct) || 0))); return {id: String(c.id || 'c' + i).slice(0, 40), text: String(c.text).trim().slice(0, 200), pct, done: pct === 100}; }); }
function checkStat(item) { const l = (item && item.checklist) || []; const done = l.filter(c => c.done).length; return {total: l.length, done, pct: l.length ? Math.round(l.reduce((a, c) => a + (c.pct || 0), 0) / l.length) : 0}; }
const newCheckId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// 설명의 여러 줄을 세부 업무로: 글머리표·번호·체크 표시를 떼어 낸다.
function bodyToChecks(body) { return String(body || '').split(/\n+/).map(l => l.replace(/^\s*(?:[-*•·▪◦]|\d+[.)]|\[[ xX]?\])\s*/, '').trim()).filter(Boolean).slice(0, 60); }
const doneAt = t => t.done_at || t.updated_at || '';
const ARCHIVE_DAYS = 7;
const isArchived = t => t.kind === 'task' && t.status === 'done' && doneAt(t) && (Date.now() - Date.parse(doneAt(t))) > ARCHIVE_DAYS * 864e5;
const ackMode = item => item.kind !== 'daily' || !item.ack ? 'none' : (item.priority === 'share' ? 'share' : item.priority);
const fromAckMode = mode => mode === 'none' ? {ack: false, priority: 'share'} : {ack: true, priority: mode};
const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const fromMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function eventSpan(item) { if (!item.start) return null; const s = toMin(item.start); const e = item.end ? toMin(item.end) : Math.min(s + 60, 1439); return [s, Math.max(e, s + 15)]; }
function timeRangeLabel(item) { return item.start ? `${item.start}${item.end ? '–' + item.end : ''}` : '종일'; }
function durationLabel(min) { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h}시간 ${m}분` : h ? `${h}시간` : `${m}분`; }
const isMasked = (item, meId) => item.kind === 'event' && item.category === 'personal' && item.author_id !== meId;
const displayTitle = (item, meId) => isMasked(item, meId) ? '개인 일정' : item.title;
const authorLabel = item => item.demo ? '샘플' : personName(item.author_name);

function personName(value) {
 const aliases = {'현성 이': '이현성', '부대표': '이현성', 'pocket.lhs': '이현성', 'lhs': '이현성', '중선 권': '권중선', '개발이사': '권중선', 'kjs': '권중선'};
 return aliases[value] || value || '';
}
const seoulDate = d => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'}).format(d);
function today() { return seoulDate(new Date()); }
function offsetDate(date, n) { const d = new Date(date + 'T12:00:00+09:00'); d.setDate(d.getDate() + n); return seoulDate(d); }
function inSeoul(iso) { const d = new Date(iso); return isNaN(d) ? '' : seoulDate(d); }
function timeLabel(iso) {
 if (!iso) return '';
 const d = new Date(iso); if (isNaN(d)) return '';
 return new Intl.DateTimeFormat('ko-KR', {timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(d);
}
function fullTime(iso) { const d = new Date(iso); if (isNaN(d)) return ''; return d.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}) + ' (한국 시간)'; }
function safeLink(value) { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : '#'; } catch { return '#'; } }
function isHttpUrl(value) { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol); } catch { return false; } }
function linkName(link) { if (link.label) return link.label; try { return new URL(link.url).hostname; } catch { return link.url; } }
function lastActivity(item, comments) { return comments.filter(c => c.item_id === item.id).reduce((latest, c) => c.created_at > latest ? c.created_at : latest, item.updated_at); }
function collectLinks(item, comments) {
 const rootLinks = (item.links || []).map((l, index) => ({...l, key: `${item.id}:root:${l.id || index}`, item_id: item.id, item_title: item.title, context: item.body || item.title, source: 'item', author: l.shared_by ? personName(l.shared_by) : personName(item.author_name), at: l.shared_at || item.created_at, exactTime: !!l.shared_at}));
 const updates = comments.filter(c => c.item_id === item.id).flatMap(c => (c.links || []).map((l, index) => ({...l, key: `${c.id}:${index}`, item_id: item.id, item_title: item.title, context: c.body || '업데이트에 첨부한 링크', source: 'comment', comment_id: c.id, author: personName(c.author_name), at: c.created_at, exactTime: true})));
 return [...rootLinks, ...updates].sort((a, b) => b.at.localeCompare(a.at));
}
// Existing link attribution stays fixed when the other person edits an item.
function stampLinks(incoming, previous, actor, at) {
 return incoming.map(l => {
  const old = previous.find(p => (l.id ? p.id === l.id : true) && p.url === l.url);
  if (old) return {...old, label: l.label, url: l.url};
  return {id: uuid(), label: l.label, url: l.url, shared_at: at, shared_by: actor.name, shared_by_id: actor.id};
 });
}
const isDated = item => item.kind === 'daily' || item.kind === 'event';
function matchesDate(item, comments, day, dailyOnly = false) {
 if (day === 'all') return true;
 if (dailyOnly) return item.day === day;
 if (isDated(item) && item.day === day) return true;
 if (!isDated(item) && (inSeoul(item.created_at) === day || inSeoul(item.updated_at) === day)) return true;
 return (item.kind === 'task' && item.due === day) || comments.some(c => c.item_id === item.id && inSeoul(c.created_at) === day);
}
function topicKey(value) { return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR'); }
function isMyTask(item, name) {
 const people = (item.assignee || '').split(/[,/·、]/).map(p => personName(p.trim()));
 return item.kind === 'task' && (people.includes('함께') || people.includes(personName(name)));
}
function isMyRequest(item, userId, name) { return item.kind === 'task' && item.author_id === userId && personName(item.assignee) !== personName(name); }
function sharedInWeek(item, comments, start, end) {
 const within = day => day >= start && day <= end;
 const recorded = isDated(item) ? item.day : inSeoul(item.created_at);
 return within(recorded) || (!isDated(item) && within(inSeoul(item.updated_at))) || comments.some(c => c.item_id === item.id && within(inSeoul(c.created_at)));
}
function mondayOf(day) { const weekday = new Date(day + 'T12:00:00Z').getUTCDay(); return offsetDate(day, -((weekday + 6) % 7)); }
function dayLabel(date) { return new Date(date + 'T12:00:00+09:00').toLocaleDateString('ko-KR', {timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'long'}); }
function shortDate(date) { return date ? `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}` : '마감 미정'; }
function uuid() {
 if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
 const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
 const s = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
 return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
const nowIso = () => new Date().toISOString();
const cx = (...a) => a.filter(Boolean).join(' ');
// Korean particle helper: 으로/로 by the final consonant of the word.
function ro(word) { const w = String(word || ''); const code = w.charCodeAt(w.length - 1) - 0xAC00; if (!w || code < 0 || code > 11171) return w + '로'; const jong = code % 28; return w + (jong === 0 || jong === 8 ? '로' : '으로'); }

/* Row normalisation: documents may come back with missing fields. */
function normItem(d) {
 return {id: d.id, kind: KINDS[d.kind] ? d.kind : 'daily', ack: d.kind === 'notice' ? true : (d.kind === 'daily' || !KINDS[d.kind]) ? !!d.ack : false, start: TIME_RE.test(d.start || '') ? d.start : '', end: TIME_RE.test(d.end || '') ? d.end : '', title: String(d.title || ''), body: String(d.body || ''), topic_id: String(d.topic_id || ''), category: d.category === 'personal' ? 'personal' : 'work', priority: priorities[d.priority] ? d.priority : 'share', status: statuses[d.status] ? d.status : 'todo', day: String(d.day || ''), due: String(d.due || ''), assignee: String(d.assignee || '함께'), links: Array.isArray(d.links) ? d.links.filter(l => l && typeof l.url === 'string').map(l => ({...l, label: String(l.label || '')})) : [], author_id: String(d.author_id || ''), author_name: String(d.author_name || ''), created_at: String(d.created_at || ''), updated_at: String(d.updated_at || d.created_at || ''), updated_by: String(d.updated_by || ''), updated_by_name: String(d.updated_by_name || ''), last_change: String(d.last_change || ''), done_at: String(d.done_at || ''), pinned: !!d.pinned, pinned_by: String(d.pinned_by || ''), pinned_at: String(d.pinned_at || ''), reply_by: REPLY_RE.test(d.reply_by || '') ? d.reply_by : '', prio_no: Math.max(0, Math.min(99, Math.round(Number(d.prio_no) || 0))), req: ['pending', 'accepted', 'declined'].includes(d.req) ? d.req : '', req_reply: String(d.req_reply || ''), req_at: String(d.req_at || ''), ref_id: String(d.ref_id || ''), progress: Math.max(0, Math.min(100, Math.round(Number(d.progress) || 0))), collab: COLLAB[d.collab] ? d.collab : '', collab_note: String(d.collab_note || ''), collab_by: String(d.collab_by || ''), collab_at: String(d.collab_at || ''), collab_reply: String(d.collab_reply || ''), collab_reply_at: String(d.collab_reply_at || ''), checklist: normChecklist(d.checklist), demo: d.demo ? 1 : 0};
}
function normComment(d) { return {id: d.id, item_id: String(d.item_id || ''), author_id: String(d.author_id || ''), author_name: String(d.author_name || ''), body: String(d.body || ''), links: Array.isArray(d.links) ? d.links.filter(l => l && typeof l.url === 'string').map(l => ({...l, label: String(l.label || '')})) : [], created_at: String(d.created_at || '')}; }
function normTopic(d) { return {id: d.id, name: String(d.name || ''), name_key: String(d.name_key || topicKey(String(d.name || ''))), sort_order: Number(d.sort_order) || 0, created_at: String(d.created_at || '')}; }
function normAck(d) { return {item_id: String(d.item_id || ''), user_id: String(d.user_id || ''), name: String(d.name || ''), created_at: String(d.created_at || '')}; }
function normProfile(d) { const m = migrateMood(d.mood, d.ask); return {id: d.id, name: String(d.name || ''), mood: m.mood, ask: m.ask, load: LOADS[d.load] ? d.load : '', day: String(d.day || ''), message: String(d.message || ''), updated_at: String(d.updated_at || '')}; }
function normCheckin(d) { const m = migrateMood(d.mood, d.ask); return {id: d.id, seat: String(d.seat || String(d.id).split('__')[0]), name: String(d.name || ''), day: String(d.day || ''), load: LOADS[d.load] ? d.load : '', mood: m.mood, ask: m.ask, message: String(d.message || ''), updated_at: String(d.updated_at || '')}; }
function normReaction(d) { return {id: d.id, to: String(d.to || ''), by: String(d.by || ''), by_name: String(d.by_name || ''), kind: REACTIONS[d.kind] ? d.kind : 'seen', at: String(d.at || ''), for: String(d.for || ''), note: String(d.note || '').slice(0, 200)}; }
function normDaynote(d) { return {id: d.id, seat: String(d.seat || ''), day: String(d.day || ''), author_id: String(d.author_id || ''), author_name: String(d.author_name || ''), body: String(d.body || ''), created_at: String(d.created_at || '')}; }
function normPresence(d) { return {id: d.id, state: PRESENCE[d.state] ? d.state : '', at: String(d.at || ''), until: String(d.until || '')}; }
function normSeen(d) { return {id: d.id, at: String(d.at || ''), items: d.items && typeof d.items === 'object' ? d.items : {}}; }
const presenceOn = p => !!(p && p.state && p.until && p.until > seoulStamp());
function normMember(d) { return {id: d.id, name: String(d.name || ''), user_id: String(d.user_id || ''), claimed_at: String(d.claimed_at || '')}; }

/* Validation (port of the zod schema in app/api/board/route.ts) */
const INPUT_ERROR = '제목, 날짜와 링크를 다시 확인해 주세요.';
function validateLinks(links) {
 if (!Array.isArray(links) || links.length > 8) throw new Error(INPUT_ERROR);
 return links.map(l => {
  const label = String(l.label || '').trim(), url = String(l.url || '').trim();
  if (label.length > 80 || url.length > 2000 || !isHttpUrl(url)) throw new Error(INPUT_ERROR);
  return {id: l.id, label, url};
 });
}
function validateItem(draft) {
 const kind = draft.kind === 'notice' ? 'daily' : draft.kind; if (!KINDS[kind]) throw new Error(INPUT_ERROR);
 const title = String(draft.title || '').trim(); if (!title || title.length > 150) throw new Error(INPUT_ERROR);
 const body = String(draft.body || '').trim(); if (body.length > 6000) throw new Error(INPUT_ERROR);
 const category = draft.category === 'personal' ? 'personal' : 'work';
 const priority = priorities[draft.priority] ? draft.priority : 'share';
 const ack = kind === 'daily' ? (!!draft.ack || draft.kind === 'notice' || priority !== 'share') : false;
 const status = statuses[draft.status] ? draft.status : 'todo';
 const day = draft.day || today(); if (!DATE_RE.test(day)) throw new Error(INPUT_ERROR);
 const due = draft.due || ''; if (due && !DATE_RE.test(due)) throw new Error(INPUT_ERROR);
 const assignee = String(draft.assignee || '함께').trim().slice(0, 60) || '함께';
 let start = '', end = '';
 if (kind === 'event') {
  start = String(draft.start || ''); end = String(draft.end || '');
  if ((start && !TIME_RE.test(start)) || (end && !TIME_RE.test(end))) throw new Error('시간을 다시 확인해 주세요.');
  if (!start) end = '';
  else if (!end) end = fromMin(Math.min(toMin(start) + 60, 1439));
  else if (toMin(end) <= toMin(start)) throw new Error('끝나는 시간을 시작 시간보다 뒤로 맞춰 주세요.');
 }
 const reply_by = kind === 'daily' && ack && REPLY_RE.test(draft.reply_by || '') ? draft.reply_by : '';
 const collab = (kind === 'event' || kind === 'task') && COLLAB[draft.collab] ? draft.collab : '';
 const progress = kind === 'task' ? Math.max(0, Math.min(100, Math.round(Number(draft.progress) || 0))) : 0;
 const cx2 = collab ? {collab_note: String(draft.collab_note || '').trim().slice(0, 300), collab_by: String(draft.collab_by || ''), collab_at: String(draft.collab_at || ''), collab_reply: String(draft.collab_reply || '').trim().slice(0, 300), collab_reply_at: String(draft.collab_reply_at || '')} : {collab_note: '', collab_by: '', collab_at: '', collab_reply: '', collab_reply_at: ''};
 return {kind, title, body, category, priority, ack, status, day, due, assignee, start, end, links: validateLinks(draft.links || []), topic_id: String(draft.topic_id || ''), pinned: !!draft.pinned, reply_by, progress, ref_id: String(draft.ref_id || '').slice(0, 80), prio_no: kind === 'task' ? Math.max(0, Math.min(99, Math.round(Number(draft.prio_no) || 0))) : 0, req: kind === 'task' && ['pending', 'accepted', 'declined'].includes(draft.req) ? draft.req : '', req_reply: kind === 'task' ? String(draft.req_reply || '').trim().slice(0, 300) : '', req_at: kind === 'task' ? String(draft.req_at || '') : '', checklist: kind === 'task' ? normChecklist(draft.checklist) : [], collab, ...cx2};
}
function friendlyError(e) {
 const code = e && e.code;
 if (code === 'permission-denied') return '저장할 권한이 없어요. 허용된 구글 계정으로 로그인했는지 확인해 주세요.';
 if (code === 'unauthenticated') return '로그인이 풀렸어요. 페이지를 새로 고친 뒤 다시 로그인해 주세요.';
 if (code === 'invalid_argument') return '저장할 권한이 없거나 입력을 확인해야 해요. 공유 설정에서 참여자(Contributor) 이상인지 확인해 주세요.';
 if (code === 'quota_exceeded') return '저장 공간이 가득 찼어요. 예시나 오래된 항목을 정리한 뒤 다시 시도해 주세요.';
 if (code === 'resource_exhausted') return '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.';
 if (code === 'unavailable') return '연결이 잠시 불안정해요. 입력 내용은 그대로 두었으니 다시 시도해 주세요.';
 if (code === 'revoked' || code === 'not_granted') return '보드에 접근할 수 없게 되었어요. 페이지를 새로 고쳐 주세요.';
 return (e && e.message) || '저장하지 못했어요. 다시 시도해 주세요.';
}

/* ---------- Toasts (stand-in for sonner) ---------- */
const toastBus = {list: [], subs: new Set(), seq: 0,
 emit() { for (const fn of this.subs) fn([...this.list]); },
 push(type, title, opts = {}) {
  const id = ++this.seq; const t = {id, type, title, description: opts.description, action: opts.action};
  this.list = [...this.list.slice(-4), t]; this.emit();
  setTimeout(() => this.dismiss(id), opts.duration || (type === 'error' ? 6500 : 4200)); return id;
 },
 dismiss(id) { if (!this.list.some(t => t.id === id)) return; this.list = this.list.filter(t => t.id !== id); this.emit(); }
};
const toast = {
 success: (m, o) => toastBus.push('success', m, o),
 error: (m, o) => toastBus.push('error', m, o),
 warning: (m, o) => toastBus.push('warning', m, o),
 info: (m, o) => toastBus.push('info', m, o)
};
function Toaster() {
 const [list, setList] = useState([]);
 useEffect(() => { const fn = l => setList(l); toastBus.subs.add(fn); return () => toastBus.subs.delete(fn); }, []);
 if (!list.length) return null;
 return html`<div class="toaster" role="status" aria-live="polite">${list.map(t => html`<div class=${'toast ' + t.type} key=${t.id}><div><strong>${t.title}</strong>${t.description && html`<p>${t.description}</p>`}</div>${t.action && html`<button type="button" onClick=${() => { t.action.onClick(); toastBus.dismiss(t.id); }}>${t.action.label}</button>`}<button type="button" class="toast-x" aria-label="알림 닫기" onClick=${() => toastBus.dismiss(t.id)}>${I('X', 14)}</button></div>`)}</div>`;
}

/* ---------- UI primitives replacing shadcn/Radix ---------- */
const escStack = [];
window.addEventListener('keydown', e => { if (e.key === 'Escape' && escStack.length) { e.preventDefault(); escStack[escStack.length - 1].current(); } });
function useEscape(active, onClose) {
 const ref = useRef(onClose); ref.current = onClose;
 useEffect(() => { if (!active) return; escStack.push(ref); return () => { const i = escStack.indexOf(ref); if (i >= 0) escStack.splice(i, 1); }; }, [active]);
}
function focusOnMount(el) { if (el && !el.__focused) { el.__focused = true; setTimeout(() => { try { el.focus(); } catch {} }, 40); } }
let lockCount = 0;
function useLockBody(active) {
 useEffect(() => { if (!active) return; lockCount++; document.body.classList.add('locked'); return () => { lockCount--; if (lockCount <= 0) { lockCount = 0; document.body.classList.remove('locked'); } }; }, [active]);
}
function Dialog({onClose, class: cls = '', title, description, children, alert = false, hideClose = false, canClose = true}) {
 const close = useCallback(() => { if (canClose) onClose(); }, [canClose, onClose]);
 useEscape(true, close); useLockBody(true);
 const slot = alert ? 'alert-dialog' : 'dialog';
 return html`<div class="layer"><div class="overlay" onClick=${close}></div><div class=${cx('dialog', alert && 'alert-dialog', cls)} role=${alert ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby=${slot + '-title'}><div data-slot=${slot + '-header'}><h2 data-slot=${slot + '-title'} id=${slot + '-title'}>${title}</h2>${description && html`<p data-slot=${slot + '-description'}>${description}</p>`}</div>${children}${!hideClose && html`<button type="button" class="dialog-close" aria-label="닫기" onClick=${close}>${I('X', 17)}</button>`}</div></div>`;
}
function Sheet({onClose, class: cls = '', header, children}) {
 useEscape(true, onClose); useLockBody(true);
 return html`<div class="layer"><div class="overlay" onClick=${onClose}></div><aside class=${cx('sheet', cls)} role="dialog" aria-modal="true" aria-label="상세 보기">${header}<button type="button" class="sheet-close" aria-label="상세 닫기" onClick=${onClose}>${I('X', 18)}</button>${children}</aside></div>`;
}
function TabsList({class: cls = '', value, onChange, tabs, label}) {
 return html`<div class=${cx('tabs-list', cls)} role="tablist" aria-label=${label}>${tabs.map(t => html`<button type="button" role="tab" key=${t.value} data-state=${value === t.value ? 'active' : 'inactive'} aria-selected=${value === t.value} onClick=${() => onChange(t.value)}>${t.content}</button>`)}</div>`;
}
function ToggleGroup({class: cls = '', value, onChange, items, label}) {
 return html`<div class=${cx('toggle-group', cls)} role="group" aria-label=${label}>${items.map(i => html`<button type="button" key=${i.value} data-slot="toggle-group-item" data-state=${value === i.value ? 'on' : 'off'} aria-pressed=${value === i.value} class=${i.class || ''} title=${i.title} aria-label=${i.ariaLabel} onClick=${() => onChange(i.value)}>${i.content}</button>`)}</div>`;
}
function Choice({value, onChange, options, label, disabled = false, class: cls = '', id}) {
 return html`<select id=${id} class=${cx('choice', cls)} aria-label=${label} disabled=${disabled} value=${value} onChange=${e => onChange(e.target.value)}>${Object.entries(options).map(([key, text]) => html`<option key=${key} value=${key}>${text}</option>`)}</select>`;
}
function Empty({text, action, onClick}) { return html`<div class="empty-state">${I('FolderOpen', 25)}<p>${text}</p>${action && html`<button type="button" class="text-button" onClick=${onClick}>${action}${I('Plus', 15)}</button>`}</div>`; }
function Stamp({at, prefix = ''}) { return html`<time dateTime=${at} title=${fullTime(at)}>${prefix}${timeLabel(at)}</time>`; }
function nextFriday() { const d = today(), weekday = new Date(d + 'T12:00:00Z').getUTCDay(); return offsetDate(d, (5 - weekday + 7) % 7); }
function Due({due, done = false, onClick}) {
 const overdue = !!due && due < today() && !done;
 const content = html`${I('CalendarDays', 14)}${due === today() ? '오늘' : shortDate(due)}${overdue ? ' 지남' : ''}`;
 return onClick ? html`<button type="button" class=${cx('due', 'field-chip', overdue && 'overdue')} title="마감일 바꾸기" onClick=${onClick}>${content}</button>` : html`<span class=${cx('due', overdue && 'overdue')}>${content}</span>`;
}
function PriorityTag({item, onClick}) {
 const label = priorityLabel(item); if (!label) return null;
 const cls = 'tag ' + (item.kind === 'daily' ? (item.priority === 'share' ? 'ask' : item.priority) : (item.priority === 'share' ? 'normal' : item.priority));
 return onClick ? html`<button type="button" class=${cls + ' field-chip tag-edit'} title="중요도 바꾸기" onClick=${onClick}>${label}</button>` : html`<span class=${cls}>${label}</span>`;
}
function TopicBadge({name, onClick}) {
 const none = name === '미분류';
 if (onClick && none) return html`<button type="button" class="topic-badge field-chip unassigned" title="아직 카테고리가 없어요. 눌러서 카테고리를 정해 주세요." onClick=${onClick}>${I('FolderOpen', 12)}분류하기</button>`;
 return onClick ? html`<button type="button" class="topic-badge field-chip" title="카테고리 바꾸기" onClick=${onClick}>${name}</button>` : html`<span class="topic-badge">${name}</span>`;
}
function Assignee({name, onClick, label = '담당'}) {
 return onClick ? html`<button type="button" class="assignee field-chip" title=${label + ' 바꾸기'} onClick=${onClick}>${label} ${personName(name)}</button>` : html`<span class="assignee">${label} ${personName(name)}</span>`;
}
function KindIcon({item}) { const name = item.kind === 'event' ? 'CalendarClock' : item.kind === 'task' ? 'Layers3' : item.ack ? 'CheckCheck' : 'NotebookPen'; return html`<span class=${cx('kind-icon', item.kind, item.ack && 'ack', item.ack && item.priority)}>${I(name, 17)}</span>`; }
function Tag({item}) { return html`<span class=${'tag ' + (item.kind === 'task' ? item.status : item.kind)}>${item.kind === 'task' ? statuses[item.status] : KINDS[item.kind]}</span>`; }
function MoodIcon({mood, size = 24}) { return MOOD_ICONS[mood] ? I(MOOD_ICONS[mood], size) : html`<span aria-hidden="true">—</span>`; }

function LinkFields({value, onChange, idPrefix = 'link'}) {
 return html`<div class="link-editor"><div class="form-label">관련 링크 <span>선택 · 최대 8개</span></div>${value.map((l, i) => html`<div class="link-fields" key=${l.id || i}><input id=${`${idPrefix}-label-${i}`} aria-label=${`링크 ${i + 1} 이름`} placeholder="이름 또는 공유 이유" value=${l.label} onInput=${e => onChange(value.map((x, j) => j === i ? {...x, label: e.target.value} : x))} maxLength="80" /><input id=${`${idPrefix}-url-${i}`} type="url" aria-label=${`링크 ${i + 1} 주소`} placeholder="https://" value=${l.url} required pattern="https?://.*" onInput=${e => onChange(value.map((x, j) => j === i ? {...x, url: e.target.value} : x))} /><button type="button" class="icon-button" aria-label=${`링크 ${i + 1} 삭제`} onClick=${() => onChange(value.filter((_, j) => j !== i))}>${I('X', 16)}</button></div>`)}${value.length < 8 && html`<button type="button" class="text-button" onClick=${() => onChange([...value, {label: '', url: ''}])}>${I('Plus', 15)}링크 추가</button>`}</div>`;
}
function LinkEntry({link, onContext, compact = false}) {
 return html`<div class=${cx('shared-link', compact && 'compact')}><a class="shared-link-title" href=${safeLink(link.url)} target="_blank" rel="noreferrer"><span class="link-icon">${I('Link2', 16)}</span><strong>${linkName(link)}</strong>${I('ArrowUpRight', 15)}</a><p class="link-context" title=${link.context}>${link.context}</p><div class="link-attribution"><span>${!link.exactTime ? '항목 작성 ' : ''}${link.author}</span><${Stamp} at=${link.at} prefix=${link.exactTime ? '' : '항목 생성 '} /></div>${!link.exactTime && !compact && html`<small class="legacy-note">이전 링크는 추가 시각이 기록되지 않아 항목 생성 시각을 표시합니다.</small>`}${onContext && html`<button type="button" class="context-button" onClick=${onContext}>${link.item_title}${I('ChevronRight', 13)}</button>`}</div>`;
}
function RecordRow({item, comments, busy, onOpen, onStatus, onEditField, topicName, canWrite, meId, showKind = false, fresh = false, confirmReq = null, onConfirm, replyTag = null}) {
 const masked = isMasked(item, meId), title = displayTitle(item, meId), body = masked ? '' : item.body, editable = canWrite && !masked;
 const links = masked ? [] : collectLinks(item, comments), updates = comments.filter(c => c.item_id === item.id), lastUpdate = updates[updates.length - 1];
 const extraLines = Math.max(0, body.split('\n').filter(x => x.trim()).length - 1);
 return html`<article class=${cx('record-row', item.status === 'done' && item.kind === 'task' && 'record-done')}><div class="record-main"><${KindIcon} item=${item} /><button type="button" class="record-summary" onClick=${() => onOpen(item.id)}><strong>${fresh && html`<i class="fresh-dot" title="새 소식"></i>`}${masked && I('Lock', 13)}${item.pinned && !masked && html`<span class="pin-mark" title="인사이트로 보관됨">${I('Pin', 13)}</span>`}${title}</strong>${body && html`<span>${body.split('\n')[0]}</span>`}</button>${extraLines > 0 && html`<button type="button" class="more-pill body-more" onClick=${() => onOpen(item.id)} aria-label=${`내용 ${extraLines}줄 더 보기`}>+${extraLines}</button>`}${item.kind === 'task' ? html`<${Choice} class=${'status-select ' + item.status} disabled=${busy || !canWrite} label=${`${item.title} 진행 상태`} value=${item.status} onChange=${v => onStatus(item, v)} options=${statuses} />` : item.kind === 'daily' && item.ack ? html`<span class="main-tags">${replyTag}<${PriorityTag} item=${item} onClick=${canWrite && onEditField ? e => onEditField('priority', item, e) : undefined} /></span>` : item.kind === 'event' ? html`<span class="tag event time-tag">${timeRangeLabel(item)}</span>` : null}<div class="record-author"><strong class=${item.demo ? 'is-sample' : ''}>${authorLabel(item)}</strong><${Stamp} at=${item.created_at} /></div><button type="button" class="icon-button row-open" aria-label=${`${title} 상세 보기`} onClick=${() => onOpen(item.id)}>${I('ChevronRight', 17)}</button></div>${confirmReq && html`<div class=${cx('confirm-strip', confirmReq.author_id !== meId && 'for-me', confirmReq.reply_by && confirmReq.reply_by < seoulStamp() && 'late')}><span class="tag confirm-tag">${I('CheckCheck', 12)}확인 요청 중${confirmReq.priority !== 'share' ? ' · ' + ACK_MODES[confirmReq.priority] : ''}</span><span class="confirm-strip-text">${confirmReq.body || ''}</span>${confirmReq.reply_by && html`<span class="confirm-strip-time">${I('Clock', 11)}${replyLabel(confirmReq.reply_by)}까지</span>`}${confirmReq.author_id !== meId ? (onConfirm && html`<button type="button" class="ack-button" disabled=${busy} onClick=${() => onConfirm(confirmReq)}>${I('CheckCheck', 14)}확인했어요</button>`) : html`<span class="confirm-strip-wait">상대 확인 기다리는 중</span>`}</div>`}<div class="record-bottom">${showKind && html`<span class=${'tag kind kind-' + item.kind}>${KINDS[item.kind]}</span>`}<${TopicBadge} name=${topicName} onClick=${editable && onEditField ? e => onEditField('topic', item, e) : undefined} />${item.kind === 'event' && html`<${Fragment}><span class="due">${I('CalendarDays', 14)}${item.day === today() ? '오늘' : shortDate(item.day)}</span><${Assignee} label="누구" name=${item.assignee} onClick=${editable && onEditField ? e => onEditField('assignee', item, e) : undefined} /><${CollabTag} item=${item} meId=${meId} /><//>`}${item.kind === 'task' && html`<${Fragment}><${PriorityTag} item=${item} onClick=${canWrite && onEditField ? e => onEditField('priority', item, e) : undefined} />${checkStat(item).total > 0 && html`<span class=${cx('check-chip', checkStat(item).done === checkStat(item).total && 'all')} title="세부 업무 목록">${I('ListChecks', 12)}세부 업무 ${checkStat(item).done}/${checkStat(item).total}</span>`}<${Due} due=${item.due} done=${item.status === 'done'} onClick=${canWrite && onEditField ? e => onEditField('due', item, e) : undefined} /><${Assignee} name=${item.assignee} onClick=${canWrite && onEditField ? e => onEditField('assignee', item, e) : undefined} />${item.progress > 0 && item.status !== 'done' && html`<button type="button" class="kc-progress row-progress" title="진행률 바꾸기" disabled=${!canWrite || !onEditField} onClick=${e => onEditField && onEditField('progress', item, e)}><span><i style=${`width:${item.progress}%`}></i></span><b>${item.progress}%</b></button>`}<${CollabTag} item=${item} meId=${meId} /><${ReqTag} item=${item} meId=${meId} /><//>`}${links.length > 0 && html`<div class="inline-links"><a href=${safeLink(links[0].url)} target="_blank" rel="noreferrer" title=${linkName(links[0])}>${I('Link2', 13)}${linkName(links[0])}${I('ArrowUpRight', 12)}</a>${links.length > 1 && html`<button type="button" class="more-pill" onClick=${() => onOpen(item.id, 'links')} aria-label=${`링크 ${links.length - 1}개 더 보기`}>+${links.length - 1}</button>`}</div>`}${updates.length > 0 && html`<button type="button" class="update-count" onClick=${() => onOpen(item.id)}>${I('MessageCircle', 13)}+${updates.length}</button>`}${lastUpdate && lastUpdate.created_at > item.updated_at ? html`<span class="edited-at">${personName(lastUpdate.author_name)} · <${Stamp} at=${lastUpdate.created_at} prefix="업데이트 " /></span>` : item.updated_at !== item.created_at && html`<span class="edited-at"><${Stamp} at=${item.updated_at} prefix="수정 " /></span>`}</div></article>`;
}
