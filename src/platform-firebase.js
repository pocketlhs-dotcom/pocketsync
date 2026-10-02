/* Pocket Sync — Firebase platform layer.
 * Gives the board the same small interface it uses inside claude.ai
 * (window.claude.use('db' | 'user')), backed by Firestore + Google sign-in.
 * Who may enter is decided twice: here (so the right name is picked) and in
 * the Firestore security rules (the real lock). Emails are never stored in
 * this public file — only their SHA-256 hashes. */
(function () {
 const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAtv0cfBM6_J5qXVqUdRzRATvVLwu8R5uQ',
  authDomain: 'pocketsync-64cd6.firebaseapp.com',
  projectId: 'pocketsync-64cd6',
  storageBucket: 'pocketsync-64cd6.firebasestorage.app',
  messagingSenderId: '926307454788',
  appId: '1:926307454788:web:828f9ac2f0dad176285111'
 };
 // sha256(lowercased email) -> seat key. Filled in build.sh from the owner's list.
 const SEAT_BY_EMAIL_HASH = __SEAT_HASHES__;
 const SEAT_NAMES = {lhs: '이현성', kjs: '권중선', jgj: '정규진', ksy: '강승연', aej: '안은지'};
 // 보드: A = 이현성·권중선, B = 이현성·정규진, C = 이현성·디자인팀(강승연·안은지). 이현성은 모든 보드, 나머지는 자기 보드만.
 // C는 'all' 문서(이현성 개인 업무 등)를 보지 않는다: 디자이너 규칙이 ['C']뿐이라 목록 조건도 C만.
 const BOARDS = {A: {seats: ['lhs', 'kjs'], name: '권중선 보드'}, B: {seats: ['lhs', 'jgj'], name: '정규진 보드'}, C: {seats: ['lhs', 'ksy', 'aej'], name: '디자인팀 보드'}};
 const SEAT_BOARDS = {lhs: ['A', 'B', 'C'], kjs: ['A'], jgj: ['B'], ksy: ['C'], aej: ['C']};
 const visibleFor = b => (b === 'C' ? ['C'] : [b, 'all']);
 let BOARD = 'A', VISIBLE = ['A', 'all'];
 // 문서마다 board 필드: 이현성 개인 상태(오늘의 나·지금 상태·프로필·자리)는 두 보드 공통('all'), 나머지는 지금 보드.
 function boardFor(path, data) {
  if (data && data.board) return data.board;
  const [col, id = ''] = String(path).split('/');
  if (['presence', 'seen', 'members'].includes(col) && id === 'lhs') return 'all';
  if (col === 'meta') return 'all';
  return BOARD;
 }

 const SHARE_TOKEN = (() => { const m = new URLSearchParams(location.search).get('share'); return m && /^[A-Za-z0-9]{12,64}$/.test(m) ? m : ''; })();
 window.PS_PLATFORM = SHARE_TOKEN ? 'share' : 'firebase';
 const fb = window.firebase;
 fb.initializeApp(FIREBASE_CONFIG);
 const auth = fb.auth();
 const fs = fb.firestore();
 try { fs.settings({ignoreUndefinedProperties: true, merge: true}); } catch (e) { /* settings may already be applied */ }

 let session = {uid: null, seat: null, email: ''};

 // Firestore compat objects already match the board's db shape (doc/collection/get/set/update/delete/onSnapshot/where).
 // The only addition is acquire(): seats are decided by email here, so a lease is not needed.
 function wrapDoc(ref) {
  return {
   id: ref.id, path: ref.path,
   get: () => ref.get(),
   set: data => ref.set(data && typeof data === 'object' && !data.board ? {...data, board: boardFor(ref.path, data)} : data),
   update: data => ref.update(data),
   delete: () => ref.delete(),
   onSnapshot: (next, err) => ref.onSnapshot(next, err),
   acquire: async () => ({acquired: true, holder: session.uid})
  };
 }
 function wrapQuery(q) {
  return {
   where: (f, op, v) => wrapQuery(q.where(f, op, v)),
   get: () => q.get(),
   onSnapshot: (next, err) => q.onSnapshot(next, err)
  };
 }
 const db = {
  doc: path => wrapDoc(fs.doc(path)),
  collection: name => {
   // 목록 읽기는 항상 '지금 보드 + 공통' 문서만 (Firestore 규칙도 같은 조건으로 막는다).
   const c = fs.collection(name), base = wrapQuery(c.where('board', 'in', VISIBLE));
   return {...base, path: name, doc: id => wrapDoc(id ? c.doc(id) : c.doc())};
  }
 };
 const user = {
  id: async () => session.uid,
  can: async name => (name === 'data.write' ? !!session.seat : false),
  isOwner: async () => session.seat === 'lhs',
  canEdit: async () => !!session.seat,
  me: async () => ({id: session.uid, name: SEAT_NAMES[session.seat] || '', avatarUrl: '', color: '#3865e8', email: session.email || null, isOwner: session.seat === 'lhs', canEdit: !!session.seat})
 };
 window.claude = {use: async name => (name === 'db' ? db : name === 'user' ? user : null)};
 window.PS_SIGNOUT = () => auth.signOut().then(() => location.reload());
 window.PS_SWITCH_BOARD = b => { try { localStorage.setItem('ps.board', b); } catch (e) {} location.reload(); };
 // 이현성: 다른 보드의 업무·확인 표시만 가볍게 들어서 전환 버튼에 새 알림 개수를 보여준다.
 window.PS_WATCH_BOARD = (b, cb) => {
  let its = [], aks = []; const push = () => cb(its, aks);
  const u1 = fs.collection('items').where('board', '==', b).onSnapshot(s => { its = s.docs.map(d => ({id: d.id, ...d.data()})); push(); }, e => console.error('watch items', e));
  const u2 = fs.collection('acks').where('board', '==', b).onSnapshot(s => { aks = s.docs.map(d => ({id: d.id, ...d.data()})); push(); }, e => console.error('watch acks', e));
  return () => { u1(); u2(); };
 };
 // 보드 도입 전 기록에 board 필드를 붙인다(한 번만). 이현성 혼자 업무·일정과 개인 상태는 'all', 나머지는 A.
 async function migrateBoards() {
  try { const m = await fs.doc('meta/boards_v2').get(); if (m.exists) return; } catch (e) { return; }
  const LHS = ['이현성', '현성 이', '부대표', 'pocket.lhs', 'lhs'];
  let topicNames = {};
  try { const t = await fs.collection('topics').get(); t.docs.forEach(d => { topicNames[d.id] = (d.data() || {}).name || ''; }); } catch (e) { return; }
  const cols = ['topics', 'items', 'comments', 'acks', 'profiles', 'members', 'checkins', 'reactions', 'presence', 'seen', 'daynotes', 'shares'];
  for (const col of cols) {
   let snap; try { snap = await fs.collection(col).get(); } catch (e) { console.error('migrate read', col, e); return; }
   let batch = fs.batch(), n = 0;
   for (const d of snap.docs) {
    const v = d.data() || {}; if (v.board) continue;
    let patch = {board: boardFor(col + '/' + d.id, null) === 'all' ? 'all' : 'A'};
    if (col === 'items') { const solo = (v.kind === 'task' || v.kind === 'event') && LHS.includes(v.assignee) && v.req !== 'pending'; patch = {board: solo ? 'all' : 'A', home: 'A', topic_label: topicNames[v.topic_id] || ''}; }
    batch.update(d.ref, patch); n++;
    if (n >= 400) { await batch.commit(); batch = fs.batch(); n = 0; }
   }
   if (n) await batch.commit();
  }
  await fs.doc('meta/boards_v2').set({board: 'all', done_at: new Date().toISOString()});
 }
 // 오늘의 나를 보드별로 나눈 뒤: 예전에 두 보드 공통('all')이던 이현성 오늘의 나는 A 보드 것으로 돌린다.
 async function splitCheckins() {
  try { const m = await fs.doc('meta/checkin_v2').get(); if (m.exists) return; } catch (e) { return; }
  try {
   for (const col of ['checkins', 'profiles']) {
    const snap = await fs.collection(col).where('board', '==', 'all').get();
    for (const d of snap.docs) await d.ref.update({board: 'A'});
   }
   await fs.doc('meta/checkin_v2').set({board: 'all', done_at: new Date().toISOString()});
  } catch (e) { console.error('split checkins', e); }
 }
 // 요청(09-29): A의 '개발 협업' 카테고리 업무를 정규진 보드에도 보기 전용으로(한 번만). 이후 켜고 끄기는 카테고리 관리에서.
 async function shareDevTopic() {
  try { const m = await fs.doc('meta/share_dev_v1').get(); if (m.exists) return; } catch (e) { return; }
  try {
   const LHS = ['이현성', '현성 이', '부대표', 'pocket.lhs', 'lhs'];
   const tops = (await fs.collection('topics').where('board', '==', 'A').get()).docs.filter(d => (d.data() || {}).name === '개발 협업');
   for (const t of tops) {
    await t.ref.update({share_boards: ['B']});
    const its = await fs.collection('items').where('board', '==', 'A').get();
    for (const d of its.docs) { const v = d.data() || {}; if (v.kind === 'task' && v.topic_id === t.id && (v.home || 'A') === 'A' && !(LHS.includes(v.assignee) && v.req !== 'pending')) await d.ref.update({board: 'all'}); }
   }
   await fs.doc('meta/share_dev_v1').set({board: 'all', done_at: new Date().toISOString()});
  } catch (e) { console.error('share dev topic', e); }
 }
 // B 보드 첫 사용: 카테고리 '개발 협업', '디자인만'을 한 번 만들어 둔다.
 async function seedBoard(b) {
  if (b !== 'B') return;
  try {
   const m = await fs.doc('meta/seed_B').get(); if (m.exists) return;
   const now = new Date().toISOString();
   await fs.doc('topics/B-dev').set({name: '개발 협업', name_key: '개발협업', sort_order: 0, created_at: now, board: 'B'});
   await fs.doc('topics/B-design').set({name: '디자인만', name_key: '디자인만', sort_order: 1, created_at: now, board: 'B'});
   await fs.doc('meta/seed_B').set({board: 'B', done_at: now});
  } catch (e) { console.error('seed B', e); }
 }

 // 이현성: C(디자인팀)에서 A 업무를 불러올 때 A 목록을 한 번 읽는다.
 window.PS_READ_BOARD = async b => {
  const [its, tops] = await Promise.all([fs.collection('items').where('board', 'in', [b, 'all']).get(), fs.collection('topics').where('board', '==', b).get()]);
  return {items: its.docs.map(d => ({id: d.id, ...d.data()})), topics: tops.docs.map(d => ({id: d.id, ...d.data()}))};
 };
 // 이현성이 어느 보드를 열어 두든: C 오더의 진행 상황을 A 원본(c_link)에 옮겨 적는다. 디자이너는 A에 쓸 수 없어서 이현성 쪽에서 맞춘다.
 function watchTeamLinks() {
  let seen = {}; try { seen = JSON.parse(localStorage.getItem('ps.clink') || '{}') || {}; } catch (e) {}
  fs.collection('items').where('board', '==', 'C').onSnapshot(async s => {
   for (const d of s.docs) {
    const v = d.data() || {};
    const targets = [...(v.src_board === 'A' && v.src_id ? [v.src_id] : []), ...(Array.isArray(v.out_links) ? v.out_links.map(o => o && o.id).filter(Boolean) : [])];
    if (!targets.length) continue;
    const who = v.assignee === '모두' ? '셋 다' : v.assignee === '함께' ? BOARDS.C.seats.filter(k => k !== 'lhs').map(k => SEAT_NAMES[k]).join('·') : (v.assignee || '미배정');
    const link = {id: d.id, status: v.status || 'todo', progress: Number(v.progress) || 0, assignee: who, due: v.due || '', issue: v.issue || '', at: v.updated_at || ''};
    const key = JSON.stringify([link, targets]); if (seen[d.id] === key) continue;
    for (const t of targets) { try { await fs.doc('items/' + t).update({c_link: link}); } catch (e) { console.error('team link', e); } }
    seen[d.id] = key;
   }
   try { localStorage.setItem('ps.clink', JSON.stringify(seen)); } catch (e) {}
  }, e => console.error('team links', e));
 }

 async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
 }

 const root = () => document.getElementById('app');
 function screen(inner) {
  root().innerHTML = `<div class="app-shell"><header class="app-header"><div class="header-inner"><a class="brand" href="#"><span class="brand-mark">p</span><span>pocket<span> sync</span></span></a><span class="workspace-name">Pocket 공유 보드</span></div></header><main class="board-main"><section class="login-gate"><div class="gate-card"><div class="gate-brand"><span class="brand-mark">p</span><span>pocket<span> sync</span></span></div>${inner}</div></section></main></div>`;
 }
 const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
 const googleMark = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

 function showSignIn(message) {
  screen(`<h2>로그인해 주세요</h2><p>허용된 구글 계정으로만 들어올 수 있어요. 한 번 로그인하면 이 브라우저에서는 다음부터 바로 열립니다.</p>${message ? `<p class="form-error" role="alert">${esc(message)}</p>` : ''}<button type="button" class="primary-button google-signin" id="ps-signin">${googleMark}Google 계정으로 로그인</button>`);
  document.getElementById('ps-signin').onclick = signIn;
 }
 function showDenied(email) {
  screen(`<h2>허용되지 않은 계정이에요</h2><p><strong>${esc(email)}</strong> 계정은 이 보드에 들어올 수 없어요. 허용된 구글 계정으로 다시 로그인해 주세요.</p><button type="button" class="secondary-button" id="ps-switch">다른 계정으로 로그인</button>`);
  document.getElementById('ps-switch').onclick = () => auth.signOut();
 }
 function showLoading(text) {
  screen(`<p class="gate-loading">${esc(text)}</p>`);
 }
 async function signIn() {
  const provider = new fb.auth.GoogleAuthProvider();
  provider.setCustomParameters({prompt: 'select_account'});
  try { await auth.signInWithPopup(provider); }
  catch (e) {
   const code = e && e.code;
   if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') { try { await auth.signInWithRedirect(provider); return; } catch (e2) { showSignIn(message(e2)); return; } }
   if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
   showSignIn(message(e));
  }
 }
 function message(e) {
  const code = e && e.code;
  if (code === 'auth/unauthorized-domain') return '이 주소는 아직 로그인이 허용되지 않았어요. Firebase의 승인된 도메인을 확인해 주세요.';
  if (code === 'auth/network-request-failed') return '인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
  return '로그인하지 못했어요. 다시 시도해 주세요.' + (code ? ` (${code})` : '');
 }

 let Board = null, ShareView = null, mounted = false;
 window.PS_MOUNT = (B, SV) => { Board = B; ShareView = SV; start(); };
 // ?share=토큰 으로 들어오면 로그인 없이 그 공유 문서 하나만 읽어 보기 전용 화면을 띄운다.
 // 보드 전체 공유: 같은 보드 화면을 띄우되, 데이터는 shares/{토큰}_{컬렉션} 문서에서 읽고 쓰기는 모두 막는다.
 function shareBackend(token) {
  const nope = () => Promise.reject(Object.assign(new Error('보기 전용 공유 화면이에요.'), {code: 'permission-denied'}));
  const snapOf = s => { const rows = (s && s.exists && (s.data() || {}).rows) || []; return {docs: rows.map(r => ({id: r.id, exists: true, data: () => r}))}; };
  const roDoc = path => ({id: String(path).split('/').pop(), path, get: async () => ({exists: false, id: String(path).split('/').pop(), data: () => ({})}), set: nope, update: nope, delete: nope, onSnapshot: next => { next({exists: false, data: () => ({})}); return () => {}; }, acquire: async () => ({acquired: false})});
  const col = name => ({path: name, where: () => col(name), doc: id => roDoc(name + '/' + id), get: async () => snapOf(await fs.doc(`shares/${token}_${name}`).get()), onSnapshot: (next, err) => fs.doc(`shares/${token}_${name}`).onSnapshot(s => next(snapOf(s)), err)});
  const sdb = {doc: roDoc, collection: col};
  const suser = {id: async () => 'share-viewer', can: async () => false, isOwner: async () => false, canEdit: async () => false, me: async () => ({id: 'share-viewer', name: '', avatarUrl: '', color: '#3865e8', email: null, isOwner: false, canEdit: false})};
  window.claude = {use: async name => (name === 'db' ? sdb : name === 'user' ? suser : null)};
 }

 function start() {
  const token = SHARE_TOKEN;
  if (token && ShareView) {
   const meta = document.createElement('meta'); meta.name = 'referrer'; meta.content = 'no-referrer'; document.head.appendChild(meta);
   showLoading('공유된 보드를 여는 중이에요.');
   const showTasks = () => { root().innerHTML = ''; preact.render(preact.h(ShareView, {token, watch: (next, fail) => fs.doc('shares/' + token).onSnapshot(s => next(s.exists ? s.data() : null), fail)}), root()); };
   fs.doc('shares/' + token).get().then(s => {
    const d = s.exists ? s.data() : null;
    if (d) { const b = BOARDS[d.board] ? d.board : 'A'; BOARD = b; window.PS_BOARD = b; window.PS_SEATS = BOARDS[b].seats.map(k => ({key: k, name: SEAT_NAMES[k]})); if (window.PS_CONFIGURE) window.PS_CONFIGURE(); }
    if (d && d.mode === 'full' && d.active !== false) { shareBackend(token); document.title = (d.title || 'Pocket 공유 보드') + ' · pocket sync'; root().innerHTML = ''; preact.render(preact.h(Board, null), root()); }
    else showTasks();
   }, showTasks);
   return;
  }
  showLoading('불러오는 중이에요.');
  auth.getRedirectResult().catch(e => showSignIn(message(e)));
  auth.onAuthStateChanged(async u => {
   if (!u) { session = {uid: null, seat: null, email: ''}; if (mounted) location.reload(); else showSignIn(); return; }
   const email = (u.email || '').toLowerCase();
   const seat = SEAT_BY_EMAIL_HASH[await sha256(email)] || null;
   if (!seat) { showDenied(email); return; }
   session = {uid: u.uid, seat, email};
   window.PS_EMAIL = email; window.PS_SEAT = seat;
   const mine = SEAT_BOARDS[seat] || ['A'];
   let want = ''; try { want = localStorage.getItem('ps.board') || ''; } catch (e) {}
   BOARD = mine.includes(want) ? want : mine[0]; VISIBLE = visibleFor(BOARD);
   window.PS_BOARD = BOARD; window.PS_BOARDS = mine;
   window.PS_BOARD_NAMES = Object.fromEntries(Object.entries(BOARDS).map(([k, v]) => [k, v.name]));
   window.PS_SEATS = BOARDS[BOARD].seats.map(k => ({key: k, name: SEAT_NAMES[k]}));
   if (window.PS_CONFIGURE) window.PS_CONFIGURE();
   showLoading(`${SEAT_NAMES[seat]}님, 보드를 여는 중이에요.`);
   try {
    if (seat === 'lhs' || seat === 'kjs') { showLoading('보드를 정리하는 중이에요.'); await migrateBoards(); await splitCheckins(); }
    if (seat === 'lhs') await shareDevTopic();
    await seedBoard(BOARD);
    const ref = fs.doc('members/' + seat), cur = await ref.get();
    if (!cur.exists || cur.data().user_id !== u.uid || !cur.data().board) await ref.set({name: SEAT_NAMES[seat], user_id: u.uid, claimed_at: new Date().toISOString(), board: seat === 'lhs' ? 'all' : BOARD});
   } catch (e) {
    screen(`<h2>보드에 연결하지 못했어요</h2><p>로그인은 됐지만 기록 저장소가 이 계정을 막고 있어요. Firebase의 Firestore 규칙에 이 이메일이 들어 있는지 확인해 주세요.</p><p class="form-error">${esc((e && e.code) || '')}</p><button type="button" class="secondary-button" id="ps-retry">다시 시도</button>`);
    document.getElementById('ps-retry').onclick = () => location.reload();
    return;
   }
   mounted = true;
   if (seat === 'lhs') watchTeamLinks();
   root().innerHTML = '';
   preact.render(preact.h(Board, null), root());
  });
 }
})();
