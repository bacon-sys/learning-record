/* 專題學習紀錄平台：登入、班級、學習紀錄頁、老師端 */
(() => {
'use strict';
const CFG = window.LR_CONFIG;
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- 連線（「記住我」決定登入狀態存在哪裡） ---------- */
const remember = () => { try { return localStorage.getItem('lr-remember') !== '0'; } catch (e) { return true; } };
const store = {
  getItem: k => { try { return (remember() ? localStorage : sessionStorage).getItem(k); } catch (e) { return null; } },
  setItem: (k, v) => { try { (remember() ? localStorage : sessionStorage).setItem(k, v); } catch (e) {} },
  removeItem: k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} },
};
const sb = supabase.createClient(CFG.url, CFG.key, { auth: { storage: store, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });

const S = { uid: null, role: null, me: null };
const BUCKET = 'note-images';   // 照片的檔案空間：班級id/學生id/筆記id/檔名

/* ---------- 小工具 ---------- */
function toast(m) { const t = $('#appToast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2800); }
async function q(promise) { const { data, error } = await promise; if (error) throw error; return data; }
async function callFn(name, body) {
  const { data, error } = await sb.functions.invoke(name, { body });
  if (error) {
    let msg = '連線有問題，請再試一次';
    try { const j = await error.context.json(); msg = j.message || msg; } catch (e) {}
    const err = new Error(msg); err.fn = true; throw err;
  }
  return data;
}
const fmtD = d => { d = new Date(d); return `${d.getMonth() + 1}/${d.getDate()}`; };
const fmtFull = d => { d = new Date(d); return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`; };
const fmtDT = d => new Date(d).toLocaleString('zh-TW', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
// 頭像底色：白字對比都在 4.5:1 以上
const COLORS = ['#C2543A', '#367156', '#3A6E93', '#6A5A94', '#8C6A1E', '#A64D6B', '#2F7272', '#5E7A2E', '#9A5B2E', '#6E655C'];
const TEACHER_COLOR = '#6E655C';
const colorOf = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
const initial = s => (String(s || '?').trim()[0] || '?').toUpperCase();
const logo = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" fill="none" stroke="#C2543A" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8 16 12 12 16 8 12Z" fill="#C2543A"/></svg>';
// 線性圖示 24×24；語意固定：書本＝筆記、勾＝送出、時鐘＝未交、鉛筆＝草稿／編輯、山形＝進度、下載＝匯出、放大鏡＝搜尋
const svg = d => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  pen: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  print: svg('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  book: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3.5"/>'),
  mountain: svg('<path d="M3 19 9.5 8.5l4 6.5 2.5-3.5L21 19Z"/>'),
  back: svg('<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>'),
  prev: svg('<path d="m15 18-6-6 6-6"/>'),
  next: svg('<path d="m9 18 6-6-6-6"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  hourglass: svg('<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  open: svg('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  refresh: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  archive: svg('<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>'),
};
// 狀態標籤：圖示＋文字＋顏色
const tagOk = t => `<span class="wk ok">${ICON.check}${t}</span>`;
const tagTodo = t => `<span class="wk no">${ICON.clock}${t}</span>`;
const tagDraft = t => `<span class="wk dr">${ICON.pen}${t}</span>`;
const tagArch = t => `<span class="wk arch">${ICON.archive}${t}</span>`;
// 公開狀態（只有自己＝none 不顯示標籤）
const SHARE_TAG = {
  pending: `<span class="wk wait">${ICON.hourglass}等老師審核</span>`,
  approved: `<span class="wk pub">${ICON.globe}已公開</span>`,
  rejected: `<span class="wk rej">${ICON.x}沒有通過公開</span>`,
};
const shareTag = n => SHARE_TAG[n.share_status] || '';
const wallHash = cls => `#/p/${cls.public_token}`;
const wallUrl = cls => `${CFG.publicUrl}#/p/${cls.public_token}`;
const grad = n => 'g' + (((n - 1) % 4) + 4) % 4; // 四色輪替：蜂蜜、抹茶、藕紫、天空
const loading = (t = '載入中⋯') => { app.innerHTML = `<div class="loading">${esc(t)}</div>`; };

/* ---------- 對話框（取代瀏覽器的 alert/confirm） ---------- */
function modal(html, { onOpen } = {}) {
  const bg = $('#appModal'), box = $('#appModalBox');
  box.innerHTML = html; bg.classList.add('on');
  return new Promise(resolve => {
    const close = v => { bg.classList.remove('on'); bg.onclick = null; resolve(v); };
    bg.onclick = e => {
      if (e.target === bg || e.target.closest('[data-close]')) close(null);
      const ok = e.target.closest('[data-ok]'); if (ok) close(ok.dataset.ok || true);
    };
    box.querySelector('form')?.addEventListener('submit', e => { e.preventDefault(); close(Object.fromEntries(new FormData(e.target))); });
    onOpen && onOpen(box, close);
    setTimeout(() => box.querySelector('input,textarea,select')?.focus(), 30);
  });
}
const confirmBox = (title, body, okLabel = '確定', danger = false) => modal(
  `<h2>${esc(title)}</h2><div>${body}</div><div class="actions"><button class="sbtn" data-close type="button">取消</button><button class="${danger ? 'dbtn' : 'pbtn'}" data-ok="1" type="button">${esc(okLabel)}</button></div>`);
const infoBox = (title, body) => modal(`<h2>${esc(title)}</h2><div>${body}</div><div class="actions"><button class="pbtn" data-ok="1" type="button">知道了</button></div>`);

/* ---------- 週次 ---------- */
function weekStart(cls) {
  const d = new Date(cls.start_date + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() - (cls.week_starts_on ?? 1) + 7) % 7));
  return d;
}
function weekNo(cls, date) {
  const s = weekStart(cls), d = new Date(date); d.setHours(0, 0, 0, 0);
  return Math.floor((d - s) / (7 * 864e5)) + 1;
}
function weekRange(cls, n) {
  const s = weekStart(cls); const a = new Date(s.getTime() + (n - 1) * 7 * 864e5); const b = new Date(a.getTime() + 6 * 864e5);
  return `${fmtD(a)}–${fmtD(b)}`;
}
const curWeek = cls => Math.max(1, weekNo(cls, new Date()));
function thisMonday() { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); }
function weekStatus(cls, notes, n) {
  let st = 'n';
  for (const x of notes) {
    if (x.first_submitted_at && weekNo(cls, x.first_submitted_at) === n) return 'd';
    if (!x.submitted_at && weekNo(cls, x.created_at) === n) st = 'r';
  }
  return st;
}
// 送出後又改了內容但還沒再送出。由資料庫比對「草稿」和「送出版」的內容（notes.has_unsent），不再用時間猜
const hasUnsent = n => !!(n.submitted_at && n.has_unsent);

/* ---------- 上方列 ---------- */
function topbar(crumbs) {
  const who = S.role === 'teacher'
    ? { av: initial(S.me.display_name), label: S.me.display_name + ' 老師', color: TEACHER_COLOR }
    : { av: initial(S.me.display_name), label: S.me.display_name, color: colorOf(S.uid) };
  const last = crumbs.length - 1;
  return `<header class="top"><div class="top-in">
    <a class="abrand" href="#/" title="${esc(CFG.site)}"><span class="logo">${logo}</span><span class="bt">${esc(CFG.site)}</span></a>
    <nav class="crumb" aria-label="目前位置">${crumbs.map((c, i) => (i ? `<span class="sep" aria-hidden="true">${ICON.next}</span>` : '') + (c[1] && i !== last ? `<a class="cp" href="${c[1]}">${esc(c[0])}</a>` : `<span class="cp ${i === last ? 'on' : ''}" ${i === last ? 'aria-current="page"' : ''}>${esc(c[0])}</span>`)).join('')}</nav>
    <span class="sp"></span>
    ${S.role === 'teacher' && S.me.is_admin ? `<a class="link" href="#/admin" title="管理：老師帳號、資料備份" aria-label="管理">${ICON.users}<span class="wn">管理</span></a>` : ''}
    <a class="who-chip" href="#/me" title="我的帳號、改密碼"><span class="mini-av" style="background:${who.color}">${esc(who.av)}</span><span class="wn">${esc(who.label)}</span></a>
    <button class="link" data-act="logout">登出</button>
  </div></header>`;
}
function blogHead(student, cls, act = '') {
  return `<section class="blog-head"><div class="cover"></div><div class="profile">
    <div class="avatar" style="background:${colorOf(student.id)}">${esc(initial(student.display_name))}</div>
    <div class="who"><div class="blog-name">${esc(student.display_name)} 的學習紀錄</div><div class="blog-sub">${esc(cls.name)}${student.seat_no ? `　·　${student.seat_no} 號` : ''}</div></div>
    ${act ? `<div class="act">${act}</div>` : ''}
  </div></section>`;
}
function noteCard(n, cls, link, isOwner) {
  const sent = !!n.submitted_at;
  const title = (sent ? n.sub_title : n.title) || n.title || '（還沒有標題）';
  const ex = (sent ? n.sub_text : n.content_text) || '';
  const raw = weekNo(cls, n.first_submitted_at || n.created_at);
  const wk = Math.max(1, raw);
  const status = !sent ? tagDraft('草稿・還沒送出')
    : hasUnsent(n) && isOwner ? tagDraft('有修改還沒送出')
    : tagOk('已送出');
  const pill = `<span class="pill">${sent && raw === curWeek(cls) ? '這週・' : ''}第 ${wk} 週</span>`;
  const th = n.cover_url ? `<div class="thumb img" style="background-image:url('${esc(n.cover_url)}')">${pill}</div>`
    : `<div class="thumb ${grad(wk)}"><span class="badge">${ICON.book}</span>${pill}</div>`;
  return `<button class="card ${sent ? '' : 'draft'}" data-go="${link}">${th}
    <div class="cb"><div class="cdate">第 ${wk} 週・${fmtD(n.submitted_at || n.updated_at)}</div><div class="ctitle">${esc(title)}</div><div class="cex">${esc(ex.slice(0, 120)) || '（還沒有內容）'}</div>
    <div class="cfoot"><span class="tags">${status}${shareTag(n)}</span>${n.word_count != null ? `<span>${n.word_count} 字</span>` : ''}</div></div></button>`;
}

/* ---------- 登入 ---------- */
function viewLogin(params) {
  app.innerHTML = `
  <div class="login-bg"><div class="login">
    <div class="login-head"><div class="logo">${logo}</div><div class="s">${esc(CFG.school)}</div><div class="t">${esc(CFG.site)}</div></div>
    <div class="seg"><button class="on" data-seg="stu" type="button">我是學生</button><button data-seg="tea" type="button">我是老師</button></div>
    <form id="fStu" autocomplete="on">
      <label class="fld"><span>帳號（登入卡上的數字）</span><input name="account" inputmode="numeric" autocomplete="username" required></label>
      <label class="fld"><span>密碼</span><input name="password" type="password" autocomplete="current-password" required></label>
      <label class="chk"><input type="checkbox" name="remember" checked>記住我（這台 Chromebook 下次不用再登入）</label>
      <button class="ab pri" type="submit">登入</button>
      <div class="msg err" id="stuMsg" hidden></div>
      <div class="hint">也可以用 Chromebook 的相機掃描登入卡上的 QR code，會直接登入。<br>忘記密碼請找老師幫你重設。</div>
    </form>
    <form id="fTea" hidden>
      <label class="fld"><span>Email</span><input name="email" type="email" autocomplete="username" required></label>
      <label class="fld"><span>密碼</span><input name="password" type="password" autocomplete="current-password" required></label>
      <label class="chk"><input type="checkbox" name="remember" checked>記住我</label>
      <button class="ab pri" type="submit">老師登入</button>
      <div class="msg err" id="teaMsg" hidden></div>
      <div class="hint">老師帳號由管理者建立，不開放自行註冊。</div>
    </form>
  </div></div>`;
  const showMsg = (id, m) => { const el = $(id); el.textContent = m; el.hidden = !m; };
  app.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => {
    app.querySelectorAll('[data-seg]').forEach(x => x.classList.toggle('on', x === b));
    $('#fStu').hidden = b.dataset.seg !== 'stu'; $('#fTea').hidden = b.dataset.seg !== 'tea';
  });
  async function studentLogin(account, password, rem) {
    showMsg('#stuMsg', '');
    try { localStorage.setItem('lr-remember', rem ? '1' : '0'); } catch (e) {}
    const btn = $('#fStu button[type=submit]'); btn.disabled = true; btn.textContent = '登入中⋯';
    try {
      const { data, error } = await sb.functions.invoke('student-login', { body: { account, password } });
      if (error) { let m = '登入沒有成功，請再試一次'; try { m = (await error.context.json()).message || m; } catch (e) {} throw new Error(m); }
      const { error: e2 } = await sb.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      if (e2) throw e2;
      history.replaceState(null, '', location.pathname + '#/'); await boot();
    } catch (e) { showMsg('#stuMsg', e.message || String(e)); btn.disabled = false; btn.textContent = '登入'; }
  }
  $('#fStu').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); studentLogin(String(f.get('account')).trim(), String(f.get('password')), !!f.get('remember')); };
  $('#fTea').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    try { localStorage.setItem('lr-remember', f.get('remember') ? '1' : '0'); } catch (err) {}
    const btn = $('#fTea button[type=submit]'); btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: String(f.get('email')).trim(), password: String(f.get('password')) });
    btn.disabled = false;
    if (error) { showMsg('#teaMsg', 'Email 或密碼不對'); return; }
    history.replaceState(null, '', location.pathname + '#/'); await boot();
  };
  // 掃登入卡 QR code：#/login?u=帳號&p=密碼
  if (params.u && params.p) {
    $('#fStu [name=account]').value = params.u; $('#fStu [name=password]').value = params.p;
    history.replaceState(null, '', location.pathname + '#/login');
    studentLogin(params.u, params.p, true);
  }
}

/* ---------- 首頁：我的班級 ---------- */
async function viewHome() {
  if (S.role === 'student') return viewStudentHome();
  loading();
  const cts = await q(sb.from('class_teachers').select('class:classes(*)').eq('teacher_id', S.uid));
  const classes = cts.map(r => r.class).filter(Boolean).sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  const ids = classes.map(c => c.id);
  const [enr, notes, tch] = ids.length ? await Promise.all([
    q(sb.from('enrollments').select('class_id,student_id').in('class_id', ids)),
    q(sb.from('notes').select('class_id,student_id,first_submitted_at,submitted_at,created_at,share_status').in('class_id', ids)),
    q(sb.from('class_teachers').select('class_id,teacher:teachers(display_name)').in('class_id', ids)),
  ]) : [[], [], []];
  const card = c => {
    const n = enr.filter(e => e.class_id === c.id).length;
    const cn = notes.filter(x => x.class_id === c.id);
    const wk = curWeek(c);
    const done = new Set(cn.filter(x => x.first_submitted_at && weekNo(c, x.first_submitted_at) === wk).map(x => x.student_id)).size;
    const pend = cn.filter(x => x.share_status === 'pending').length;
    const names = tch.filter(t => t.class_id === c.id).map(t => t.teacher?.display_name).filter(Boolean).join('、');
    return `<button class="class-card" data-go="#/c/${c.id}"><div class="band ${c.archived ? 'arch' : (/八/.test(c.name) ? 'c8' : 'c7')}"></div><div class="ci">
      <div class="cn">${esc(c.name)}</div><div class="cm">${n} 位學生・${esc(names)}</div>
      ${c.archived ? `<div class="stat">${tagArch('已封存・作品保留')}</div>` : `<div class="stat"><span>本週已送出 <b>${done}</b>/${n}</span><span>共 <b>${cn.filter(x => x.submitted_at).length}</b> 篇</span>${pend ? `<span class="wk wait">${ICON.hourglass}${pend} 篇等審核</span>` : ''}</div>`}</div></button>`;
  };
  const open = classes.filter(c => !c.archived), arch = classes.filter(c => c.archived);
  app.innerHTML = topbar([['我的班級']]) + `
  <div class="wrap">
    <div class="class-head"><div><h1 class="pg">我的班級</h1><p class="sub">${esc(S.me.display_name)} 老師</p></div>
      <button class="ab pri" data-act="newClass">${ICON.plus}開設班級</button></div>
    ${open.length ? `<div class="class-cards">${open.map(card).join('')}</div>` : '<div class="empty"><b>還沒有班級</b>按右上角「開設班級」開始。</div>'}
    ${arch.length ? `<div class="sec-head"><h2 style="font-size:19px;color:var(--muted)">已封存的班級</h2></div><div class="class-cards">${arch.map(card).join('')}</div>` : ''}
  </div>`;
}
async function newClass() {
  const r = await modal(`<h2>開設班級</h2><form>
    <label class="fld"><span>班級名稱</span><input name="name" required placeholder="例：115-1 七年級專題"></label>
    <label class="fld"><span>學期</span><input name="term" placeholder="例：115 學年度第 1 學期"></label>
    <label class="fld"><span>第 1 週從哪一天開始（用來算週次）</span><input name="start_date" type="date" value="${thisMonday()}" required></label>
    <div class="actions"><button class="sbtn" data-close type="button">取消</button><button class="pbtn" type="submit">開設</button></div></form>`);
  if (!r) return;
  try {
    const c = await q(sb.from('classes').insert({ name: r.name.trim(), term: r.term.trim(), start_date: r.start_date, created_by: S.uid }).select().single());
    toast('班級開好了，接著貼上學生名單'); location.hash = `#/c/${c.id}/roster`;
  } catch (e) { toast('開設沒有成功：' + e.message); }
}

async function viewStudentHome() {
  loading();
  const enr = await q(sb.from('enrollments').select('seat_no, class:classes(*)').eq('student_id', S.uid));
  const classes = enr.map(e => e.class).filter(Boolean);
  const ids = classes.map(c => c.id);
  const [notes, tch] = ids.length ? await Promise.all([
    q(sb.from('notes').select('class_id,first_submitted_at,submitted_at').eq('student_id', S.uid).in('class_id', ids)),
    q(sb.from('class_teachers').select('class_id,teacher:teachers(display_name)').in('class_id', ids)),
  ]) : [[], []];
  app.innerHTML = topbar([['我的班級']]) + `
  <div class="wrap narrow">
    <h1 class="pg">嗨，${esc(S.me.display_name)}！</h1>
    <p class="sub">點一個班級，進去寫這週的學習筆記。</p>
    ${classes.length ? `<div class="class-cards">${classes.map(c => {
      const mine = notes.filter(n => n.class_id === c.id);
      const doneNow = mine.some(n => n.first_submitted_at && weekNo(c, n.first_submitted_at) === curWeek(c));
      const names = tch.filter(t => t.class_id === c.id).map(t => t.teacher?.display_name + ' 老師').join('、');
      return `<button class="class-card" data-go="#/c/${c.id}"><div class="band ${c.archived ? 'arch' : (/八/.test(c.name) ? 'c8' : 'c7')}"></div><div class="ci">
        <div class="cn">${esc(c.name)}</div><div class="cm">${esc(names)}</div>
        <div class="stat"><span>已送出 <b>${mine.filter(n => n.submitted_at).length}</b> 篇</span>${c.archived ? tagArch('已封存') : doneNow ? tagOk('這週寫好了') : tagTodo('這週還沒送出')}</div></div></button>`;
    }).join('')}</div>` : '<div class="empty"><b>你還沒有加入任何班級</b>請找老師把你加進班級。</div>'}
  </div>`;
}

/* ---------- 班級（學生：自己的學習紀錄頁；老師：班級頁） ---------- */
async function loadClass(cid) {
  const cls = await q(sb.from('classes').select('*').eq('id', cid).maybeSingle());
  if (!cls) throw new Error('找不到這個班級，或你沒有權限');
  return cls;
}
async function viewClass(cid, tab, sid) {
  loading();
  let cls;
  try { cls = await loadClass(cid); } catch (e) { app.innerHTML = topbar([]) + `<div class="wrap"><div class="empty"><b>${esc(e.message)}</b><a href="#/">回到我的班級</a></div></div>`; return; }
  if (S.role === 'student') return viewMyBlog(cls);
  if (sid) return viewStudentBlogAsTeacher(cls, sid);
  return viewTeacherClass(cls, tab || 'blogs');
}

async function viewMyBlog(cls) {
  const [enr, notes] = await Promise.all([
    q(sb.from('enrollments').select('seat_no').eq('class_id', cls.id).eq('student_id', S.uid).maybeSingle()),
    q(sb.from('notes').select('id,title,sub_title,content_text,sub_text,created_at,updated_at,submitted_at,first_submitted_at,cover_url,word_count,share_status,has_unsent').eq('class_id', cls.id).eq('student_id', S.uid).order('created_at', { ascending: false })),
  ]);
  const me = { id: S.uid, display_name: S.me.display_name, seat_no: enr?.seat_no };
  const sent = notes.filter(n => n.submitted_at).length;
  const act = cls.archived ? tagArch('班級已封存，只能看不能改') : `<button class="ab pri" data-act="newNote" data-cid="${cls.id}">${ICON.pen}寫新的筆記</button>`;
  app.innerHTML = topbar([[cls.name]]) + `
  <div class="wrap narrow">
    ${blogHead(me, cls, act)}
    <div class="sec-head"><h2>我的學習筆記</h2><span class="meta">已送出 ${sent} 篇・草稿 ${notes.length - sent} 篇　<a class="ab sm" href="${wallHash(cls)}">${ICON.globe}班級展示牆</a>${sent ? ` <a class="ab sm" href="#/c/${cls.id}/portfolio">${ICON.print}我的作品集</a>` : ''}</span></div>
    ${notes.length ? `<div class="searchbar"><input id="searchBox" placeholder="搜尋我寫過的詞，例如：菱形紋" autocomplete="off"></div>` : ''}
    <div id="noteArea">${notes.length ? `<div class="cards">${notes.map(n => noteCard(n, cls, n.submitted_at ? `#/n/${n.id}` : `#/e/${n.id}`, true)).join('')}</div>`
      : `<div class="empty"><b>還沒有筆記</b>${cls.archived ? '' : '按上面的「寫新的筆記」開始寫第一篇。'}</div>`}</div>
  </div>`;
  const box = $('#searchBox');
  if (box) box.oninput = () => renderSearch(box.value.trim(), notes, cls);
}
function snippet(text, word) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return null;
  const a = Math.max(0, i - 30), b = Math.min(text.length, i + word.length + 40);
  const part = text.slice(a, b);
  const j = i - a;
  return (a > 0 ? '⋯' : '') + esc(part.slice(0, j)) + '<mark>' + esc(part.slice(j, j + word.length)) + '</mark>' + esc(part.slice(j + word.length)) + (b < text.length ? '⋯' : '');
}
function renderSearch(word, notes, cls) {
  const area = $('#noteArea');
  if (!word) { area.innerHTML = `<div class="cards">${notes.map(n => noteCard(n, cls, n.submitted_at ? `#/n/${n.id}` : `#/e/${n.id}`, true)).join('')}</div>`; return; }
  const hits = [];
  for (const n of notes) {
    const title = n.title || n.sub_title || '';
    const text = [n.content_text || '', n.sub_text && n.sub_text !== n.content_text ? n.sub_text : ''].join('\n');
    const inTitle = title.toLowerCase().includes(word.toLowerCase());
    const sn = snippet(text.replace(/\s+/g, ' '), word);
    if (inTitle || sn) hits.push({ n, title, sn });
  }
  area.innerHTML = hits.length ? `<p class="sub" style="margin:0 4px 10px">找到 ${hits.length} 篇有「${esc(word)}」</p><div class="hits">${hits.map(h => `
    <button class="hit" data-go="${h.n.submitted_at ? `#/n/${h.n.id}?hl=${encodeURIComponent(word)}` : `#/e/${h.n.id}`}">
      <div class="ht">${snippet(h.title, word) || esc(h.title || '（還沒有標題）')}</div>
      <div class="hd">${h.n.submitted_at ? '已送出' : '草稿'}・${fmtD(h.n.updated_at)}</div>
      ${h.sn ? `<div>${h.sn}</div>` : ''}</button>`).join('')}</div>`
    : `<div class="empty"><b>找不到「${esc(word)}」</b>換個詞試試看。</div>`;
}
async function newNote(cid) {
  try {
    const n = await q(sb.from('notes').insert({ class_id: cid, student_id: S.uid }).select('id').single());
    location.hash = `#/e/${n.id}`;
  } catch (e) { toast('沒辦法新增筆記：' + e.message); }
}

/* ---------- 老師：班級頁 ---------- */
async function loadClassData(cls) {
  const [enr, notes, tch, guard] = await Promise.all([
    q(sb.from('enrollments').select('seat_no, student:students(*)').eq('class_id', cls.id)),
    q(sb.from('notes').select('id,student_id,title,sub_title,sub_text,content_text,created_at,updated_at,submitted_at,first_submitted_at,cover_url,word_count,hidden_by_teacher,share_status,has_unsent').eq('class_id', cls.id).order('created_at', { ascending: false })),
    q(sb.from('class_teachers').select('teacher:teachers(id,display_name,email)').eq('class_id', cls.id)),
    q(sb.from('login_guard').select('account,locked_until')),
  ]);
  const students = enr.filter(e => e.student).map(e => ({ ...e.student, seat_no: e.seat_no }))
    .sort((a, b) => (a.seat_no ?? 999) - (b.seat_no ?? 999) || a.account.localeCompare(b.account));
  return { students, notes, teachers: tch.map(t => t.teacher).filter(Boolean), guard };
}
const pct = (a, b) => (b ? Math.min(100, a / b * 100) : 0);
const statCard = (icon, tone, label, value, unit, p) => `<div class="stat-card"><div class="k"><span class="ic ${tone}">${ICON[icon]}</span>${label}</div>
  <div class="v">${value}<small>${unit}</small></div><div class="bar ${tone}"><i style="width:${p}%"></i></div></div>`;
function classHeader(cls, data, tab) {
  const pendN = data.notes.filter(n => n.share_status === 'pending').length;
  const tabs = [['blogs', '學生部落格'], ['progress', '進度一覽'], ['share', `公開審核${pendN ? `<span class="cnt">${pendN}</span>` : ''}`], ['roster', '名單與帳號'], ['portfolio', '作品集'], ['settings', '班級設定']];
  const wk = curWeek(cls);
  const st = data.students.map(s => weekStatus(cls, data.notes.filter(n => n.student_id === s.id), wk));
  const total = data.students.length || 0;
  const done = st.filter(x => x === 'd').length;
  const todo = st.filter(x => x === 'n').length, draft = st.filter(x => x === 'r').length;
  const avg = total ? data.notes.filter(n => n.submitted_at).length / total : 0;
  return topbar([['我的班級', '#/'], [cls.name]]) + `
  <div class="wrap">
    <div class="class-head"><div><h1 class="pg">${esc(cls.name)}${cls.archived ? ` <span style="vertical-align:middle;font-size:18px">${tagArch('已封存')}</span>` : ''}</h1>
      <p class="sub" style="margin:0">${total} 位學生・${esc(data.teachers.map(t => t.display_name).join('、'))}・現在是第 ${wk} 週（${weekRange(cls, wk)}）</p></div></div>
    <nav class="ctabs">${tabs.map(([k, l]) => `<a href="#/c/${cls.id}${k === 'blogs' ? '' : '/' + k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav>
    ${tab === 'blogs' || tab === 'progress' ? `<div class="stats">
      ${statCard('check', 'green', '本週已送出', done, ` / ${total} 人`, pct(done, total))}
      ${statCard('clock', 'honey', '本週還沒寫', todo, ' 人', pct(todo, total))}
      ${statCard('pen', 'sky', '寫了草稿、還沒送出', draft, ' 人', pct(draft, total))}
      ${statCard('mountain', 'lilac', '全班平均', avg.toFixed(1), ' 篇 / 人', pct(avg, wk))}
    </div>` : ''}`;
}
async function viewTeacherClass(cls, tab) {
  const data = await loadClassData(cls);
  const head = classHeader(cls, data, tab);
  const wk = curWeek(cls);
  if (tab === 'blogs') {
    const tiles = data.students.map(s => {
      const mine = data.notes.filter(n => n.student_id === s.id);
      const sent = mine.filter(n => n.submitted_at).sort((a, b) => (b.submitted_at > a.submitted_at ? 1 : -1));
      const latest = sent[0];
      const st = weekStatus(cls, mine, wk);
      const badge = st === 'd' ? tagOk('本週已送出') : st === 'r' ? tagDraft('草稿還沒送出') : tagTodo('本週還沒寫');
      const last = mine.length ? fmtD(mine.reduce((a, n) => (n.updated_at > a ? n.updated_at : a), '')) : '—';
      return `<button class="stu" data-go="#/c/${cls.id}/s/${s.id}" data-st="${st}" data-q="${esc(s.display_name + ' ' + s.name + ' ' + (s.seat_no || '') + ' ' + s.account)}">
        <div class="sthumb ${latest?.cover_url ? 'img' : grad(s.seat_no || 1)}" ${latest?.cover_url ? `style="background-image:url('${esc(latest.cover_url)}')"` : ''}>
          <div class="sav" style="background:${colorOf(s.id)}">${esc(initial(s.display_name))}</div></div>
        <div class="sb"><div class="sn">${esc(s.display_name)} <small>${s.seat_no ?? ''} 號・${esc(s.name)}</small></div>
          <div class="lt">${latest ? '最新：' + esc(latest.sub_title || latest.title) : '還沒有送出的筆記'}</div>
          <div class="sm"><span>${sent.length} 篇</span><span>・</span><span>最近更新 ${last}</span></div>${badge}</div></button>`;
    }).join('');
    app.innerHTML = head + `
      <div class="filters"><button class="chip on" data-filter="all">全部</button><button class="chip" data-filter="todo">本週還沒送出</button>
        <span class="sp"></span><input class="search" id="stuSearch" placeholder="搜尋名字或座號"></div>
      ${data.students.length ? `<div class="stu-grid" id="stuGrid">${tiles}</div>` : `<div class="empty"><b>班上還沒有學生</b><a href="#/c/${cls.id}/roster">到「名單與帳號」貼上名單</a></div>`}
    </div>`;
    app.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
      app.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('on', x === b));
      app.querySelectorAll('#stuGrid .stu').forEach(c => { c.hidden = b.dataset.filter === 'todo' && c.dataset.st === 'd'; });
    });
    const sbox = $('#stuSearch'); if (sbox) sbox.oninput = () => { const v = sbox.value.trim(); app.querySelectorAll('#stuGrid .stu').forEach(c => { c.hidden = v && !c.dataset.q.includes(v); }); };
    return;
  }
  if (tab === 'progress') {
    const W = Math.max(1, wk);
    const from = Math.max(1, W - 17);
    const cols = []; for (let i = from; i <= W; i++) cols.push(i);
    app.innerHTML = head + `
      <div class="tbl-wrap"><table class="prog">
        <thead><tr><th>座號</th><th>學生</th><th class="c">篇數</th><th>最近更新</th>${cols.map(i => `<th class="c ${i === W ? 'cur' : ''}" title="${weekRange(cls, i)}">第${i}週</th>`).join('')}</tr></thead>
        <tbody>${data.students.map(s => {
          const mine = data.notes.filter(n => n.student_id === s.id);
          const last = mine.length ? fmtD(mine.reduce((a, n) => (n.updated_at > a ? n.updated_at : a), '')) : '—';
          return `<tr data-go="#/c/${cls.id}/s/${s.id}" style="cursor:pointer"><td>${s.seat_no ?? ''}</td>
            <td><span class="nm"><span class="mini-av" style="background:${colorOf(s.id)}">${esc(initial(s.display_name))}</span>${esc(s.display_name)}<span style="color:var(--muted);font-size:15px">${esc(s.name)}</span></span></td>
            <td class="c"><b>${mine.filter(n => n.submitted_at).length}</b></td><td>${last}</td>
            ${cols.map(i => { const x = weekStatus(cls, mine, i); return `<td class="c ${i === W ? 'cur' : ''}"><span class="dot ${x}" title="${x === 'd' ? '已送出' : x === 'r' ? '草稿' : '沒寫'}"></span></td>`; }).join('')}</tr>`;
        }).join('')}</tbody></table></div>
      <div class="legend"><span><i class="dot d"></i>已送出</span><span><i class="dot r"></i>寫了草稿、還沒送出</span><span><i class="dot n"></i>沒寫</span><span>・週次以第一次送出的日期計算・點一列看那位學生的部落格</span></div>
    </div>`;
    return;
  }
  if (tab === 'share') return viewShare(cls, data, head);
  if (tab === 'roster') return viewRoster(cls, data, head);
  if (tab === 'settings') return viewSettings(cls, data, head);
}

async function viewStudentBlogAsTeacher(cls, sid) {
  const data = await loadClassData(cls);
  const idx = data.students.findIndex(s => s.id === sid);
  const s = data.students[idx];
  if (!s) { app.innerHTML = topbar([['我的班級', '#/'], [cls.name, `#/c/${cls.id}`]]) + '<div class="wrap"><div class="empty"><b>這位學生不在班上</b></div></div>'; return; }
  const mine = data.notes.filter(n => n.student_id === s.id);
  const prev = data.students[idx - 1], next = data.students[idx + 1];
  app.innerHTML = topbar([['我的班級', '#/'], [cls.name, `#/c/${cls.id}`], [s.display_name]]) + `
  <div class="wrap narrow">
    <div class="teacher-banner"><b>老師檢視</b>${esc(s.display_name)}（${s.seat_no ?? ''} 號 ${esc(s.name)}）的全部筆記，包含還沒送出的草稿。<span class="sp"></span>
      ${prev ? `<a class="ab sm" href="#/c/${cls.id}/s/${prev.id}">${ICON.prev}${esc(prev.display_name)}</a>` : ''}${next ? `<a class="ab sm" href="#/c/${cls.id}/s/${next.id}">${esc(next.display_name)}${ICON.next}</a>` : ''}</div>
    ${blogHead(s, cls)}
    <div class="sec-head"><h2>${esc(s.display_name)} 的學習筆記</h2><span class="meta">已送出 ${mine.filter(n => n.submitted_at).length} 篇・草稿 ${mine.filter(n => !n.submitted_at).length} 篇　<a class="ab sm" href="#/c/${cls.id}/portfolio?s=${s.id}">${ICON.print}作品集</a></span></div>
    ${mine.length ? `<div class="cards">${mine.map(n => noteCard(n, cls, `#/n/${n.id}`, false)).join('')}</div>` : '<div class="empty"><b>還沒有筆記</b></div>'}
  </div>`;
}

/* ---------- 老師：名單與帳號 ---------- */
function parseRoster(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const p = l.split(/\t|,|，|\s{2,}|\s+/).map(x => x.trim()).filter(Boolean);
    return { seat_no: parseInt(p[0], 10), name: p[1] || '', display_name: p.slice(2).join(' ') };
  });
}
function rocYear() { return new Date().getFullYear() - 1911 - (new Date().getMonth() < 7 ? 1 : 0); }
async function viewRoster(cls, data, head) {
  const now = new Date();
  const locked = new Set(data.guard.filter(g => g.locked_until && new Date(g.locked_until) > now).map(g => g.account));
  app.innerHTML = head + `
    ${cls.archived ? `<div class="note-banner">${ICON.archive}<span>這個班級已封存。名單還可以看，但學生不能再寫。</span></div>` : ''}
    <div class="two">
      <div class="box">
        <h3>貼上名單，建立帳號</h3>
        <p class="d">從試算表複製「座號、姓名、顯示名稱」三欄貼上，一行一位（顯示名稱可以空著，會用姓名）。帳號＝入學學年＋座號，例如 115 學年入學的 1 號是 <b>11501</b>。</p>
        <label class="fld"><span>入學學年（三位數）</span><input id="entryYear" inputmode="numeric" value="${rocYear()}" style="max-width:160px"></label>
        <textarea class="paste" id="pasteBox" placeholder="1	高雅婷	Yaki&#10;2	林志豪	Watan"></textarea>
        <div class="row-act"><button class="ab pri" id="btnCreate">建立帳號並加入班級</button></div>
        <div id="createResult"></div>
      </div>
      <div class="box">
        <h3>加入已經有帳號的學生</h3>
        <p class="d">例如升上八年級的學生：不用重開帳號，找到後加進來，舊班級的紀錄會保留。</p>
        <label class="fld"><span>搜尋帳號或姓名</span><input id="findStu" placeholder="例如：11401 或 王小明"></label>
        <div class="pick" id="pickList"></div>
        <div class="row-act"><button class="ab" id="btnAddExisting" disabled>加入勾選的學生</button></div>
      </div>
    </div>
    <div class="box">
      <div class="sec-head" style="margin:0 0 10px"><h3 style="margin:0">班上學生的帳號（${data.students.length} 位）</h3>
        <div class="row-act" style="margin:0"><a class="ab dark" href="#/c/${cls.id}/cards">${ICON.print}印登入卡</a></div></div>
      ${data.students.length ? `<div style="overflow-x:auto"><table class="acct">
        <thead><tr><th>座號</th><th>姓名</th><th>顯示名稱</th><th>帳號</th><th>登入卡密碼</th><th>狀態</th><th></th></tr></thead>
        <tbody>${data.students.map(s => `<tr><td>${s.seat_no ?? ''}</td><td>${esc(s.name)}</td><td>${esc(s.display_name)}</td><td class="mono">${esc(s.account)}</td>
          <td>${s.card_password ? '<span style="color:var(--green)">有（可印卡）</span>' : '<span style="color:var(--muted)">學生已自己改密碼</span>'}</td>
          <td>${locked.has(s.account) ? `<span class="wk lock">${ICON.lock}暫停登入</span> <button class="ab sm" data-unlock="${s.id}">解除</button>` : '<span style="color:var(--green)">正常</span>'}</td>
          <td style="white-space:nowrap"><button class="ab sm" data-edit="${s.id}">修改</button> <button class="ab sm" data-reset="${s.id}">重設密碼</button> <button class="ab sm danger" data-remove="${s.id}">移出</button></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="d">還沒有學生。</p>'}
    </div>
  </div>`;

  $('#btnCreate').onclick = async () => {
    const rows = parseRoster($('#pasteBox').value);
    const year = $('#entryYear').value.trim();
    const out = $('#createResult');
    if (!rows.length) { out.innerHTML = '<div class="msg err">請先貼上名單</div>'; return; }
    const bad = rows.filter(r => !(r.seat_no >= 1 && r.seat_no <= 99) || !r.name);
    if (bad.length) { out.innerHTML = `<div class="msg err">有 ${bad.length} 行看不懂（第一欄要是座號數字，第二欄是姓名）。</div>`; return; }
    const ok = await confirmBox('建立帳號', `<p>要建立 <b>${rows.length}</b> 個帳號，帳號從 <b>${esc(year)}${String(rows[0].seat_no).padStart(2, '0')}</b> 開始。</p>
      <table class="result-tbl"><tr><th>座號</th><th>姓名</th><th>顯示名稱</th><th>帳號</th></tr>${rows.slice(0, 12).map(r => `<tr><td>${r.seat_no}</td><td>${esc(r.name)}</td><td>${esc(r.display_name || r.name)}</td><td class="mono">${esc(year)}${String(r.seat_no).padStart(2, '0')}</td></tr>`).join('')}${rows.length > 12 ? `<tr><td colspan="4">⋯還有 ${rows.length - 12} 位</td></tr>` : ''}</table>`, '建立');
    if (!ok) return;
    const btn = $('#btnCreate'); btn.disabled = true; btn.textContent = '建立中⋯（每位約 1 秒）';
    try {
      const r = await callFn('manage', { action: 'create_students', class_id: cls.id, entry_year: year, rows });
      const good = r.results.filter(x => x.ok), badR = r.results.filter(x => !x.ok);
      await infoBox('建立完成', `<p>成功 <b>${good.length}</b> 位${badR.length ? `，沒有成功 <b style="color:var(--accent-d)">${badR.length}</b> 位` : ''}。</p>
        ${badR.length ? `<table class="result-tbl"><tr><th>座號</th><th>姓名</th><th>原因</th></tr>${badR.map(x => `<tr><td>${x.seat_no ?? ''}</td><td>${esc(x.name)}</td><td>${esc(x.message)}</td></tr>`).join('')}</table>` : ''}
        <p>接著可以按「印登入卡」，把帳號密碼發給學生。</p>`);
      route();
    } catch (e) { $('#createResult').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; btn.disabled = false; btn.textContent = '建立帳號並加入班級'; }
  };

  let found = [];
  const enrolled = new Set(data.students.map(s => s.id));
  $('#findStu').oninput = async e => {
    const v = e.target.value.trim(); const list = $('#pickList');
    if (v.length < 1) { list.innerHTML = ''; $('#btnAddExisting').disabled = true; return; }
    const pat = `%${v.replace(/[%_,()]/g, '')}%`;
    found = (await q(sb.from('students').select('id,account,name,display_name').or(`account.ilike.${pat},name.ilike.${pat},display_name.ilike.${pat}`).limit(20))).filter(s => !enrolled.has(s.id));
    list.innerHTML = found.length ? found.map(s => `<label><input type="checkbox" value="${s.id}"> <span class="mono">${esc(s.account)}</span> ${esc(s.name)}（${esc(s.display_name)}）</label>`).join('') : '<p class="d" style="margin:0">找不到（或已經在班上）</p>';
    list.onchange = () => { $('#btnAddExisting').disabled = !list.querySelector('input:checked'); };
  };
  $('#btnAddExisting').onclick = async () => {
    const ids = [...app.querySelectorAll('#pickList input:checked')].map(i => i.value);
    try {
      await q(sb.from('enrollments').insert(ids.map(id => ({ class_id: cls.id, student_id: id, seat_no: parseInt((found.find(s => s.id === id)?.account || '').slice(-2), 10) || null }))));
      toast(`已加入 ${ids.length} 位學生`); route();
    } catch (e) { toast('加入沒有成功：' + e.message); }
  };
  app.querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => {
    const s = data.students.find(x => x.id === b.dataset.reset);
    if (!await confirmBox('重設密碼', `<p>要幫 <b>${esc(s.display_name)}</b>（${esc(s.account)}）產生新的 6 位數密碼嗎？舊密碼會失效，也會解除暫停登入。</p>`, '重設')) return;
    try {
      const r = await callFn('manage', { action: 'reset_password', student_id: s.id });
      await infoBox('新密碼', `<p>${esc(s.display_name)}（帳號 <b class="mono">${esc(s.account)}</b>）的新密碼是：</p><p style="font-size:34px;font-weight:700;letter-spacing:.1em" class="mono">${esc(r.password)}</p><p><a href="#/c/${cls.id}/cards?only=${s.id}" data-ok="1">印這位學生的登入卡</a></p>`);
      route();
    } catch (e) { toast(e.message); }
  });
  app.querySelectorAll('[data-unlock]').forEach(b => b.onclick = async () => {
    try { await callFn('manage', { action: 'unlock', student_id: b.dataset.unlock }); toast('已解除暫停'); route(); } catch (e) { toast(e.message); }
  });
  app.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
    const s = data.students.find(x => x.id === b.dataset.edit);
    const r = await modal(`<h2>修改學生資料</h2><form>
      <label class="fld"><span>座號（這個班）</span><input name="seat_no" inputmode="numeric" value="${s.seat_no ?? ''}"></label>
      <label class="fld"><span>姓名（只有老師看得到）</span><input name="name" value="${esc(s.name)}" required></label>
      <label class="fld"><span>顯示名稱（部落格上用這個）</span><input name="display_name" value="${esc(s.display_name)}" required></label>
      <p class="d" style="color:var(--muted);font-size:15px">帳號 ${esc(s.account)} 不會改變。</p>
      <div class="actions"><button class="sbtn" data-close type="button">取消</button><button class="pbtn" type="submit">儲存</button></div></form>`);
    if (!r) return;
    try {
      await q(sb.from('students').update({ name: r.name.trim(), display_name: r.display_name.trim() }).eq('id', s.id));
      await q(sb.from('enrollments').update({ seat_no: parseInt(r.seat_no, 10) || null }).eq('class_id', cls.id).eq('student_id', s.id));
      toast('已儲存'); route();
    } catch (e) { toast('儲存沒有成功：' + e.message); }
  });
  app.querySelectorAll('[data-remove]').forEach(b => b.onclick = async () => {
    const s = data.students.find(x => x.id === b.dataset.remove);
    if (!await confirmBox('移出班級', `<p>要把 <b>${esc(s.display_name)}</b> 移出「${esc(cls.name)}」嗎？</p><p>帳號和已經寫的筆記都會保留，之後可以再用「加入已經有帳號的學生」加回來。</p>`, '移出', true)) return;
    try { await q(sb.from('enrollments').delete().eq('class_id', cls.id).eq('student_id', s.id)); toast('已移出'); route(); } catch (e) { toast(e.message); }
  });
}

/* ---------- 老師：班級設定 ---------- */
async function viewSettings(cls, data, head) {
  app.innerHTML = head + `
    <div class="two">
      <div class="box">
        <h3>班級資料</h3>
        <form id="fCls">
          <label class="fld"><span>班級名稱</span><input name="name" value="${esc(cls.name)}" required></label>
          <label class="fld"><span>學期</span><input name="term" value="${esc(cls.term)}"></label>
          <label class="fld"><span>第 1 週從哪一天開始</span><input name="start_date" type="date" value="${esc(cls.start_date)}" required></label>
          <button class="ab pri" type="submit">儲存</button>
        </form>
      </div>
      <div class="box">
        <h3>共同授課老師</h3>
        <p class="d">每位老師用自己的帳號登入，都能看全班的筆記、管理名單。</p>
        <ul class="teachers">${data.teachers.map(t => `<li><span class="mini-av" style="background:${TEACHER_COLOR}">${esc(initial(t.display_name))}</span>${esc(t.display_name)}<span style="color:var(--muted);font-size:15px">${esc(t.email)}</span><span class="sp" style="flex:1"></span>
          ${t.id !== S.uid && data.teachers.length > 1 ? `<button class="ab sm" data-rmt="${t.id}">移除</button>` : ''}</li>`).join('')}</ul>
        <form id="fAddT"><label class="fld"><span>加入老師（輸入老師帳號的 email）</span><input name="email" type="email" placeholder="teacher@tmail.ilc.edu.tw" required></label>
        <button class="ab" type="submit">加入</button></form>
        ${S.me.is_admin ? '<p class="d" style="margin-top:10px">老師還沒有帳號？到右上角「管理」新增。</p>' : '<p class="d" style="margin-top:10px">對方要先有老師帳號（請管理者新增）。</p>'}
      </div>
    </div>
    <div class="box">
      <h3>${cls.archived ? '取消封存' : '學期結束：封存班級'}</h3>
      <p class="d">${cls.archived ? '取消封存後，學生又可以新增和修改筆記。' : '封存後，學生不能再新增或修改這個班級的筆記，但作品都會保留，老師和學生都還看得到。'}</p>
      <button class="ab ${cls.archived ? '' : 'danger'}" id="btnArchive">${ICON.archive}${cls.archived ? '取消封存' : '封存這個班級'}</button>
    </div>
    ${cls.created_by === S.uid || S.me.is_admin ? `<div class="box danger-box">
      <h3>刪除班級</h3>
      <p class="d">把這個班級和全班的筆記、照片<b>永久刪除</b>，刪了就找不回來。只是學期結束的話，請用上面的「封存」。適合用在測試班或開錯的班級。</p>
      <button class="ab danger" id="btnDelClass">${ICON.trash}刪除這個班級</button>
    </div>` : ''}
  </div>`;
  $('#fCls').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try { await q(sb.from('classes').update({ name: f.name.trim(), term: f.term.trim(), start_date: f.start_date }).eq('id', cls.id)); toast('已儲存'); route(); } catch (err) { toast('儲存沒有成功：' + err.message); }
  };
  $('#fAddT').onsubmit = async e => {
    e.preventDefault(); const email = String(new FormData(e.target).get('email')).trim().toLowerCase();
    try {
      const t = await q(sb.from('teachers').select('id,display_name').eq('email', email).maybeSingle());
      if (!t) { toast('找不到這個老師帳號'); return; }
      await q(sb.from('class_teachers').insert({ class_id: cls.id, teacher_id: t.id }));
      toast(`已加入 ${t.display_name} 老師`); route();
    } catch (err) { toast(/duplicate/.test(err.message) ? '這位老師已經在班上了' : '加入沒有成功：' + err.message); }
  };
  app.querySelectorAll('[data-rmt]').forEach(b => b.onclick = async () => {
    if (!await confirmBox('移除老師', '<p>移除後，這位老師就看不到這個班級。</p>', '移除', true)) return;
    try { await q(sb.from('class_teachers').delete().eq('class_id', cls.id).eq('teacher_id', b.dataset.rmt)); toast('已移除'); route(); } catch (e) { toast(e.message); }
  });
  const del = $('#btnDelClass');
  if (del) del.onclick = async () => {
    del.disabled = true;
    let info;
    try { info = await callFn('manage', { action: 'delete_class', class_id: cls.id, preview: true }); }
    catch (e) { toast(e.message); del.disabled = false; return; }
    del.disabled = false;
    const r = await modal(`<h2>永久刪除「${esc(cls.name)}」？</h2><form>
      <p>會一起刪掉：全班 <b>${info.notes}</b> 篇筆記和裡面的照片、名單（${info.students} 位學生）、班級展示牆。<b>刪了就找不回來。</b></p>
      ${info.only_here ? `<label class="chk" style="align-items:flex-start"><input type="checkbox" name="delete_students" checked style="margin-top:4px"><span>同時刪除 <b>${info.only_here}</b> 個只在這個班的學生帳號（帳號編號可以再拿來用）。<br><span style="color:var(--muted);font-size:15px">有在其他班的學生，帳號會保留。</span></span></label>` : ''}
      <label class="fld"><span>請輸入班級名稱「${esc(cls.name)}」確認</span><input name="confirm_name" autocomplete="off" required></label>
      <div class="actions"><button class="sbtn" data-close type="button">取消</button><button class="dbtn" type="submit">永久刪除</button></div></form>`);
    if (!r) return;
    if (String(r.confirm_name || '').trim() !== cls.name) { toast('班級名稱打得不一樣，沒有刪除'); return; }
    try {
      toast('刪除中⋯');
      const out = await callFn('manage', { action: 'delete_class', class_id: cls.id, confirm_name: r.confirm_name.trim(), delete_students: !!r.delete_students });
      await infoBox('已刪除', `<p>「${esc(cls.name)}」已經刪除：筆記 ${out.deleted_notes} 篇、照片 ${out.deleted_files} 張${out.deleted_students ? `、學生帳號 ${out.deleted_students} 個` : ''}。</p>`);
      location.hash = '#/';
    } catch (e) { toast('刪除沒有成功：' + e.message); }
  };
  $('#btnArchive').onclick = async () => {
    if (!cls.archived && !await confirmBox('封存班級', `<p>確定要封存「${esc(cls.name)}」嗎？封存後學生只能看、不能改。之後可以再取消封存。</p>`, '封存', true)) return;
    try { await q(sb.from('classes').update({ archived: !cls.archived }).eq('id', cls.id)); toast(cls.archived ? '已取消封存' : '已封存'); route(); } catch (e) { toast(e.message); }
  };
}

/* ---------- 登入卡 ---------- */
function qrSVG(text) {
  try { const qr = qrcode(0, 'M'); qr.addData(text); qr.make(); return qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); }
  catch (e) { return ''; }
}
async function viewCards(cid, params) {
  loading();
  const cls = await loadClass(cid);
  const data = await loadClassData(cls);
  let list = data.students;
  if (params.only) list = list.filter(s => s.id === params.only);
  const card = s => {
    const url = `${CFG.publicUrl}#/login?u=${encodeURIComponent(s.account)}&p=${encodeURIComponent(s.card_password || '')}`;
    return `<div class="lc"><div class="info">
      <div class="school">${esc(CFG.school)}</div><div class="plat">${esc(CFG.site)}</div>
      <div class="nm">${esc(s.name)}</div><div class="no">${esc(cls.name)}・${s.seat_no ?? ''} 號</div>
      <div class="kv">帳號<b>${esc(s.account)}</b></div>
      <div class="kv" style="margin-top:4px">密碼<b>${s.card_password ? esc(s.card_password) : '<span style="font-size:15px;font-family:inherit">（已自己改過）</span>'}</b></div>
    </div>${s.card_password ? `<div class="qr">${qrSVG(url)}掃描直接登入</div>` : ''}</div>`;
  };
  app.innerHTML = topbar([['我的班級', '#/'], [cls.name, `#/c/${cls.id}/roster`], ['登入卡']]) + `
  <div class="wrap">
    <div class="print-bar"><h1 class="pg" style="margin:0">登入卡</h1><span class="sp" style="flex:1"></span>
      <a class="back-link" href="#/c/${cls.id}/roster">${ICON.back}回到名單與帳號</a>
      <button class="ab dark" data-act="print">${ICON.print}列印（A4，一頁 8 張）</button></div>
    <p class="sub">剪下來發給學生。QR code 裡有帳號和密碼，用 Chromebook 的相機掃描就會直接登入；請學生收好、不要拍照上網。學生自己改過密碼的，卡上不會有 QR code。</p>
    ${list.length ? `<div class="sheet">${list.map(card).join('')}</div>` : '<div class="empty"><b>沒有學生</b></div>'}
  </div>`;
}

/* ---------- 一篇筆記 ---------- */
async function viewNote(id, params) {
  loading();
  const n = await q(sb.from('notes').select('*').eq('id', id).maybeSingle());
  if (!n) { app.innerHTML = topbar([]) + '<div class="wrap"><div class="empty"><b>找不到這篇筆記</b><a href="#/">回到我的班級</a></div></div>'; return; }
  const cls = await loadClass(n.class_id);
  const isOwner = n.student_id === S.uid;
  let student;
  if (isOwner) {
    const e = await q(sb.from('enrollments').select('seat_no').eq('class_id', cls.id).eq('student_id', S.uid).maybeSingle());
    student = { id: S.uid, display_name: S.me.display_name, seat_no: e?.seat_no };
  } else {
    const s = await q(sb.from('students').select('id,display_name,name').eq('id', n.student_id).maybeSingle());
    const e = await q(sb.from('enrollments').select('seat_no').eq('class_id', cls.id).eq('student_id', n.student_id).maybeSingle());
    student = { ...s, seat_no: e?.seat_no };
  }
  const sent = !!n.submitted_at;
  const showDraft = !sent;
  const title = (sent ? n.sub_title : n.title) || '（還沒有標題）';
  const html = sent ? n.sub_html : n.content_html;
  const back = isOwner ? `#/c/${cls.id}` : `#/c/${cls.id}/s/${n.student_id}`;
  const crumbs = isOwner ? [[cls.name, back], [title]] : [['我的班級', '#/'], [cls.name, `#/c/${cls.id}`], [student.display_name, back], [title]];
  app.innerHTML = topbar(crumbs) + `
  <div class="wrap read">
    ${blogHead(student, cls)}
    <div class="post-bar"><a class="back-link" href="${back}">${ICON.back}回到${isOwner ? '我的' : ' ' + esc(student.display_name) + ' 的'}學習紀錄頁</a>
      ${isOwner && !cls.archived ? `<span class="acts"><a class="ab sm" href="#/e/${n.id}">${ICON.pen}修改</a><button class="ab sm danger" data-act="delNote" data-id="${n.id}" data-back="${back}">${ICON.trash}刪除</button></span>` : ''}</div>
    ${showDraft ? `<div class="note-banner">${ICON.pen}<span>這篇還是<b>草稿</b>，還沒送出${isOwner ? '' : '（學生還在寫）'}。</span></div>` : ''}
    ${!showDraft && hasUnsent(n) ? `<div class="note-banner">${ICON.info}<span>${isOwner ? '你有修改還沒送出。這裡顯示的是上次送出的版本。' : '學生有新的修改還沒送出；這裡顯示的是上次送出的版本。'}</span></div>` : ''}
    ${sharePanel(n, cls, isOwner)}
    <article class="post">
      <div class="post-meta"><span class="tag">${ICON.book}學習筆記</span><span>第 ${Math.max(1, weekNo(cls, n.first_submitted_at || n.created_at))} 週・${fmtFull(n.submitted_at || n.updated_at)}</span><span>·</span><span>${n.word_count} 字</span></div>
      <h1 class="post-title">${esc(title)}</h1>
      <div class="doc post-body" id="postBody"></div>
    </article>
  </div>`;
  renderDoc($('#postBody'), html, params.hl);
}
function sharePanel(n, cls, isOwner) {
  const st = n.submitted_at ? n.share_status : 'unsent';
  const btn = (to, label, pri) => cls.archived ? '' : `<button class="ab sm ${pri ? 'pri' : ''}" data-act="share" data-to="${to}" data-id="${n.id}">${label}</button>`;
  const wall = `<a class="ab sm" href="${wallHash(cls)}">${ICON.globe}看班級展示牆</a>`;
  const T = isOwner ? {
    unsent: ['none', ICON.lock, '只有你和老師看得到', '送出之後，可以申請公開到班級展示牆。', ''],
    none: ['none', ICON.lock, '只有你和老師看得到', '想讓家長和大家看到，可以申請公開；老師通過後，會放到班級展示牆。', btn('pending', `${ICON.globe}申請公開`, true)],
    pending: ['pending', ICON.hourglass, '已申請公開，等老師審核', '老師通過後，就會出現在班級展示牆。', btn('none', '取消申請')],
    approved: ['approved', ICON.globe, '已公開在班級展示牆', '家長和拿到展示牆網址的人都看得到。之後再修改送出，要重新等老師審核。', wall + btn('none', '不公開了')],
    rejected: ['rejected', ICON.x, '老師沒有通過公開申請', '可以修改後再申請一次。', btn('pending', '再申請一次')],
  } : {
    unsent: ['none', ICON.lock, '只有學生和老師看得到', '還沒送出。', ''],
    none: ['none', ICON.lock, '只有學生和老師看得到', '學生沒有申請公開。', ''],
    pending: ['pending', ICON.hourglass, '學生申請公開', '通過後會放到班級展示牆，家長不用登入就看得到（顯示學生真名）。', btn('approved', `${ICON.check}通過公開`, true) + btn('rejected', '不通過')],
    approved: ['approved', ICON.globe, '已公開在班級展示牆', '', wall + btn('none', '取消公開')],
    rejected: ['rejected', ICON.x, '沒有通過公開', '學生可以修改後再申請。', ''],
  };
  const [tone, ic, title, desc, acts] = T[st] || T.none;
  return `<div class="share-box s-${tone}">${ic}<div class="sx"><b>${title}</b>${desc ? `<span>${desc}</span>` : ''}</div>${acts ? `<div class="sa">${acts}</div>` : ''}</div>`;
}
const SHARE_MSG = { pending: '已申請公開，等老師審核', none: '已改成只有自己看得到', approved: '已通過，放到班級展示牆了', rejected: '已設為不通過' };
async function setShare(id, to) {
  try {
    const r = await q(sb.from('notes').update({ share_status: to }).eq('id', id).select('share_status').single());
    if (r.share_status !== to) throw new Error('狀態沒有改變，請重新整理再試一次');
    toast(SHARE_MSG[to] || '已更新'); route();
  } catch (e) { toast('沒有成功：' + e.message); }
}

/* ---------- 老師：公開審核 ---------- */
function viewShare(cls, data, head) {
  const stu = id => data.students.find(s => s.id === id) || { display_name: '?', name: '' };
  const row = (n, acts) => { const s = stu(n.student_id); return `<div class="rv"><span class="mini-av" style="background:${colorOf(s.id)}">${esc(initial(s.display_name))}</span>
    <div class="rvm"><b>${esc(n.sub_title || n.title || '（沒有標題）')}</b><span>${esc(s.name)}（${esc(s.display_name)}）・第 ${Math.max(1, weekNo(cls, n.first_submitted_at || n.created_at))} 週・送出 ${fmtD(n.submitted_at)}</span></div>
    <div class="rva"><a class="ab sm" href="#/n/${n.id}">看內容</a>${acts(n)}</div></div>`; };
  const by = st => data.notes.filter(n => n.share_status === st).sort((a, b) => (b.submitted_at > a.submitted_at ? 1 : -1));
  const pending = by('pending'), pub = by('approved'), rej = by('rejected');
  const url = wallUrl(cls);
  const ro = cls.archived;
  app.innerHTML = head + `
    <div class="box wall-box"><div class="wl">
      <h3>${ICON.globe} 班級展示牆網址</h3>
      <p class="d">家長不用登入，打開網址就能看全班「已公開」的筆記，顯示學生真名。網址裡有一串猜不到的代碼，也設定不讓 Google 搜尋到。</p>
      <div class="url-row"><input class="url" readonly value="${esc(url)}" id="wallUrl" aria-label="班級展示牆網址"><button class="ab sm" id="btnCopy">${ICON.copy}複製</button><a class="ab sm" href="${wallHash(cls)}">${ICON.open}開啟</a></div>
      <div class="row-act"><a class="ab sm" href="#/c/${cls.id}/wallcard">${ICON.print}印 QR code 給家長</a>
        <button class="ab sm danger" id="btnNewToken">${ICON.refresh}換一個網址</button></div>
    </div><div class="wq">${qrSVG(url)}<span>掃描看展示牆</span></div></div>

    <div class="sec-head"><h2>等老師審核（${pending.length}）</h2>${ro ? tagArch('班級已封存') : ''}</div>
    ${pending.length ? `<div class="rv-list">${pending.map(n => row(n, n => ro ? '' : `<button class="ab sm pri" data-act="share" data-to="approved" data-id="${n.id}">${ICON.check}通過</button><button class="ab sm" data-act="share" data-to="rejected" data-id="${n.id}">不通過</button>`)).join('')}</div>`
      : '<div class="empty">目前沒有要審核的筆記。</div>'}
    <div class="sec-head"><h2>已公開（${pub.length}）</h2></div>
    ${pub.length ? `<div class="rv-list">${pub.map(n => row(n, n => ro ? '' : `<button class="ab sm" data-act="share" data-to="none" data-id="${n.id}">取消公開</button>`)).join('')}</div>`
      : '<div class="empty">還沒有公開的筆記。</div>'}
    ${rej.length ? `<div class="sec-head"><h2>沒有通過（${rej.length}）</h2><span class="meta">學生修改後可以再申請</span></div><div class="rv-list">${rej.map(n => row(n, () => '')).join('')}</div>` : ''}
  </div>`;
  $('#btnCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(url); toast('網址已複製'); }
    catch (e) { const i = $('#wallUrl'); i.select(); document.execCommand('copy'); toast('網址已複製'); }
  };
  $('#btnNewToken').onclick = async () => {
    if (!await confirmBox('換一個展示牆網址', '<p>換了以後，<b>舊的網址和 QR code 就打不開了</b>，要把新網址重新發給家長。網址外流時才需要換。</p>', '換網址', true)) return;
    try { await q(sb.from('classes').update({ public_token: crypto.randomUUID() }).eq('id', cls.id)); toast('已換成新網址'); route(); }
    catch (e) { toast('沒有成功：' + e.message); }
  };
}
async function viewWallCard(cid) {
  loading();
  const cls = await loadClass(cid);
  const url = wallUrl(cls);
  const one = `<div class="wc"><div class="school">${esc(CFG.school)}・${esc(CFG.site)}</div><div class="wct">${esc(cls.name)}</div><div class="wcs">班級展示牆</div>
    <div class="wcq">${qrSVG(url)}</div><div class="wcd">用手機相機掃描 QR code，就能看到孩子們公開的學習筆記，不用登入。</div><div class="wcu">${esc(url)}</div></div>`;
  app.innerHTML = topbar([['我的班級', '#/'], [cls.name, `#/c/${cls.id}/share`], ['展示牆 QR code']]) + `
  <div class="wrap">
    <div class="print-bar"><h1 class="pg" style="margin:0">展示牆 QR code</h1><span class="sp" style="flex:1"></span>
      <a class="back-link" href="#/c/${cls.id}/share">${ICON.back}回到公開審核</a>
      <button class="ab dark" data-act="print">${ICON.print}列印（A4，一頁 4 張）</button></div>
    <p class="sub no-print">剪下來發給家長，或貼在聯絡簿上。</p>
    <div class="sheet wsheet">${one.repeat(4)}</div>
  </div>`;
}

/* ---------- 公開頁（免登入）：班級展示牆、公開的筆記 ---------- */
const avatarOfKey = k => COLORS[parseInt(String(k).slice(0, 6), 16) % COLORS.length];
function publicTop(token, label) {
  return `<header class="top"><div class="top-in">
    <a class="abrand" href="#/p/${esc(token)}" title="${esc(CFG.site)}"><span class="logo">${logo}</span><span class="bt">${esc(CFG.site)}</span></a>
    <nav class="crumb" aria-label="目前位置"><span class="cp on" aria-current="page">${esc(label)}</span></nav>
    <span class="sp"></span>
    ${S.uid ? `<a class="link" href="#/">${ICON.back}<span class="wn">回到我的班級</span></a>` : `<span class="pub-school">${esc(CFG.school)}</span>`}
  </div></header>`;
}
function publicMissing(token) {
  app.innerHTML = publicTop(token, '班級展示牆') + `<div class="wrap read"><div class="empty"><b>找不到這個頁面</b>網址可能已經換了，或這篇筆記已經不公開。請向老師索取新的網址。</div></div>`;
}
async function viewPublicWall(token) {
  loading();
  const { data, error } = await sb.rpc('public_wall', { token });
  if (error || !data) return publicMissing(token);
  const cls = data.class, notes = data.notes || [];
  document.title = `${cls.name}・班級展示牆｜${CFG.site}`;
  const kids = [];
  for (const n of notes) if (!kids.find(k => k.key === n.student_key)) kids.push({ key: n.student_key, name: n.name, seat: n.seat_no ?? 999 });
  kids.sort((a, b) => a.seat - b.seat);
  const card = n => {
    const wk = Math.max(1, weekNo(cls, n.first_submitted_at));
    const pill = `<span class="pill">第 ${wk} 週</span>`;
    const th = n.cover_url ? `<div class="thumb img" style="background-image:url('${esc(n.cover_url)}')">${pill}</div>` : `<div class="thumb ${grad(wk)}"><span class="badge">${ICON.book}</span>${pill}</div>`;
    return `<button class="card" data-go="#/p/${esc(token)}/${n.id}" data-k="${n.student_key}">${th}<div class="cb">
      <div class="by"><span class="mini-av" style="background:${avatarOfKey(n.student_key)}">${esc(initial(n.name))}</span>${esc(n.name)}</div>
      <div class="ctitle">${esc(n.title || '（沒有標題）')}</div><div class="cex">${esc(n.excerpt || '')}</div>
      <div class="cfoot"><span>第 ${wk} 週・${fmtD(n.first_submitted_at)}</span><span>${n.word_count} 字</span></div></div></button>`;
  };
  app.innerHTML = publicTop(token, '班級展示牆') + `
  <div class="wrap">
    <section class="blog-head"><div class="cover"></div><div class="profile">
      <div class="avatar wall-av">${logo}</div>
      <div class="who"><div class="blog-name">${esc(cls.name)}・班級展示牆</div><div class="blog-sub">${esc(CFG.school)}${cls.term ? '・' + esc(cls.term) : ''}・公開的學習筆記 ${notes.length} 篇</div></div>
    </div></section>
    ${notes.length ? `<div class="filters" style="margin-top:24px"><button class="chip on" data-k="">全部</button>${kids.map(k => `<button class="chip" data-k="${k.key}">${esc(k.name)}</button>`).join('')}</div>
      <div class="cards" id="wallCards">${notes.map(card).join('')}</div>`
      : '<div class="empty" style="margin-top:24px"><b>還沒有公開的筆記</b>學生申請公開、老師通過後，就會出現在這裡。</div>'}
  </div>`;
  app.querySelectorAll('.chip[data-k]').forEach(b => b.onclick = () => {
    app.querySelectorAll('.chip[data-k]').forEach(x => x.classList.toggle('on', x === b));
    app.querySelectorAll('#wallCards .card').forEach(c => { c.hidden = !!b.dataset.k && c.dataset.k !== b.dataset.k; });
  });
}
async function viewPublicNote(token, id) {
  loading();
  const { data, error } = await sb.rpc('public_note', { token, note: id });
  if (error || !data) return publicMissing(token);
  const cls = data.class, n = data.note;
  document.title = `${n.title || '學習筆記'}｜${cls.name}`;
  app.innerHTML = publicTop(token, '班級展示牆') + `
  <div class="wrap read">
    <div class="post-bar"><a class="back-link" href="#/p/${esc(token)}">${ICON.back}回到 ${esc(cls.name)} 班級展示牆</a></div>
    <article class="post">
      <div class="post-meta"><span class="tag">${ICON.book}學習筆記</span><span class="by"><span class="mini-av" style="background:${avatarOfKey(n.student_key)}">${esc(initial(n.name))}</span>${esc(n.name)}</span>
        <span>第 ${Math.max(1, weekNo(cls, n.first_submitted_at))} 週・${fmtFull(n.submitted_at)}</span><span>·</span><span>${n.word_count} 字</span></div>
      <h1 class="post-title">${esc(n.title || '（沒有標題）')}</h1>
      <div class="doc post-body" id="postBody"></div>
    </article>
  </div>`;
  renderDoc($('#postBody'), n.html);
}

function renderDoc(el, html, hl) {
  el.innerHTML = '';
  // 一律清理後再顯示，避免有人塞進不安全的內容
  const frag = window.__editor ? window.__editor.sanitize(html || '') : document.createTextNode('');
  el.appendChild(frag);
  if (!el.textContent.trim() && !el.querySelector('img,table,.video-wrap')) el.innerHTML = '<p style="color:var(--muted)">（還沒有內容）</p>';
  // 影片：先顯示封面，按了才載入播放器
  el.querySelectorAll('.video-wrap').forEach(v => {
    v.removeAttribute('contenteditable');
    const spec = v.getAttribute('data-video') || '', id = spec.slice(3), box = v.querySelector('.vbox');
    if (!box) return;
    const src = spec.startsWith('yt:') ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : `https://drive.google.com/file/d/${id}/preview`;
    box.setAttribute('role', 'button'); box.tabIndex = 0; box.setAttribute('aria-label', '播放影片');
    const play = () => { const f = document.createElement('iframe'); f.src = src; f.title = '影片'; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true; box.replaceWith(f); };
    box.addEventListener('click', play);
    box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  });
  if (hl) {
    const w = String(hl);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node, first = null; const nodes = [];
    while ((node = walker.nextNode())) nodes.push(node);
    for (const t of nodes) {
      const i = t.data.toLowerCase().indexOf(w.toLowerCase()); if (i < 0) continue;
      const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + w.length);
      const m = document.createElement('mark'); r.surroundContents(m); if (!first) first = m;
    }
    if (first) setTimeout(() => first.scrollIntoView({ block: 'center', behavior: 'smooth' }), 200);
  }
}
async function delNote(id, back) {
  if (!await confirmBox('刪除這篇筆記', '<p>刪除後就找不回來了，確定要刪除嗎？</p>', '刪除', true)) return;
  try {
    const n = await q(sb.from('notes').select('class_id,student_id').eq('id', id).maybeSingle());
    await q(sb.from('notes').delete().eq('id', id));
    if (n) {   // 照片一起清掉（失敗不影響刪除筆記）
      try {
        const dir = `${n.class_id}/${n.student_id}/${id}`;
        const { data: files } = await sb.storage.from(BUCKET).list(dir, { limit: 1000 });
        if (files && files.length) await sb.storage.from(BUCKET).remove(files.map(f => `${dir}/${f.name}`));
      } catch (e) { console.warn(e); }
    }
    toast('已刪除'); location.hash = back;
  } catch (e) { toast('刪除沒有成功：' + e.message); }
}

/* ---------- 編輯頁 ---------- */
let editing = null;
async function viewEditor(id) {
  loading('打開筆記中⋯');
  const n = await q(sb.from('notes').select('*').eq('id', id).maybeSingle());
  if (!n || n.student_id !== S.uid) { location.hash = n ? `#/n/${id}` : '#/'; return; }
  const cls = await loadClass(n.class_id);
  if (cls.archived) { toast('班級已封存，不能再修改'); location.hash = `#/n/${id}`; return; }
  editing = { note: n, cls };
  app.hidden = true;
  $('#editorView').hidden = false;
  document.title = (n.title || '寫筆記') + '｜' + CFG.site;
  const patch = d => ({ title: d.title, content_html: d.html, content_text: d.text, word_count: d.words, cover_url: d.thumb });
  window.LREditor.open(n, {
    onSave: async d => { await q(sb.from('notes').update(patch(d)).eq('id', n.id)); },
    onSubmit: async d => {
      const now = new Date().toISOString();
      const upd = { ...patch(d), sub_title: d.title, sub_html: d.html, sub_text: d.text, submitted_at: now };
      if (!editing.note.first_submitted_at) upd.first_submitted_at = now;
      const saved = await q(sb.from('notes').update(upd).eq('id', n.id).select().single());
      editing.note = saved;
    },
    afterSubmit: () => { closeEditor(); toast('送出成功！已經放到你的學習紀錄頁'); location.hash = `#/c/${cls.id}`; },
    onBack: () => { closeEditor(); location.hash = `#/c/${cls.id}`; },
    onPreview: d => showPreview(d),
    onUpload: async (blob, name) => {
      const ext = /png/.test(blob.type) ? 'png' : /gif/.test(blob.type) ? 'gif' : /webp/.test(blob.type) ? 'webp' : 'jpg';
      const path = `${cls.id}/${S.uid}/${n.id}/${name || crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (error && !/exist|duplicate/i.test(error.message || '')) throw error;
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
  });
}
function closeEditor() {
  if (!editing) return;
  window.LREditor.close(); editing = null;
  $('#editorView').hidden = true; app.hidden = false; $('#appPreview').hidden = true;
  document.title = CFG.site;
}
function showPreview(d) {
  const { cls, note } = editing;
  const pv = $('#appPreview');
  pv.innerHTML = `<div class="preview-bar"><div class="in"><button class="ab dark" id="pvBack">${ICON.pen}回到編輯</button><span class="sub" style="margin:0"><b style="color:var(--accent-d)">預覽</b>：送出之後，你的這篇筆記會長這樣</span></div></div>
    <div class="wrap read">${blogHead({ id: S.uid, display_name: S.me.display_name }, cls)}
      <article class="post" style="margin-top:24px"><div class="post-meta"><span class="tag">${ICON.book}學習筆記</span><span>第 ${Math.max(1, weekNo(cls, note.first_submitted_at || new Date()))} 週・${fmtFull(new Date())}</span><span>·</span><span>${d.words} 字</span></div>
      <h1 class="post-title">${esc(d.title || '（還沒有標題）')}</h1><div class="doc post-body" id="pvBody"></div></article></div>`;
  renderDoc($('#pvBody'), d.html);
  $('#editorView').hidden = true; pv.hidden = false; pv.scrollTop = 0;
  $('#pvBack').onclick = () => { pv.hidden = true; $('#editorView').hidden = false; };
}

/* ---------- 我的帳號／老師帳號管理 ---------- */
function viewMe() {
  app.innerHTML = topbar([['我的帳號']]) + `
  <div class="wrap read">
    <h1 class="pg">我的帳號</h1>
    <div class="box">
      <p>${S.role === 'student' ? `帳號：<b class="mono">${esc(S.me.account)}</b>　顯示名稱：<b>${esc(S.me.display_name)}</b>` : `Email：<b>${esc(S.me.email)}</b>　稱呼：<b>${esc(S.me.display_name)}</b>`}</p>
      <h3>改密碼</h3>
      <form id="fPw" style="max-width:420px">
        <label class="fld"><span>新密碼（至少 6 個字）</span><input name="p1" type="password" minlength="6" required autocomplete="new-password"></label>
        <label class="fld"><span>再輸入一次</span><input name="p2" type="password" minlength="6" required autocomplete="new-password"></label>
        <button class="ab pri" type="submit">改密碼</button>
        <div id="pwMsg"></div>
      </form>
      ${S.role === 'student' ? '<p class="hint">改了以後，登入卡上的密碼和 QR code 就不能用了，請記好新密碼。忘記的話請老師重設。</p>' : ''}
    </div>
  </div>`;
  $('#fPw').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const out = $('#pwMsg');
    if (f.p1 !== f.p2) { out.innerHTML = '<div class="msg err">兩次輸入的密碼不一樣</div>'; return; }
    try {
      if (S.role === 'student') await callFn('manage', { action: 'change_my_password', new_password: f.p1 });
      else { const { error } = await sb.auth.updateUser({ password: f.p1 }); if (error) throw error; }
      out.innerHTML = '<div class="msg ok">密碼改好了</div>'; e.target.reset();
    } catch (err) { out.innerHTML = `<div class="msg err">${esc(err.message)}</div>`; }
  };
}
/* ---------- 期末作品集（列印／另存成 PDF） ---------- */
async function viewPortfolio(cid, params) {
  loading('整理作品集中⋯');
  const cls = await loadClass(cid);
  const isT = S.role === 'teacher';
  let students, teachers;
  if (isT) { const d = await loadClassData(cls); students = d.students; teachers = d.teachers; }
  else {
    const [enr, tch] = await Promise.all([
      q(sb.from('enrollments').select('seat_no').eq('class_id', cls.id).eq('student_id', S.uid).maybeSingle()),
      q(sb.from('class_teachers').select('teacher:teachers(display_name)').eq('class_id', cls.id)),
    ]);
    students = [{ id: S.uid, name: S.me.name, display_name: S.me.display_name, seat_no: enr?.seat_no }];
    teachers = tch.map(t => t.teacher).filter(Boolean);
  }
  let nq = sb.from('notes').select('id,student_id,sub_title,sub_html,word_count,first_submitted_at,submitted_at,share_status,hidden_by_teacher')
    .eq('class_id', cls.id).not('submitted_at', 'is', null).order('first_submitted_at');
  if (!isT) nq = nq.eq('student_id', S.uid);
  const notes = await q(nq);
  const st = { who: isT ? (students.some(x => x.id === params.s) ? params.s : 'all') : S.uid, pub: false, brk: true };
  const back = isT ? (params.s ? `#/c/${cls.id}/s/${params.s}` : `#/c/${cls.id}`) : `#/c/${cls.id}`;
  const tNames = teachers.map(t => t.display_name).join('、');
  app.innerHTML = topbar(isT ? [['我的班級', '#/'], [cls.name, `#/c/${cls.id}`], ['作品集']] : [[cls.name, `#/c/${cls.id}`], ['我的作品集']]) + `
  <div class="wrap pf-wrap">
    <div class="print-bar"><h1 class="pg" style="margin:0">${isT ? '作品集' : '我的作品集'}</h1><span class="sp" style="flex:1"></span>
      <a class="back-link" href="${back}">${ICON.back}回上一頁</a>
      <button class="ab dark" id="pfPrint" type="button">${ICON.print}列印／另存成 PDF</button></div>
    <div class="box no-print pf-opts">
      ${isT ? `<label class="fld" style="max-width:420px"><span>要印誰的</span><select id="pfWho">
        <option value="all">全班（合成一份，每人從新的一頁開始）</option>
        ${students.map(x => `<option value="${x.id}">${x.seat_no ?? ''} 號　${esc(x.name)}</option>`).join('')}</select></label>` : ''}
      <label class="chk"><input type="checkbox" id="pfPub">只收已經公開的筆記（要給校外的人看時用）</label>
      <label class="chk"><input type="checkbox" id="pfBrk" checked>每篇筆記從新的一頁開始（取消比較省紙）</label>
      <p class="d" id="pfSum" style="margin:8px 0 0"></p>
      <p class="d" style="margin:8px 0 0">按「列印／另存成 PDF」後，在列印視窗的「目的地」選「另存為 PDF」就會存成檔案；選印表機就是直接印（A4 直式）。影片印不出來，會改成 QR code，用手機掃就能看。下面是預覽。</p>
    </div>
    <div id="pfOut" class="pf"></div>
  </div>`;
  if (isT) $('#pfWho').value = st.who;
  const render = () => {
    const list = students.filter(x => st.who === 'all' || x.id === st.who);
    const out = $('#pfOut'); out.innerHTML = ''; out.classList.toggle('brk', st.brk);
    const empty = []; let total = 0, people = 0;
    for (const stu of list) {
      const mine = notes.filter(n => n.student_id === stu.id && (!st.pub || (n.share_status === 'approved' && !n.hidden_by_teacher)));
      if (!mine.length) { empty.push(stu.name); continue; }
      people++; total += mine.length;
      const words = mine.reduce((a, n) => a + (n.word_count || 0), 0);
      const d0 = mine[0].first_submitted_at, d1 = mine[mine.length - 1].first_submitted_at;
      const wk = n => Math.max(1, weekNo(cls, n.first_submitted_at));
      const sec = document.createElement('section'); sec.className = 'pf-stu';
      sec.innerHTML = `
        <div class="pf-page pf-cover">
          <div class="pf-ban"></div>
          <div class="pf-cin">
            <div class="pf-school">${esc(CFG.school)}</div>
            <div class="pf-kind">學習紀錄作品集</div>
            <div class="pf-class">${esc(cls.name)}</div>
            <div class="pf-name">${esc(stu.name)}</div>
            <div class="pf-seat">${stu.seat_no ? `${stu.seat_no} 號` : ''}</div>
            <div class="pf-stats">
              <div><b>${mine.length}</b><span>篇筆記</span></div>
              <div><b>${words.toLocaleString()}</b><span>字</span></div>
              <div><b>${fmtD(d0) === fmtD(d1) ? fmtD(d0) : `${fmtD(d0)}–${fmtD(d1)}`}</b><span>${new Date(d0).getFullYear()} 年</span></div>
            </div>
            <div class="pf-foot">${cls.term ? `<span>學期：${esc(cls.term)}</span>` : ''}${tNames ? `<span>指導老師：${esc(tNames)}</span>` : ''}${st.pub ? '<span>本冊只收錄已公開的筆記</span>' : ''}</div>
          </div>
        </div>
        <div class="pf-page pf-toc"><h2>目錄</h2>
          <ol>${mine.map(n => `<li><span class="w">第 ${wk(n)} 週</span><span class="t">${esc(n.sub_title || '（沒有標題）')}</span><span class="dt">${fmtD(n.first_submitted_at)}</span></li>`).join('')}</ol></div>`;
      mine.forEach((n, i) => {
        const art = document.createElement('article'); art.className = 'pf-page pf-note';
        art.innerHTML = `<div class="pf-meta"><span class="tag">第 ${wk(n)} 週</span><span>${fmtFull(n.first_submitted_at)}</span><span>·</span><span>${n.word_count || 0} 字</span><span class="pf-no">${esc(stu.name)}・${i + 1}／${mine.length}</span></div>
          <h2 class="pf-title">${esc(n.sub_title || '（沒有標題）')}</h2><div class="doc pf-body"></div>`;
        const body = art.querySelector('.pf-body');
        renderDoc(body, n.sub_html);
        body.querySelectorAll('.video-wrap').forEach(v => {   // 影片印不出來：改成 QR code＋網址
          const spec = v.getAttribute('data-video') || '', id = spec.slice(3);
          const url = spec.startsWith('yt:') ? `https://youtu.be/${id}` : `https://drive.google.com/file/d/${id}/view`;
          const box = document.createElement('div'); box.className = 'pf-video';
          box.innerHTML = `<div class="qr">${qrSVG(url)}</div><div class="vx"><b>影片</b><span>用手機掃 QR code 觀看</span><span class="url">${esc(url)}</span></div>`;
          v.replaceWith(box);
        });
        body.querySelectorAll('img').forEach(im => { im.loading = 'lazy'; im.decoding = 'async'; });
        sec.appendChild(art);
      });
      out.appendChild(sec);
    }
    if (!people) out.innerHTML = `<div class="empty"><b>沒有可以收錄的筆記</b>${st.pub ? '目前沒有已經公開的筆記；取消上面的勾選就會收錄全部已送出的筆記。' : '要先送出筆記，才會出現在作品集裡。'}</div>`;
    $('#pfSum').textContent = `這份作品集：${people} 位學生、共 ${total} 篇筆記（只收已送出的版本，草稿不收）。` + (empty.length && isT ? `沒有收錄：${empty.join('、')}（沒有${st.pub ? '已公開' : '已送出'}的筆記）。` : '');
    $('#pfPrint').disabled = !people;
  };
  render();
  if (isT) $('#pfWho').onchange = e => { st.who = e.target.value; render(); };
  $('#pfPub').onchange = e => { st.pub = e.target.checked; render(); };
  $('#pfBrk').onchange = e => { st.brk = e.target.checked; render(); };
  $('#pfPrint').onclick = async () => {
    const btn = $('#pfPrint'), out = $('#pfOut');
    out.querySelectorAll('img').forEach(im => { im.loading = 'eager'; });   // 列印前把還沒載入的照片全部載完
    const wait = [...out.querySelectorAll('img')].filter(im => !im.complete);
    if (wait.length) {
      btn.disabled = true; toast(`照片載入中（${wait.length} 張）⋯`);
      await Promise.race([Promise.all(wait.map(im => new Promise(r => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); }))), new Promise(r => setTimeout(r, 20000))]);
      btn.disabled = false;
    }
    const one = st.who !== 'all' ? students.find(x => x.id === st.who) : null;
    const old = document.title;
    document.title = `作品集-${cls.name}-${one ? `${one.seat_no ?? ''}${one.name}` : '全班'}`;   // 另存成 PDF 時的預設檔名
    window.print();
    setTimeout(() => { document.title = old; }, 1500);
  };
}

/* 備份用：不壓縮的 zip（照片本來就壓過了）。parts 直接放 Blob，不會把全部照片同時塞進記憶體 */
const CRC_T = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip() {
  const enc = new TextEncoder(), parts = [], dir = []; let offset = 0;
  const d = new Date(), dosT = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosD = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return {
    count: () => dir.length, size: () => offset,
    async add(name, data) {   // data：字串、Blob 或 Uint8Array
      const blob = data instanceof Blob ? data : new Blob([data]);
      const u8 = new Uint8Array(await blob.arrayBuffer()), crc = crc32(u8), nm = enc.encode(name);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dosT, true); h.setUint16(12, dosD, true); h.setUint32(14, crc, true); h.setUint32(18, u8.length, true); h.setUint32(22, u8.length, true);
      h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(h.buffer, nm, blob);
      dir.push({ nm, crc, size: u8.length, offset });
      offset += 30 + nm.length + u8.length;
    },
    finish() {
      if (dir.length > 65000 || offset > 3.9e9) throw new Error('備份太大了，請改成不含照片，並告訴管理者');
      const cdStart = offset; let cdSize = 0;
      for (const f of dir) {
        const c = new DataView(new ArrayBuffer(46));
        c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
        c.setUint16(12, dosT, true); c.setUint16(14, dosD, true); c.setUint32(16, f.crc, true); c.setUint32(20, f.size, true); c.setUint32(24, f.size, true);
        c.setUint16(28, f.nm.length, true); c.setUint32(42, f.offset, true);
        parts.push(c.buffer, f.nm); cdSize += 46 + f.nm.length;
      }
      const e = new DataView(new ArrayBuffer(22));
      e.setUint32(0, 0x06054b50, true); e.setUint16(8, dir.length, true); e.setUint16(10, dir.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, cdStart, true);
      parts.push(e.buffer);
      return new Blob(parts, { type: 'application/zip' });
    },
  };
}
const fmtSize = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const daysAgo = d => Math.floor((Date.now() - new Date(d)) / 86400000);
const agoText = d => { const n = daysAgo(d); return n <= 0 ? '今天' : n === 1 ? '昨天' : `${n} 天前`; };
async function downloadBackup(withPhotos, say) {
  say('讀取資料中⋯');
  const data = await q(sb.rpc('admin_backup'));
  const T = data.tables, zip = makeZip(), day = new Date().toLocaleDateString('sv-SE');
  const missing = []; let done = 0;
  const files = withPhotos ? data.files : [];
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const f = files[next++];
      try {
        const r = await fetch(sb.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl);
        if (!r.ok) throw new Error(r.status);
        f.blob = await r.blob();
      } catch (e) { console.warn('備份：照片下載失敗', f.name, e); missing.push(f.name); }
      say(`下載照片中⋯ ${++done}／${files.length}`);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  say('打包中⋯');
  const sentN = T.notes.filter(n => n.submitted_at).length;
  await zip.add('說明.txt', [
    `${CFG.school}「${CFG.site}」資料備份`, `備份時間：${new Date().toLocaleString('zh-TW', { hour12: false })}`, `備份的人：${S.me.display_name}（${S.me.email}）`, '',
    `班級 ${T.classes.length} 個、學生 ${T.students.length} 位、老師 ${T.teachers.length} 位`,
    `筆記 ${T.notes.length} 篇（已送出 ${sentN} 篇）`,
    withPhotos ? `照片 ${files.length - missing.length} 張${missing.length ? `（另有 ${missing.length} 張下載失敗，清單在「缺少的照片.txt」）` : ''}` : '這份備份不含照片',
    '', '【裡面有什麼】',
    'data.json　　全部資料：班級、學生名單、老師、每篇筆記的草稿和送出版',
    'photos/　　　筆記裡的照片，資料夾是「班級代碼/學生代碼/筆記代碼」',
    '', '【請注意】',
    '1. data.json 裡有學生的真實姓名，和登入卡上的密碼。請放在只有老師能打開的地方，不要傳到公開的群組。',
    '2. 這是保存用的備份。萬一資料庫出問題要還原，請把這個 zip 檔交給協助維護的人處理。',
    '3. 學生自己改過的密碼不在備份裡；還原後請用「重設密碼」重新發登入卡。',
  ].join('\r\n'));
  await zip.add('data.json', JSON.stringify({ ...data, files: data.files.map(f => ({ name: f.name, size: f.size, type: f.type, created_at: f.created_at })) }, null, 1));
  for (const f of files) if (f.blob) { await zip.add('photos/' + f.name, f.blob); f.blob = null; }
  if (missing.length) await zip.add('缺少的照片.txt', missing.join('\r\n'));
  const out = zip.finish();
  const a = document.createElement('a'); a.href = URL.createObjectURL(out); a.download = `學習紀錄備份-${day}.zip`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  try { await q(sb.from('backup_log').insert({ by_teacher: S.uid, notes_count: T.notes.length, files_count: files.length - missing.length, bytes: out.size, with_photos: withPhotos })); } catch (e) { console.warn(e); }
  return { size: out.size, notes: T.notes.length, photos: files.length - missing.length, missing: missing.length };
}
async function viewAdmin() {
  if (!(S.role === 'teacher' && S.me.is_admin)) { location.hash = '#/'; return; }
  loading();
  const [ts, logs, st] = await Promise.all([
    q(sb.from('teachers').select('*').order('created_at')),
    q(sb.from('backup_log').select('at,notes_count,files_count,bytes,with_photos').order('at', { ascending: false }).limit(1)),
    q(sb.from('app_status').select('at,n').eq('key', 'keepalive').maybeSingle()),
  ]);
  const last = logs[0];
  const bkState = !last ? tagTodo('還沒備份過')
    : daysAgo(last.at) > 30 ? tagTodo(`上次備份：${agoText(last.at)}，建議再備份一次`)
    : tagOk(`上次備份：${agoText(last.at)}`);
  const kaState = !st ? tagTodo('還沒有紀錄（排程每天凌晨會連一次）')
    : daysAgo(st.at) > 3 ? tagTodo(`已經 ${daysAgo(st.at)} 天沒有自動連線`)
    : tagOk(`上次自動連線：${agoText(st.at)}（${fmtDT(st.at)}）`);
  app.innerHTML = topbar([['管理']]) + `
  <div class="wrap read">
    <h1 class="pg">管理</h1><p class="sub">只有管理者看得到這一頁。</p>
    <div class="box"><h3>資料備份</h3>
      <p class="d">把全部班級、名單、筆記和照片打包成一個壓縮檔，下載到這台電腦。建議每個月、還有學期結束時各備份一次。</p>
      <p style="margin:0 0 16px">${bkState}${last ? `<span class="d" style="margin-left:10px;color:var(--ink-2);font-size:16px">${fmtDT(last.at)}・筆記 ${last.notes_count} 篇・${last.with_photos ? `照片 ${last.files_count} 張` : '不含照片'}・${fmtSize(last.bytes)}</span>` : ''}</p>
      <label class="chk" style="margin-bottom:14px"><input type="checkbox" id="bkPhotos" checked>包含照片（檔案比較大，下載比較久）</label>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><button class="ab pri" id="bkGo" type="button">下載備份</button><span id="bkMsg" role="status" style="color:var(--ink-2);font-size:16px"></span></div>
      <p class="d" style="margin:16px 0 0">備份檔裡有學生的真實姓名和登入卡密碼，請放在只有老師能打開的地方。</p></div>
    <div class="box"><h3>防暫停</h3>
      <p class="d">資料庫是免費方案，超過一星期沒人用會被暫停。所以有一個排程每天凌晨自動連線一次，寒暑假也不會停。</p>
      <p style="margin:0">${kaState}</p>
      ${st && daysAgo(st.at) > 3 || !st ? `<p class="d" style="margin:14px 0 0">如果一直沒有紀錄：到 GitHub 的 learning-record 儲存庫 →「Actions」→ 左邊「防暫停」→ 若出現「Enable workflow」就按下去，再按「Run workflow」。</p>` : ''}</div>
    <div class="box"><h3>老師帳號</h3><table class="acct"><thead><tr><th>稱呼</th><th>Email</th><th>身分</th></tr></thead>
      <tbody>${ts.map(t => `<tr><td>${esc(t.display_name)}</td><td>${esc(t.email)}</td><td>${t.is_admin ? '管理者' : '老師'}</td></tr>`).join('')}</tbody></table></div>
    <div class="box"><h3>新增老師</h3><p class="d">系統會產生一組暫時密碼，請轉交給那位老師，並請他登入後到「我的帳號」改密碼。</p>
      <form id="fNewT" style="max-width:460px">
        <label class="fld"><span>老師的 Email</span><input name="email" type="email" required></label>
        <label class="fld"><span>稱呼（例如：尤慕斯‧舒漾）</span><input name="display_name" required></label>
        <button class="ab pri" type="submit">新增</button></form></div>
  </div>`;
  $('#bkGo').onclick = async () => {
    const btn = $('#bkGo'), msg = $('#bkMsg'), withPhotos = $('#bkPhotos').checked; btn.disabled = true;
    try {
      const r = await downloadBackup(withPhotos, t => { msg.textContent = t; });
      toast('備份下載好了'); await viewAdmin();
      $('#bkPhotos').checked = withPhotos;
      $('#bkMsg').textContent = `已下載：筆記 ${r.notes} 篇${withPhotos ? `、照片 ${r.photos} 張` : '、不含照片'}（${fmtSize(r.size)}）${r.missing ? `；有 ${r.missing} 張照片沒抓到，清單在壓縮檔裡` : ''}`;
    } catch (e) { console.error(e); msg.textContent = '備份沒有成功：' + (e.message || e); btn.disabled = false; }
  };
  $('#fNewT').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try {
      const r = await callFn('manage', { action: 'create_teacher', email: f.email, display_name: f.display_name });
      await infoBox('老師帳號建好了', `<p>Email：<b>${esc(f.email)}</b></p><p>暫時密碼：</p><p style="font-size:30px;font-weight:700;letter-spacing:.06em" class="mono">${esc(r.password)}</p><p>請轉交給老師，登入後到「我的帳號」改密碼。這組密碼不會再顯示一次。</p>`);
      route();
    } catch (err) { toast(err.message); }
  };
}

/* ---------- 路由 ---------- */
function parseHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { parts: path.split('/').filter(Boolean), params };
}
let booting = false;   // 正在確認登入身分時先不畫畫面，等 boot() 結束再畫（避免身分還沒讀到就畫首頁）
async function route() {
  if (booting) return;
  const { parts, params } = parseHash();
  if (editing && parts[0] !== 'e') { await window.LREditor.flush(); closeEditor(); }
  if (parts[0] === 'p' && parts[1]) {   // 公開頁：不用登入
    window.scrollTo(0, 0);
    try { return parts[2] ? await viewPublicNote(parts[1], parts[2]) : await viewPublicWall(parts[1]); }
    catch (e) { console.error(e); return publicMissing(parts[1]); }
  }
  document.title = CFG.site;
  if (!S.uid) { if (parts[0] !== 'login') { history.replaceState(null, '', location.pathname + '#/login' + (params.u ? `?u=${params.u}&p=${params.p}` : '')); } return viewLogin(params); }
  window.scrollTo(0, 0);
  try {
    if (parts[0] === 'login') { if (params.u && params.p && !(S.role === 'student' && S.me.account === params.u)) { /* 換學生帳號登入 */ await sb.auth.signOut(); S.uid = null; return viewLogin(params); } location.hash = '#/'; return; }
    if (!parts.length) return await viewHome();
    if (parts[0] === 'c' && parts[1]) {
      if (parts[2] === 'cards') return await viewCards(parts[1], params);
      if (parts[2] === 'wallcard') return await viewWallCard(parts[1]);
      if (parts[2] === 'portfolio') return await viewPortfolio(parts[1], params);
      if (parts[2] === 's' && parts[3]) return await viewClass(parts[1], null, parts[3]);
      return await viewClass(parts[1], parts[2]);
    }
    if (parts[0] === 'n' && parts[1]) return await viewNote(parts[1], params);
    if (parts[0] === 'e' && parts[1]) return await viewEditor(parts[1]);
    if (parts[0] === 'me') return viewMe();
    if (parts[0] === 'admin') return await viewAdmin();
    location.hash = '#/';
  } catch (e) {
    console.error(e);
    app.hidden = false; $('#editorView').hidden = true;
    if (!S.uid || !S.me) { S.uid = null; S.me = null; return viewLogin({}); }   // 讀資料途中被登出：直接回登入頁
    app.innerHTML = topbar([]) + `<div class="wrap"><div class="empty"><b>出了一點問題</b>${esc(e.message || e)}<br><br><a class="ab" href="#/">回到首頁</a> <button class="ab" data-act="reload">重新整理</button></div></div>`;
  }
}

/* ---------- 共用點擊 ---------- */
document.addEventListener('click', async e => {
  if (e.target.closest('#editorView')) return;
  const go = e.target.closest('[data-go]'); if (go) { location.hash = go.dataset.go; return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'logout') { if (editing) await window.LREditor.flush(); await sb.auth.signOut(); S.uid = null; S.me = null; location.hash = '#/login'; route(); }
  else if (act === 'newClass') newClass();
  else if (act === 'newNote') { a.disabled = true; newNote(a.dataset.cid); }
  else if (act === 'delNote') delNote(a.dataset.id, a.dataset.back);
  else if (act === 'share') { a.disabled = true; setShare(a.dataset.id, a.dataset.to); }
  else if (act === 'print') { window.print(); }
  else if (act === 'reload') location.reload();
});
addEventListener('hashchange', route);

/* ---------- 啟動：確認登入身分 ---------- */
async function boot() {
  booting = true;
  let problem = null;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { S.uid = null; S.me = null; }
    else {
      // 身分資料讀到了才算登入（S.uid 和 S.me 一起設定）
      const uid = session.user.id;
      const t = await sb.from('teachers').select('*').eq('id', uid).maybeSingle();
      if (t.data) { S.role = 'teacher'; S.me = t.data; S.uid = uid; }
      else {
        const s = t.error ? { error: t.error } : await sb.from('students').select('*').eq('id', uid).maybeSingle();
        if (s.data) { S.role = 'student'; S.me = s.data; S.uid = uid; }
        else if (s.error) problem = 'net';        // 網路問題：不要把人登出
        else problem = 'unset';                   // 帳號存在但沒有老師／學生資料
      }
    }
  } catch (e) { console.error(e); problem = 'net'; }
  finally { booting = false; }
  if (problem === 'net') {
    S.uid = null; S.me = null; app.hidden = false;
    app.innerHTML = '<div class="wrap"><div class="empty"><b>連不上網路</b>請確認網路後再試一次。<br><br><button class="ab" data-act="reload">重新整理</button></div></div>';
    return;
  }
  if (problem === 'unset') {
    S.uid = null; S.me = null; await sb.auth.signOut();
    viewLogin({}); toast('這個帳號還沒設定好，請找老師'); return;
  }
  return route();
}
sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT' && S.uid) { S.uid = null; S.me = null; closeEditor(); route(); } });
boot();
})();
