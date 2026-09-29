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
 const SEAT_BY_EMAIL_HASH = { "8e12e0a9af82ae0fd0366552ef4f22740be5fc1a589943635e9c58572ee89c2a": "lhs", "806b357d8daa64177bec9c842594a5680d45d40ba02742ce6cc81403585811ad": "kjs"};
 const SEAT_NAMES = {lhs: '이현성', kjs: '권중선'};

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
   set: data => ref.set(data),
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
   const c = fs.collection(name), base = wrapQuery(c);
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

 async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
 }

 const root = () => document.getElementById('app');
 function screen(inner) {
  root().innerHTML = `<div class="app-shell"><header class="app-header"><div class="header-inner"><a class="brand" href="#"><span class="brand-mark">p</span><span>pocket<span> sync</span></span></a><span class="workspace-name">이현성 · 권중선의 공유 보드</span></div></header><main class="board-main"><section class="login-gate"><div class="gate-card"><div class="gate-brand"><span class="brand-mark">p</span><span>pocket<span> sync</span></span></div>${inner}</div></section></main></div>`;
 }
 const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
 const googleMark = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

 function showSignIn(message) {
  screen(`<h2>로그인해 주세요</h2><p>이현성 · 권중선 두 사람의 구글 계정으로만 들어올 수 있어요. 한 번 로그인하면 이 브라우저에서는 다음부터 바로 열립니다.</p>${message ? `<p class="form-error" role="alert">${esc(message)}</p>` : ''}<button type="button" class="primary-button google-signin" id="ps-signin">${googleMark}Google 계정으로 로그인</button>`);
  document.getElementById('ps-signin').onclick = signIn;
 }
 function showDenied(email) {
  screen(`<h2>허용되지 않은 계정이에요</h2><p><strong>${esc(email)}</strong> 계정은 이 보드에 들어올 수 없어요. 이현성 · 권중선의 구글 계정으로 다시 로그인해 주세요.</p><button type="button" class="secondary-button" id="ps-switch">다른 계정으로 로그인</button>`);
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
   window.PS_EMAIL = email;
   showLoading(`${SEAT_NAMES[seat]}님, 보드를 여는 중이에요.`);
   try {
    const ref = fs.doc('members/' + seat), cur = await ref.get();
    if (!cur.exists || cur.data().user_id !== u.uid) await ref.set({name: SEAT_NAMES[seat], user_id: u.uid, claimed_at: new Date().toISOString()});
   } catch (e) {
    screen(`<h2>보드에 연결하지 못했어요</h2><p>로그인은 됐지만 기록 저장소가 이 계정을 막고 있어요. Firebase의 Firestore 규칙에 이 이메일이 들어 있는지 확인해 주세요.</p><p class="form-error">${esc((e && e.code) || '')}</p><button type="button" class="secondary-button" id="ps-retry">다시 시도</button>`);
    document.getElementById('ps-retry').onclick = () => location.reload();
    return;
   }
   mounted = true;
   root().innerHTML = '';
   preact.render(preact.h(Board, null), root());
  });
 }
})();
