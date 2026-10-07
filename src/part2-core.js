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
// 보드: A = 이현성·권중선, B = 이현성·정규진. 로그인 뒤 플랫폼이 PS_CONFIGURE로 현재 보드와 두 자리를 채운다.
const SEATS = [{key: 'lhs', name: '이현성'}, {key: 'kjs', name: '권중선'}];
const ADMIN_NAME = '이현성';
let BOARD = 'A';
window.PS_CONFIGURE = () => { if (Array.isArray(window.PS_SEATS) && window.PS_SEATS.length >= 2) SEATS.splice(0, SEATS.length, ...window.PS_SEATS); BOARD = window.PS_BOARD || 'A'; };
// 보드 전환 이름: 'A 보드 : 권중선' (좁은 화면은 'A 권중선').
const boardLabel = (b, names) => html`<b class="bt-key">${b}</b><span class="bt-suffix"> 보드 :</span> ${String((names || {})[b] || b).replace(/ 보드$/, '')}`;
const boardTitle = () => SEATS.map(s => s.name).join(' · ');
const moods = [
 {value: 'sad', icon: 'CloudRain', label: '슬픔'},
 {value: 'normal', icon: 'Smile', label: '정상'},
 {value: 'help', icon: 'LifeBuoy', label: '도와줘'},
 {value: 'great', icon: 'Flame', label: '아주좋아 빠이팅'}
];
/* Daily check-in: how much work (fact + self-rating) -> how I feel -> what I'd like from you. */
const LOADS = {light: '여유', ok: '적당', many: '많음', limit: '한계'};
const LOAD_LONG = {light: '여유 있어요', ok: '적당해요', many: '많아요', limit: '한계예요'};
const MOODS = {great: '좋아요', normal: '괜찮아요', trying: '노력 중', tired: '지쳐요', sad: '힘들어요'};
const MOOD_ICONS = {great: 'Flame', normal: 'Smile', trying: 'TrendingUp', tired: 'BatteryLow', sad: 'CloudRain'};
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
const statuses = {todo: '예정', doing: '진행 중', hold: '보류', done: '완료'};
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
function dDay(due) { if (!due) return {label: '마감 없음', cls: 'none', n: null}; const n = Math.round((Date.parse(due + 'T00:00:00+09:00') - Date.parse(today() + 'T00:00:00+09:00')) / 864e5); return n < 0 ? {label: `D+${-n}`, cls: 'late', n} : n === 0 ? {label: '오늘', cls: 'today', n} : {label: `D-${n}`, cls: n <= 3 ? 'soon' : '', n}; }
// 업무 안의 세부 업무 목록. 진행률은 체크한 비율로 자동 계산된다.
// 세부 업무마다 진행률(pct)을 가진다. 체크 = 100%, 업무 진행률 = 세부 업무 진행률의 평균.
function normChecklist(v) { return (Array.isArray(v) ? v : []).filter(c => c && String(c.text || '').trim()).slice(0, 60).map((c, i) => { const pct = c.done ? 100 : Math.max(0, Math.min(100, Math.round(Number(c.pct) || 0))); return {id: String(c.id || 'c' + i).slice(0, 40), text: String(c.text).trim().slice(0, 200), pct, done: pct === 100, ...(c.by ? {by: String(c.by).slice(0, 20)} : {}), ...(c.at ? {at: String(c.at).slice(0, 30)} : {})}; }); }
function checkStat(item) { const l = (item && item.checklist) || []; const done = l.filter(c => c.done).length; return {total: l.length, done, pct: l.length ? Math.round(l.reduce((a, c) => a + (c.pct || 0), 0) / l.length) : 0}; }
const newCheckId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// 설명의 여러 줄을 세부 업무로: 글머리표·번호·체크 표시를 떼어 낸다.
function bodyToChecks(body) { return String(body || '').split(/\n+/).map(l => l.replace(/^\s*(?:[-*•·▪◦]|\d+[.)]|\[[ xX]?\])\s*/, '').trim()).filter(Boolean).slice(0, 60); }
// 외부 공유 링크: 고른 카테고리의 업무만 따로 담은 보기 전용 데이터.
function shareToken() { const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', b = new Uint8Array(24); crypto.getRandomValues(b); return Array.from(b, x => abc[x % abc.length]).join(''); }
function strHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + str.length; }
function buildShareData(share, items, topics) {
 const want = new Set(share.topic_ids || []), all = !want.size, cutoff = offsetDate(today(), -14), rank = {critical: 2, urgent: 1, share: 0};
 const tasks = items.filter(i => i.kind === 'task' && !i.demo && i.req !== 'pending' && i.category !== 'personal' && (all || want.has(i.topic_id || '')) && (i.status !== 'done' || doneAt(i) >= cutoff))
  .map(t => ({id: t.id, title: t.title, assignee: personName(t.assignee), due: t.due || '', status: t.status, priority: t.priority, progress: t.progress || 0, topic_id: t.topic_id || '', prio_no: t.prio_no || 0, done_at: t.status === 'done' ? doneAt(t) : '', checklist: (t.checklist || []).map(c => ({text: c.text, pct: c.pct || 0, done: !!c.done}))}))
  .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || (a.status === 'done' ? b.done_at.localeCompare(a.done_at) : ((a.prio_no || 999) - (b.prio_no || 999)) || (a.due && b.due ? a.due.localeCompare(b.due) : a.due ? -1 : b.due ? 1 : 0) || (rank[b.priority] - rank[a.priority]) || a.title.localeCompare(b.title)));
 const names = new Map(topics.map(t => [t.id, t.name]));
 const topicIds = [...new Set(tasks.map(t => t.topic_id))];
 return {topics: topicIds.map(id => ({id, name: id ? (names.get(id) || '카테고리') : '미분류'})).sort((a, b) => topics.findIndex(t => t.id === a.id) - topics.findIndex(t => t.id === b.id)), tasks};
}
// 보드 전체 공유에 담는 컬렉션. 개인 일정은 제목·설명·링크를 지우고, 자리 정보의 계정 id는 뺀다.
const SHARE_PARTS = ['topics', 'items', 'comments', 'acks', 'profiles', 'members', 'checkins', 'reactions', 'presence', 'daynotes'];
function fullShareParts(data) {
 const out = {};
 for (const name of SHARE_PARTS) {
  let rows = (data[name] || []).map(r => name === 'items' && r.category === 'personal' ? {...r, title: '개인 일정', body: '', links: [], checklist: []} : name === 'members' ? {...r, user_id: ''} : r);
  if (JSON.stringify(rows).length > 900000) { rows = [...rows].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''))); while (rows.length && JSON.stringify(rows).length > 900000) rows.pop(); }
  out[name] = rows;
 }
 return out;
}
// 어느 보드에 보일지와 카테고리 저장 위치를 정한다. 이현성 혼자 업무·일정: A에서 만든 것은 두 보드 모두('all'),
// B에서 만든 것은 share_all을 켠 것만 두 보드. 나머지는 지금 보드. 카테고리는 home 보드는 topic_id, 다른 보드는 topic_map[보드].
function boardFields(cur, p, topicId, topics) {
 const lhsSolo = (p.kind === 'task' || p.kind === 'event') && personName(p.assignee) === ADMIN_NAME && p.req !== 'pending';
 const prevHome = (cur && cur.home) || BOARD;
 const shared = !lhsSolo && p.kind === 'task' && prevHome === BOARD && ((((topics || []).find(t => t.id === topicId) || {}).share_boards) || []).length > 0;
 const board = lhsSolo ? (prevHome === 'A' || p.share_all ? 'all' : prevHome) : shared ? 'all' : BOARD;
 const home = board === 'all' ? prevHome : board;
 const name = id => ((topics || []).find(t => t.id === id) || {}).name || '';
 const out = {board, home, share_all: !!p.share_all && home !== 'A', topic_home: undefined, topic_explicit: undefined, foreign: undefined, assignee_raw: undefined};
 if (home === BOARD) { out.topic_id = topicId || ''; out.topic_label = name(topicId); out.topic_map = (cur && cur.topic_map) || {}; }
 else { out.topic_id = (cur && cur.topic_home) || ''; out.topic_label = (cur && cur.topic_label) || ''; out.topic_map = {...((cur && cur.topic_map) || {}), [BOARD]: topicId || ''}; }
 return out;
}
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
 const aliases = {'현성 이': '이현성', '부대표': '이현성', 'pocket.lhs': '이현성', 'lhs': '이현성', '중선 권': '권중선', '개발이사': '권중선', 'kjs': '권중선', 'jgj': '정규진', '규진 정': '정규진', 'ksy': '강승연', 'aej': '안은지'};
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
 const plan_day = DATE_RE.test(d.plan_day || '') ? d.plan_day : '';
 const home = ['A', 'B', 'C'].includes(d.home) ? d.home : 'A', tmap = d.topic_map && typeof d.topic_map === 'object' ? d.topic_map : {};
 // 다른 보드에서 카테고리 공유로 넘어온 업무(이현성 혼자 업무 제외): 이 보드에서는 보기만. '함께'는 원래 보드의 두 사람으로 표시.
 const lhsSolo = (d.kind === 'task' || d.kind === 'event') && personName(d.assignee) === ADMIN_NAME && d.req !== 'pending';
 const foreign = home !== BOARD && !lhsSolo;
 const homePartner = {A: '권중선', B: '정규진', C: '디자인팀'}[home] || '';
 return {id: d.id, plan_day, foreign, assignee_raw: String(d.assignee || '함께'), board: String(d.board || 'A'), home, topic_home: String(d.topic_id || ''), topic_map: tmap, topic_label: String(d.topic_label || ''), topic_explicit: home === BOARD || Object.prototype.hasOwnProperty.call(tmap, BOARD), share_all: !!d.share_all, kind: KINDS[d.kind] ? d.kind : 'daily', ack: d.kind === 'notice' ? true : (d.kind === 'daily' || !KINDS[d.kind]) ? !!d.ack : false, start: TIME_RE.test(d.start || '') ? d.start : '', end: TIME_RE.test(d.end || '') ? d.end : '', title: String(d.title || ''), body: String(d.body || ''), topic_id: home === BOARD ? String(d.topic_id || '') : String(tmap[BOARD] || ''), category: d.category === 'personal' ? 'personal' : 'work', priority: priorities[d.priority] ? d.priority : 'share', status: statuses[d.status] ? d.status : 'todo', day: String(d.day || ''), due: String(d.due || ''), start_on: DATE_RE.test(d.start_on || '') ? d.start_on : '', assignee: foreign && String(d.assignee || '함께') === '함께' ? `${ADMIN_NAME}·${homePartner}` : String(d.assignee || '함께'), links: Array.isArray(d.links) ? d.links.filter(l => l && typeof l.url === 'string').map(l => ({...l, label: String(l.label || '')})) : [], author_id: String(d.author_id || ''), author_name: String(d.author_name || ''), created_at: String(d.created_at || ''), updated_at: String(d.updated_at || d.created_at || ''), updated_by: String(d.updated_by || ''), updated_by_name: String(d.updated_by_name || ''), last_change: String(d.last_change || ''), done_at: String(d.done_at || ''), pinned: !!d.pinned, pinned_by: String(d.pinned_by || ''), pinned_at: String(d.pinned_at || ''), reply_by: REPLY_RE.test(d.reply_by || '') ? d.reply_by : '', prio_no: Math.max(0, Math.min(99, Math.round(Number(d.prio_no) || 0))), req: ['pending', 'accepted', 'declined'].includes(d.req) ? d.req : '', req_reply: String(d.req_reply || ''), req_at: String(d.req_at || ''), ref_id: String(d.ref_id || ''), progress: Math.max(0, Math.min(100, Math.round(Number(d.progress) || 0))), collab: COLLAB[d.collab] ? d.collab : '', collab_note: String(d.collab_note || ''), collab_by: String(d.collab_by || ''), collab_at: String(d.collab_at || ''), collab_reply: String(d.collab_reply || ''), collab_reply_at: String(d.collab_reply_at || ''), checklist: normChecklist(d.checklist), c_link: d.c_link && typeof d.c_link === 'object' && d.c_link.id ? {id: String(d.c_link.id), status: statuses[d.c_link.status] ? d.c_link.status : 'todo', progress: Math.max(0, Math.min(100, Math.round(Number(d.c_link.progress) || 0))), assignee: String(d.c_link.assignee || ''), due: DATE_RE.test(d.c_link.due || '') ? d.c_link.due : '', issue: String(d.c_link.issue || ''), at: String(d.c_link.at || '')} : null, c_sync: d.c_sync && typeof d.c_sync === 'object' ? {status: String(d.c_sync.status || ''), due: String(d.c_sync.due || ''), start_on: String(d.c_sync.start_on || ''), priority: String(d.c_sync.priority || ''), ck: String(d.c_sync.ck || ''), progress: Math.max(0, Math.min(100, Math.round(Number(d.c_sync.progress) || 0))), at: String(d.c_sync.at || '')} : null, demo: d.demo ? 1 : 0};
}
const normMarks = v => ({check: Array.isArray(v && v.check) ? v.check.map(String).slice(0, 10) : [], like: Array.isArray(v && v.like) ? v.like.map(String).slice(0, 10) : []});
function normComment(d) { return {id: d.id, marks: normMarks(d.marks), edited_at: String(d.edited_at || ''), item_id: String(d.item_id || ''), author_id: String(d.author_id || ''), author_name: String(d.author_name || ''), body: String(d.body || ''), links: Array.isArray(d.links) ? d.links.filter(l => l && typeof l.url === 'string').map(l => ({...l, label: String(l.label || '')})) : [], created_at: String(d.created_at || '')}; }
function normTopic(d) { return {id: d.id, share_boards: Array.isArray(d.share_boards) ? d.share_boards.filter(b => typeof b === 'string') : [], name: String(d.name || ''), name_key: String(d.name_key || topicKey(String(d.name || ''))), sort_order: Number(d.sort_order) || 0, created_at: String(d.created_at || '')}; }
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
 return {kind, title, body, category, priority, ack, status, day, due, assignee, start, end, links: validateLinks(draft.links || []), topic_id: String(draft.topic_id || ''), pinned: !!draft.pinned, reply_by, progress, ref_id: String(draft.ref_id || '').slice(0, 80), prio_no: kind === 'task' ? Math.max(0, Math.min(99, Math.round(Number(draft.prio_no) || 0))) : 0, req: kind === 'task' && ['pending', 'accepted', 'declined'].includes(draft.req) ? draft.req : '', req_reply: kind === 'task' ? String(draft.req_reply || '').trim().slice(0, 300) : '', req_at: kind === 'task' ? String(draft.req_at || '') : '', checklist: kind === 'task' ? normChecklist(draft.checklist) : [], share_all: !!draft.share_all, plan_day: kind === 'task' && DATE_RE.test(draft.plan_day || '') ? draft.plan_day : '', start_on: kind === 'task' && DATE_RE.test(draft.start_on || '') ? draft.start_on : '', collab, ...cx2};
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
// 앱 모양 드롭다운(기본 select 대신): 버튼을 누르면 아래(자리가 없으면 위)로 목록이 열리고, 위 · 아래 화살표 · Enter · Esc로도 고른다.
// options: [{value, label, meta?, pct?, group?, action?, blank?}] — group이 바뀌는 곳에 묶음 이름, action은 맨 아래에 줄을 나눠 따로(예: 직접 적기), blank는 골라도 버튼에 안내 문구를 둔다.
// grid: % 고르기처럼 칩 격자. size 'sm': 작은 버튼.
function Pick({value, options, onChange, label, placeholder = '고르기', disabled = false, class: cls = '', grid = false, size = ''}) {
 const [open, setOpen] = useState(false), [up, setUp] = useState(false), [right, setRight] = useState(false), [act, setAct] = useState(-1);
 const wrap = useRef(null), btn = useRef(null), list = useRef(null);
 const sel = options.find(o => !o.action && !o.blank && o.value === value);
 useEffect(() => { if (!open) return; const off = e => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); }; document.addEventListener('pointerdown', off); return () => document.removeEventListener('pointerdown', off); }, [open]);
 useEffect(() => { if (!open || act < 0 || !list.current) return; const el = list.current.querySelector(`[data-i="${act}"]`); if (el && el.scrollIntoView) el.scrollIntoView({block: 'nearest'}); }, [open, act]);
 // 목록은 버튼보다 좁아지지 않고 최소 260px. 오른쪽 자리가 모자라면 오른쪽 끝에 맞춘다.
 const show = () => { if (disabled || !btn.current) return; const r = btn.current.getBoundingClientRect(), below = window.innerHeight - r.bottom; setUp(below < 300 && r.top > below); setRight(r.left + Math.max(r.width, 260) > window.innerWidth - 12); setAct(Math.max(0, options.findIndex(o => !o.action && o.value === value))); setOpen(true); };
 const choose = o => { setOpen(false); if (btn.current) btn.current.focus(); if (o.action || o.value !== value) onChange(o.value); };
 const key = e => {
  if (!open) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); } return; }
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
  else if (e.key === 'ArrowDown' || (grid && e.key === 'ArrowRight')) { e.preventDefault(); setAct(i => Math.min(options.length - 1, i + 1)); }
  else if (e.key === 'ArrowUp' || (grid && e.key === 'ArrowLeft')) { e.preventDefault(); setAct(i => Math.max(0, i - 1)); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[act]) choose(options[act]); }
  else if (e.key === 'Tab') setOpen(false);
 };
 const has = v => v !== undefined && v !== null;
 const body = []; let group;
 options.forEach((o, i) => {
  if (o.action && !grid) body.push(html`<div class="pk-sep" key=${'s' + i}></div>`);
  else if (!grid && o.group !== group) { group = o.group; if (o.group) body.push(html`<div class="pk-group" key=${'g' + i}>${o.group}</div>`); }
  const on = !o.action && o.value === value;
  body.push(html`<button type="button" role="option" key=${'o' + i} data-i=${i} tabIndex="-1" aria-selected=${on} class=${cx('pk-opt', o.action && 'act', on && 'on', act === i && 'hl', has(o.pct) && o.pct >= 100 && 'full')} onMouseEnter=${() => setAct(i)} onClick=${() => choose(o)}>${grid ? o.label : html`<span class="pk-check">${on ? I('Check', 14) : o.action ? I('Plus', 14) : ''}</span><span class="pk-main"><span class="pk-label">${o.label}</span>${o.meta ? html`<span class="pk-meta">${o.meta}</span>` : ''}</span>${has(o.pct) ? html`<span class="pk-pct"><span class="pk-bar"><i style=${`width:${o.pct}%`}></i></span><b>${o.pct}%</b></span>` : ''}`}</button>`);
 });
 return html`<div class=${cx('pk', cls, size && 'pk-' + size, open && 'open')} ref=${wrap}>
  <button type="button" ref=${btn} class="pk-btn" aria-haspopup="listbox" aria-expanded=${open} aria-label=${label} disabled=${disabled} onClick=${() => (open ? setOpen(false) : show())} onKeyDown=${key}><span class="pk-val">${sel ? html`<span class="pk-label">${sel.label}</span>${sel.meta && !grid ? html`<span class="pk-meta">${sel.meta}</span>` : ''}` : html`<span class="pk-ph">${placeholder}</span>`}</span>${I('ChevronDown', 15)}</button>
  ${open && html`<div class=${cx('pk-pop', up && 'up', right && 'right', grid && 'grid')} role="listbox" aria-label=${label} ref=${list}>${body}</div>`}
 </div>`;
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
// C(디자인팀)로 보낸 A 업무: 디자인팀 진행 상황 표시.
// 디자인팀 보드와 연결된 업무 표시: 상태 · 마감 · 시작일 · 중요도 · 세부 업무 · 진행률은 C와 같이 바뀐다(이현성 화면에서 맞춤). 태그에는 디자인팀 담당을 보여준다.
function CLinkTag({item}) { const l = item && item.c_link; if (!l) return null; const who = l.assignee && l.assignee !== '미배정' ? l.assignee : ''; return html`<span class=${cx('tag clink-tag', l.status, l.issue && 'issue')} title=${`디자인팀 보드와 연결 · 담당 ${l.assignee || '미배정'}${l.issue ? ' · 특이사항 있음' : ''}\n상태 · 마감 · 시작일 · 중요도 · 세부 업무가 디자인팀 보드와 같이 바뀌어요`}>${I('Users', 12)}디자인팀${who ? ` · ${who}` : ''}${l.issue ? html`<b>!</b>` : ''}</span>`; }
function TopicBadge({name, onClick}) {
 const none = name === '미분류';
 if (onClick && none) return html`<button type="button" class="topic-badge field-chip unassigned" title="아직 카테고리가 없어요. 눌러서 카테고리를 정해 주세요." onClick=${onClick}>${I('FolderOpen', 12)}분류하기</button>`;
 return onClick ? html`<button type="button" class="topic-badge field-chip" title="카테고리 바꾸기" onClick=${onClick}>${name}</button>` : html`<span class="topic-badge">${name}</span>`;
}
function Assignee({name, onClick, label = '담당'}) {
 return onClick ? html`<button type="button" class="assignee field-chip" title=${label + ' 바꾸기'} onClick=${onClick}>${label} ${personName(name)}</button>` : html`<span class="assignee">${label} ${personName(name)}</span>`;
}
function KindIcon({item}) { const name = item.kind === 'event' ? 'CalendarClock' : item.kind === 'task' ? 'Layers3' : item.ack ? 'Check' : 'NotebookPen'; return html`<span class=${cx('kind-icon', item.kind, item.ack && 'ack', item.ack && item.priority)}>${I(name, 17)}</span>`; }
function Tag({item}) { return html`<span class=${'tag ' + (item.kind === 'task' ? item.status : item.kind)}>${item.kind === 'task' ? statuses[item.status] : KINDS[item.kind]}</span>`; }
function MoodIcon({mood, size = 24}) { return MOOD_ICONS[mood] ? I(MOOD_ICONS[mood], size) : html`<span aria-hidden="true">—</span>`; }

function LinkFields({value, onChange, idPrefix = 'link'}) {
 return html`<div class="link-editor"><div class="form-label">관련 링크 <span>선택 · 최대 8개</span></div>${value.map((l, i) => html`<div class="link-fields" key=${l.id || i}><input id=${`${idPrefix}-label-${i}`} aria-label=${`링크 ${i + 1} 이름`} placeholder="이름 또는 공유 이유" value=${l.label} onInput=${e => onChange(value.map((x, j) => j === i ? {...x, label: e.target.value} : x))} maxLength="80" /><input id=${`${idPrefix}-url-${i}`} type="url" aria-label=${`링크 ${i + 1} 주소`} placeholder="https://" value=${l.url} required pattern="https?://.*" onInput=${e => onChange(value.map((x, j) => j === i ? {...x, url: e.target.value} : x))} /><button type="button" class="icon-button" aria-label=${`링크 ${i + 1} 삭제`} onClick=${() => onChange(value.filter((_, j) => j !== i))}>${I('X', 16)}</button></div>`)}${value.length < 8 && html`<button type="button" class="text-button" onClick=${() => onChange([...value, {label: '', url: ''}])}>${I('Plus', 15)}링크 추가</button>`}</div>`;
}
function LinkEntry({link, onContext, compact = false}) {
 return html`<div class=${cx('shared-link', compact && 'compact')}><a class="shared-link-title" href=${safeLink(link.url)} target="_blank" rel="noreferrer"><span class="link-icon">${I('Link2', 16)}</span><strong>${linkName(link)}</strong>${I('ArrowUpRight', 15)}</a><p class="link-context" title=${link.context}>${link.context}</p><div class="link-attribution"><span>${!link.exactTime ? '항목 작성 ' : ''}${link.author}</span><${Stamp} at=${link.at} prefix=${link.exactTime ? '' : '항목 생성 '} /></div>${!link.exactTime && !compact && html`<small class="legacy-note">이전 링크는 추가 시각이 기록되지 않아 항목 생성 시각을 표시합니다.</small>`}${onContext && html`<button type="button" class="context-button" onClick=${onContext}>${link.item_title}${I('ChevronRight', 13)}</button>`}</div>`;
}
// 프로필 사진: 보드마다 avatars 컬렉션(이름 → 128px 이미지)을 받아 채운다. 사진이 없으면 이름 첫 글자.
const teamAvatars = {map: {}};
function PersonAv({name, mini = false, cls = ''}) { const n = String(name || ''), url = teamAvatars.map[n] || ''; return html`<span class=${cx('avatar', mini && 'mini', cls, url && 'has-img')}>${url ? html`<img src=${url} alt="" />` : n.slice(0, 1) || '?'}</span>`; }
function RecordRow({item, comments, busy, onOpen, onStatus, onEditField, topicName, canWrite, meId, showKind = false, fresh = false, confirmReq = null, onConfirm, replyTag = null, onChecklist = null}) {
 const [checksOpen, setChecksOpen] = useState(false);
 const masked = isMasked(item, meId), title = displayTitle(item, meId), body = masked ? '' : item.body, editable = canWrite && !masked;
 const links = masked ? [] : collectLinks(item, comments), updates = comments.filter(c => c.item_id === item.id), lastUpdate = updates[updates.length - 1];
 const extraLines = Math.max(0, body.split('\n').filter(x => x.trim()).length - 1);
 return html`<article class=${cx('record-row', item.status === 'done' && item.kind === 'task' && 'record-done')}><div class="record-main"><${KindIcon} item=${item} /><button type="button" class="record-summary" onClick=${() => onOpen(item.id)}><strong>${fresh && html`<i class="fresh-dot" title="새 소식"></i>`}${masked && I('Lock', 13)}${item.pinned && !masked && html`<span class="pin-mark" title="인사이트로 보관됨">${I('Pin', 13)}</span>`}${title}</strong>${body && html`<span>${body.split('\n')[0]}</span>`}</button>${item.c_link && html`<${CLinkTag} item=${item} />`}${extraLines > 0 && html`<button type="button" class="more-pill body-more" onClick=${() => onOpen(item.id)} aria-label=${`내용 ${extraLines}줄 더 보기`}>+${extraLines}</button>`}${item.kind === 'task' ? html`<span class="row-status"><${TeamStatusPick} x=${item} busy=${busy || !canWrite || !onStatus} onPatch=${(x, f) => onStatus(item, f.status)} /></span>` : item.kind === 'daily' && item.ack ? html`<span class="main-tags">${replyTag}<${PriorityTag} item=${item} onClick=${canWrite && onEditField ? e => onEditField('priority', item, e) : undefined} /></span>` : item.kind === 'event' ? html`<span class="tag event time-tag">${timeRangeLabel(item)}</span>` : null}<div class="record-author"><strong class=${item.demo ? 'is-sample' : ''}>${authorLabel(item)}</strong><${Stamp} at=${item.created_at} /></div><button type="button" class="icon-button row-open" aria-label=${`${title} 상세 보기`} onClick=${() => onOpen(item.id)}>${I('ChevronRight', 17)}</button></div>${confirmReq && html`<div class=${cx('confirm-strip', confirmReq.author_id !== meId && 'for-me', confirmReq.reply_by && confirmReq.reply_by < seoulStamp() && 'late')}><span class="tag confirm-tag">${I('Check', 12)}확인 요청 중${confirmReq.priority !== 'share' ? ' · ' + ACK_MODES[confirmReq.priority] : ''}</span><span class="confirm-strip-text">${confirmReq.body || ''}</span>${confirmReq.reply_by && html`<span class="confirm-strip-time">${I('Clock', 11)}${replyLabel(confirmReq.reply_by)}까지</span>`}${confirmReq.author_id !== meId ? (onConfirm && html`<button type="button" class="ack-button" disabled=${busy} onClick=${() => onConfirm(confirmReq)}>${I('Check', 14)}확인했어요</button>`) : html`<span class="confirm-strip-wait">상대 확인 기다리는 중</span>`}</div>`}<div class="record-bottom">${showKind && html`<span class=${'tag kind kind-' + item.kind}>${KINDS[item.kind]}</span>`}<${TopicBadge} name=${topicName} onClick=${editable && onEditField ? e => onEditField('topic', item, e) : undefined} />${item.kind === 'event' && html`<${Fragment}><span class="due">${I('CalendarDays', 14)}${item.day === today() ? '오늘' : shortDate(item.day)}</span><${Assignee} label="누구" name=${item.assignee} onClick=${editable && onEditField ? e => onEditField('assignee', item, e) : undefined} /><${CollabTag} item=${item} meId=${meId} /><//>`}${item.foreign && html`<span class="tag foreign-tag" title="다른 보드에서 공유한 업무 · 보기 전용">${I('Eye', 11)}${(window.PS_BOARD_NAMES || {})[item.home] || '다른 보드'}</span>`}${item.kind === 'task' && html`<${Fragment}><${PriorityTag} item=${item} onClick=${canWrite && onEditField ? e => onEditField('priority', item, e) : undefined} />${checkStat(item).total > 0 && html`<button type="button" class=${cx('check-chip toggle', checksOpen && 'on', checkStat(item).done === checkStat(item).total && 'all')} aria-expanded=${checksOpen} title=${checksOpen ? '세부 업무 접기' : '세부 업무 펼치기'} onClick=${() => setChecksOpen(v => !v)}>${I('ListChecks', 12)}세부 업무 ${checkStat(item).done}/${checkStat(item).total}${I(checksOpen ? 'ChevronDown' : 'ChevronRight', 12)}</button>`}${checkStat(item).total === 0 && item.status !== 'done' && editable && onChecklist && html`<button type="button" class=${cx('check-chip add', checksOpen && 'on')} title="세부 업무 만들기" onClick=${() => setChecksOpen(v => !v)}>${I('Plus', 12)}세부 업무</button>`}<${Due} due=${item.due} done=${item.status === 'done'} onClick=${canWrite && onEditField ? e => onEditField('due', item, e) : undefined} /><${Assignee} name=${item.assignee} onClick=${canWrite && onEditField ? e => onEditField('assignee', item, e) : undefined} />${item.progress > 0 && item.status !== 'done' && html`<button type="button" class="kc-progress row-progress" title="진행률 바꾸기" disabled=${!canWrite || !onEditField} onClick=${e => onEditField && onEditField('progress', item, e)}><span><i style=${`width:${item.progress}%`}></i></span><b>${item.progress}%</b></button>`}<${CollabTag} item=${item} meId=${meId} /><${ReqTag} item=${item} meId=${meId} /><//>`}${links.length > 0 && html`<div class="inline-links"><a href=${safeLink(links[0].url)} target="_blank" rel="noreferrer" title=${linkName(links[0])}>${I('Link2', 13)}${linkName(links[0])}${I('ArrowUpRight', 12)}</a>${links.length > 1 && html`<button type="button" class="more-pill" onClick=${() => onOpen(item.id, 'links')} aria-label=${`링크 ${links.length - 1}개 더 보기`}>+${links.length - 1}</button>`}</div>`}${(updates.length > 0 || (canWrite && item.kind !== 'event')) && html`<button type="button" class=${cx('reply-chip', updates.length > 0 && 'has')} title=${updates.length ? `댓글 ${updates.length}개 · 눌러서 보기·달기` : '댓글 달기'} onClick=${() => onOpen(item.id, 'record', !!canWrite)}>${I('MessageCircle', 13)}${updates.length ? `댓글 ${updates.length}` : '댓글'}</button>`}${lastUpdate && lastUpdate.created_at > item.updated_at ? html`<span class="edited-at">${personName(lastUpdate.author_name)} · <${Stamp} at=${lastUpdate.created_at} prefix="업데이트 " /></span>` : item.updated_at !== item.created_at && html`<span class="edited-at"><${Stamp} at=${item.updated_at} prefix="수정 " /></span>`}</div>${checksOpen && (checkStat(item).total > 0 || onChecklist) && html`<div class="row-checks">${onChecklist ? html`<${Checklist} item=${item} compact editable=${!!editable} busy=${busy} onAct=${onChecklist} />` : html`<ul class="share-checks">${item.checklist.map((c, k) => html`<li key=${k} class=${c.done ? 'done' : ''}><span class="check-box">${c.done ? I('Check', 12) : ''}</span><span class="check-text">${c.text}</span><b>${c.pct}%</b></li>`)}</ul>`}</div>`}</article>`;
}
