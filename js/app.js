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
const COLORS = ['#C0675A', '#5E8C75', '#A68B7B', '#6F87A3', '#B08A5E', '#8C7A9E', '#5F9393', '#A77080', '#7E9560', '#8C7B70'];
const THUMBS = ['#8C7B70', '#A68B7B', '#7F9584', '#8F8598', '#A2906D', '#7D949B'];
const colorOf = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
const initial = s => (String(s || '?').trim()[0] || '?').toUpperCase();
const logo = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 22 12 12 22 2 12Z" fill="#C0675A"/><path d="M12 8 16 12 12 16 8 12Z" fill="#fff"/></svg>';
const ICON = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
};
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
const hasUnsent = n => n.submitted_at && new Date(n.updated_at) - new Date(n.submitted_at) > 3000;

/* ---------- 上方列 ---------- */
function topbar(crumbs) {
  const who = S.role === 'teacher'
    ? { av: initial(S.me.display_name), label: S.me.display_name + ' 老師', color: '#7A6C65' }
    : { av: initial(S.me.display_name), label: S.me.display_name, color: colorOf(S.uid) };
  return `<header class="top"><div class="top-in">
    <a class="abrand" href="#/">${logo}${esc(CFG.site)}</a>
    <span class="crumb">${crumbs.map(c => c[1] ? `<span>›</span><a href="${c[1]}">${esc(c[0])}</a>` : `<span>›</span><span>${esc(c[0])}</span>`).join('')}</span>
    <span class="sp"></span>
    ${S.role === 'teacher' && S.me.is_admin ? '<a class="link" href="#/admin">老師帳號</a>' : ''}
    <a class="who-chip" href="#/me" style="text-decoration:none" title="我的帳號、改密碼"><span class="mini-av" style="background:${who.color}">${esc(who.av)}</span>${esc(who.label)}</a>
    <button class="link" data-act="logout">登出</button>
  </div></header>`;
}
function blogHead(student, cls, act = '') {
  return `<section><div class="cover"></div><div class="profile">
    <div class="avatar" style="background:${colorOf(student.id)}">${esc(initial(student.display_name))}</div>
    <div class="who"><div class="blog-name">${esc(student.display_name)} 的學習紀錄</div><div class="blog-sub">${esc(cls.name)}${student.seat_no ? `　·　${student.seat_no} 號` : ''}</div></div>
    ${act ? `<div class="act">${act}</div>` : ''}
  </div></section>`;
}
function noteCard(n, cls, link, isOwner) {
  const sent = !!n.submitted_at;
  const title = (sent ? n.sub_title : n.title) || n.title || '（還沒有標題）';
  const ex = (sent ? n.sub_text : n.content_text) || '';
  const wk = weekNo(cls, n.first_submitted_at || n.created_at);
  const pill = !sent ? '<span class="pill draft">草稿・還沒送出</span>'
    : hasUnsent(n) && isOwner ? '<span class="pill draft">有修改還沒送出</span>'
    : wk === curWeek(cls) ? '<span class="pill new">這週</span>' : '';
  const th = n.cover_url ? `<div class="thumb img" style="background-image:url('${esc(n.cover_url)}')"></div>` : `<div class="thumb" style="background-color:${THUMBS[Math.abs(wk) % THUMBS.length]}"></div>`;
  return `<button class="card ${sent ? '' : 'draft'}" data-go="${link}">${th}${pill}
    <div class="cb"><div class="cdate">第 ${Math.max(1, wk)} 週・${fmtD(n.submitted_at || n.updated_at)}</div><div class="ctitle">${esc(title)}</div><div class="cex">${esc(ex.slice(0, 120)) || '（還沒有內容）'}</div></div></button>`;
}

/* ---------- 登入 ---------- */
function viewLogin(params) {
  app.innerHTML = `
  <div class="login-bg"><div class="login">
    <div class="login-head"><div class="s">${esc(CFG.school)}</div><div class="t">${esc(CFG.site)}</div></div>
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
      location.hash = '#/'; await boot();
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
    location.hash = '#/'; await boot();
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
    q(sb.from('notes').select('class_id,student_id,first_submitted_at,submitted_at,created_at').in('class_id', ids)),
    q(sb.from('class_teachers').select('class_id,teacher:teachers(display_name)').in('class_id', ids)),
  ]) : [[], [], []];
  const card = c => {
    const n = enr.filter(e => e.class_id === c.id).length;
    const cn = notes.filter(x => x.class_id === c.id);
    const wk = curWeek(c);
    const done = new Set(cn.filter(x => x.first_submitted_at && weekNo(c, x.first_submitted_at) === wk).map(x => x.student_id)).size;
    const names = tch.filter(t => t.class_id === c.id).map(t => t.teacher?.display_name).filter(Boolean).join('、');
    return `<button class="class-card" data-go="#/c/${c.id}"><div class="band ${c.archived ? 'arch' : (/八/.test(c.name) ? 'c8' : 'c7')}"></div><div class="ci">
      <div class="cn">${esc(c.name)}</div><div class="cm">${n} 位學生・${esc(names)}</div>
      ${c.archived ? '<div class="cm">已封存・作品保留</div>' : `<div class="stat"><span>本週已送出 <b>${done}</b>/${n}</span><span>共 <b>${cn.filter(x => x.submitted_at).length}</b> 篇</span></div>`}</div></button>`;
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
        <div class="stat"><span>已送出 <b>${mine.filter(n => n.submitted_at).length}</b> 篇</span>${c.archived ? '<span>已封存</span>' : doneNow ? '<span style="color:var(--green)">✓ 這週寫好了</span>' : '<span style="color:var(--accent-d)">這週還沒送出</span>'}</div></div></button>`;
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
    q(sb.from('notes').select('id,title,sub_title,content_text,sub_text,created_at,updated_at,submitted_at,first_submitted_at,cover_url,word_count').eq('class_id', cls.id).eq('student_id', S.uid).order('created_at', { ascending: false })),
  ]);
  const me = { id: S.uid, display_name: S.me.display_name, seat_no: enr?.seat_no };
  const sent = notes.filter(n => n.submitted_at).length;
  const act = cls.archived ? '<span class="pill draft" style="position:static">班級已封存，只能看不能改</span>' : `<button class="ab pri" data-act="newNote" data-cid="${cls.id}">${ICON.pen}寫新的筆記</button>`;
  app.innerHTML = topbar([[cls.name]]) + `
  <div class="wrap narrow">
    ${blogHead(me, cls, act)}
    <div class="sec-head"><h2>我的學習筆記</h2><span class="meta">已送出 ${sent} 篇・草稿 ${notes.length - sent} 篇</span></div>
    ${notes.length ? `<div class="searchbar">${ICON.search.replace('<svg', '<svg style="width:22px;height:22px;stroke:var(--muted);fill:none;stroke-width:2"')}<input id="searchBox" placeholder="搜尋我寫過的詞，例如：菱形紋" autocomplete="off"></div>` : ''}
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
    q(sb.from('notes').select('id,student_id,title,sub_title,sub_text,content_text,created_at,updated_at,submitted_at,first_submitted_at,cover_url,hidden_by_teacher').eq('class_id', cls.id).order('created_at', { ascending: false })),
    q(sb.from('class_teachers').select('teacher:teachers(id,display_name,email)').eq('class_id', cls.id)),
    q(sb.from('login_guard').select('account,locked_until')),
  ]);
  const students = enr.filter(e => e.student).map(e => ({ ...e.student, seat_no: e.seat_no }))
    .sort((a, b) => (a.seat_no ?? 999) - (b.seat_no ?? 999) || a.account.localeCompare(b.account));
  return { students, notes, teachers: tch.map(t => t.teacher).filter(Boolean), guard };
}
function classHeader(cls, data, tab) {
  const tabs = [['blogs', '學生部落格'], ['progress', '進度一覽'], ['roster', '名單與帳號'], ['settings', '班級設定']];
  const wk = curWeek(cls);
  const st = data.students.map(s => weekStatus(cls, data.notes.filter(n => n.student_id === s.id), wk));
  const total = data.students.length || 0;
  const done = st.filter(x => x === 'd').length;
  return topbar([['我的班級', '#/'], [cls.name]]) + `
  <div class="wrap">
    <div class="class-head"><div><h1 class="pg">${esc(cls.name)}${cls.archived ? '<span class="pill draft" style="position:static;margin-left:10px;vertical-align:middle">已封存</span>' : ''}</h1>
      <p class="sub" style="margin:0">${total} 位學生・${esc(data.teachers.map(t => t.display_name).join('、'))}・現在是第 ${wk} 週（${weekRange(cls, wk)}）</p></div></div>
    <nav class="ctabs">${tabs.map(([k, l]) => `<a href="#/c/${cls.id}${k === 'blogs' ? '' : '/' + k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav>
    ${tab === 'blogs' || tab === 'progress' ? `<div class="stats">
      <div class="stat-card"><div class="k">本週已送出</div><div class="v">${done}<small> / ${total} 人</small></div><div class="bar"><i style="width:${total ? done / total * 100 : 0}%"></i></div></div>
      <div class="stat-card"><div class="k">本週還沒寫</div><div class="v" style="color:var(--accent-d)">${st.filter(x => x === 'n').length}<small> 人</small></div></div>
      <div class="stat-card"><div class="k">寫了草稿、還沒送出</div><div class="v" style="color:var(--amber)">${st.filter(x => x === 'r').length}<small> 人</small></div></div>
      <div class="stat-card"><div class="k">全班平均</div><div class="v">${total ? (data.notes.filter(n => n.submitted_at).length / total).toFixed(1) : 0}<small> 篇 / 人</small></div></div>
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
      const badge = st === 'd' ? '<span class="wk ok">✓ 本週已送出</span>' : st === 'r' ? '<span class="wk dr">草稿還沒送出</span>' : '<span class="wk no">本週還沒寫</span>';
      const last = mine.length ? fmtD(mine.reduce((a, n) => (n.updated_at > a ? n.updated_at : a), '')) : '—';
      return `<button class="stu" data-go="#/c/${cls.id}/s/${s.id}" data-st="${st}" data-q="${esc(s.display_name + ' ' + s.name + ' ' + (s.seat_no || '') + ' ' + s.account)}">
        <div class="sthumb ${latest?.cover_url ? 'img' : ''}" style="${latest?.cover_url ? `background-image:url('${esc(latest.cover_url)}')` : `background-color:${THUMBS[(s.seat_no || 0) % THUMBS.length]}`}">
          <div class="lt">${latest ? '最新：' + esc(latest.sub_title || latest.title) : '還沒有送出的筆記'}</div><div class="sav" style="background:${colorOf(s.id)}">${esc(initial(s.display_name))}</div></div>
        <div class="sb"><div class="sn">${esc(s.display_name)} <small>${s.seat_no ?? ''} 號・${esc(s.name)}</small></div>
          <div class="sm"><span>${sent.length} 篇</span><span>最近更新 ${last}</span></div>${badge}</div></button>`;
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
      ${prev ? `<a class="ab sm" href="#/c/${cls.id}/s/${prev.id}">‹ ${esc(prev.display_name)}</a>` : ''}${next ? `<a class="ab sm" href="#/c/${cls.id}/s/${next.id}">${esc(next.display_name)} ›</a>` : ''}</div>
    ${blogHead(s, cls)}
    <div class="sec-head"><h2>${esc(s.display_name)} 的學習筆記</h2><span class="meta">已送出 ${mine.filter(n => n.submitted_at).length} 篇・草稿 ${mine.filter(n => !n.submitted_at).length} 篇</span></div>
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
    ${cls.archived ? '<div class="note-banner">這個班級已封存。名單還可以看，但學生不能再寫。</div>' : ''}
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
          <td>${locked.has(s.account) ? `<span class="wk no" style="margin:0">暫停登入</span> <button class="ab sm" data-unlock="${s.id}">解除</button>` : '<span style="color:var(--green)">正常</span>'}</td>
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
        <ul class="teachers">${data.teachers.map(t => `<li><span class="mini-av" style="background:#7A6C65">${esc(initial(t.display_name))}</span>${esc(t.display_name)}<span style="color:var(--muted);font-size:15px">${esc(t.email)}</span><span class="sp" style="flex:1"></span>
          ${t.id !== S.uid && data.teachers.length > 1 ? `<button class="ab sm" data-rmt="${t.id}">移除</button>` : ''}</li>`).join('')}</ul>
        <form id="fAddT"><label class="fld"><span>加入老師（輸入老師帳號的 email）</span><input name="email" type="email" placeholder="teacher@tmail.ilc.edu.tw" required></label>
        <button class="ab" type="submit">加入</button></form>
        ${S.me.is_admin ? '<p class="d" style="margin-top:10px">老師還沒有帳號？到右上角「老師帳號」新增。</p>' : '<p class="d" style="margin-top:10px">對方要先有老師帳號（請管理者新增）。</p>'}
      </div>
    </div>
    <div class="box">
      <h3>${cls.archived ? '取消封存' : '學期結束：封存班級'}</h3>
      <p class="d">${cls.archived ? '取消封存後，學生又可以新增和修改筆記。' : '封存後，學生不能再新增或修改這個班級的筆記，但作品都會保留，老師和學生都還看得到。'}</p>
      <button class="ab ${cls.archived ? '' : 'danger'}" id="btnArchive">${cls.archived ? '取消封存' : '封存這個班級'}</button>
    </div>
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
      <a class="back-link" href="#/c/${cls.id}/roster" style="margin:0">← 回到名單與帳號</a>
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
  <div class="wrap narrow">
    ${blogHead(student, cls)}
    <a class="back-link" href="${back}">← 回到${isOwner ? '我的' : ' ' + esc(student.display_name) + ' 的'}學習紀錄頁</a>
    ${showDraft ? `<div class="note-banner">這篇還是<b>草稿</b>，還沒送出${isOwner ? '' : '（學生還在寫）'}。</div>` : ''}
    ${!showDraft && hasUnsent(n) ? `<div class="note-banner">${isOwner ? '你有修改還沒送出。這裡顯示的是上次送出的版本。' : '學生有新的修改還沒送出；這裡顯示的是上次送出的版本。'}</div>` : ''}
    <article class="post">
      <div class="post-meta"><span class="tag">學習筆記</span><span>第 ${Math.max(1, weekNo(cls, n.first_submitted_at || n.created_at))} 週・${fmtFull(n.submitted_at || n.updated_at)}</span><span>·</span><span>${n.word_count} 字</span>
        <span class="sp" style="flex:1"></span>
        ${isOwner && !cls.archived ? `<a class="ab sm" href="#/e/${n.id}">${ICON.pen}修改</a> <button class="ab sm danger" data-act="delNote" data-id="${n.id}" data-back="${back}">${ICON.trash}刪除</button>` : ''}</div>
      <h1 class="post-title">${esc(title)}</h1>
      <div class="doc post-body" id="postBody"></div>
    </article>
  </div>`;
  renderDoc($('#postBody'), html, params.hl);
}
function renderDoc(el, html, hl) {
  el.innerHTML = '';
  // 一律清理後再顯示，避免有人塞進不安全的內容
  const frag = window.__editor ? window.__editor.sanitize(html || '') : document.createTextNode('');
  el.appendChild(frag);
  if (!el.textContent.trim() && !el.querySelector('img,table')) el.innerHTML = '<p style="color:var(--muted)">（還沒有內容）</p>';
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
  try { await q(sb.from('notes').delete().eq('id', id)); toast('已刪除'); location.hash = back; } catch (e) { toast('刪除沒有成功：' + e.message); }
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
    <div class="wrap narrow">${blogHead({ id: S.uid, display_name: S.me.display_name }, cls)}
      <article class="post"><div class="post-meta"><span class="tag">學習筆記</span><span>第 ${Math.max(1, weekNo(cls, note.first_submitted_at || new Date()))} 週・${fmtFull(new Date())}</span><span>·</span><span>${d.words} 字</span></div>
      <h1 class="post-title">${esc(d.title || '（還沒有標題）')}</h1><div class="doc post-body" id="pvBody"></div></article></div>`;
  renderDoc($('#pvBody'), d.html);
  $('#editorView').hidden = true; pv.hidden = false; pv.scrollTop = 0;
  $('#pvBack').onclick = () => { pv.hidden = true; $('#editorView').hidden = false; };
}

/* ---------- 我的帳號／老師帳號管理 ---------- */
function viewMe() {
  app.innerHTML = topbar([['我的帳號']]) + `
  <div class="wrap narrow">
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
async function viewAdmin() {
  if (!(S.role === 'teacher' && S.me.is_admin)) { location.hash = '#/'; return; }
  loading();
  const ts = await q(sb.from('teachers').select('*').order('created_at'));
  app.innerHTML = topbar([['老師帳號']]) + `
  <div class="wrap narrow">
    <h1 class="pg">老師帳號</h1><p class="sub">只有管理者看得到這一頁。</p>
    <div class="box"><table class="acct"><thead><tr><th>稱呼</th><th>Email</th><th>身分</th></tr></thead>
      <tbody>${ts.map(t => `<tr><td>${esc(t.display_name)}</td><td>${esc(t.email)}</td><td>${t.is_admin ? '管理者' : '老師'}</td></tr>`).join('')}</tbody></table></div>
    <div class="box"><h3>新增老師</h3><p class="d">系統會產生一組暫時密碼，請轉交給那位老師，並請他登入後到「我的帳號」改密碼。</p>
      <form id="fNewT" style="max-width:460px">
        <label class="fld"><span>老師的 Email</span><input name="email" type="email" required></label>
        <label class="fld"><span>稱呼（例如：尤慕斯‧舒漾）</span><input name="display_name" required></label>
        <button class="ab pri" type="submit">新增</button></form></div>
  </div>`;
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
async function route() {
  const { parts, params } = parseHash();
  if (editing && parts[0] !== 'e') { await window.LREditor.flush(); closeEditor(); }
  if (!S.uid) { if (parts[0] !== 'login') { history.replaceState(null, '', location.pathname + '#/login' + (params.u ? `?u=${params.u}&p=${params.p}` : '')); } return viewLogin(params); }
  window.scrollTo(0, 0);
  try {
    if (parts[0] === 'login') { if (params.u && params.p && !(S.role === 'student' && S.me.account === params.u)) { /* 換學生帳號登入 */ await sb.auth.signOut(); S.uid = null; return viewLogin(params); } location.hash = '#/'; return; }
    if (!parts.length) return await viewHome();
    if (parts[0] === 'c' && parts[1]) {
      if (parts[2] === 'cards') return await viewCards(parts[1], params);
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
    app.innerHTML = (S.me ? topbar([]) : '') + `<div class="wrap"><div class="empty"><b>出了一點問題</b>${esc(e.message || e)}<br><br><a class="ab" href="#/">回到首頁</a> <button class="ab" data-act="reload">重新整理</button></div></div>`;
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
  else if (act === 'print') { window.print(); }
  else if (act === 'reload') location.reload();
});
addEventListener('hashchange', route);

/* ---------- 啟動：確認登入身分 ---------- */
async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { S.uid = null; return route(); }
  S.uid = session.user.id;
  const t = await sb.from('teachers').select('*').eq('id', S.uid).maybeSingle();
  if (t.data) { S.role = 'teacher'; S.me = t.data; return route(); }
  const s = await sb.from('students').select('*').eq('id', S.uid).maybeSingle();
  if (s.data) { S.role = 'student'; S.me = s.data; return route(); }
  await sb.auth.signOut(); S.uid = null;
  viewLogin({}); toast('這個帳號還沒設定好，請找老師');
}
sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT' && S.uid) { S.uid = null; S.me = null; closeEditor(); route(); } });
boot();
})();
