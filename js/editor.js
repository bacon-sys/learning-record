/* 仿 Word 編輯器：在平台裡用 window.LREditor.open(note, handlers) 開啟 */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const editor = $('#editor'), titleEl = $('#noteTitle'), page = $('#page'), workspace = $('#workspace');

/* ---------- 圖示 ---------- */
const P = d => `<path d="${d}"/>`;
const ICONS = {
  undo: P('M9 14 4 9l5-5') + P('M4 9h10.5a5.5 5.5 0 0 1 0 11H11'),
  redo: P('m15 14 5-5-5-5') + P('M20 9H9.5a5.5 5.5 0 0 0 0 11H13'),
  chev: P('m6 9 6 6 6-6'),
  hilite: P('m9 11-6 6v3h9l3-3') + P('m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4'),
  clear: P('M4 7V4h16v3') + P('M5 20h6') + P('M13 4 8 20') + P('m15 15 5 5') + P('m20 15-5 5'),
  ul: '<circle cx="4" cy="6" r="1.4" fill="currentColor"/><circle cx="4" cy="12" r="1.4" fill="currentColor"/><circle cx="4" cy="18" r="1.4" fill="currentColor"/>' + P('M9 6h12M9 12h12M9 18h12'),
  ol: P('M10 6h11M10 12h11M10 18h11') + P('M4 4h1.5v5') + P('M3.5 9h3.5') + P('M7 20H4c0-1.3 3-2.2 3-3.6 0-.8-.7-1.4-1.5-1.4S4 15.4 4 16'),
  outdent: P('M21 12H11M21 18H11M21 6H11') + P('m7 8-4 4 4 4'),
  indent: P('M21 12H11M21 18H11M21 6H11') + P('m3 8 4 4-4 4'),
  al: P('M3 6h18M3 12h12M3 18h15'),
  ac: P('M3 6h18M7 12h10M5 18h14'),
  ar: P('M3 6h18M9 12h12M6 18h15'),
  aj: P('M3 6h18M3 12h18M3 18h18'),
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/>' + P('m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21'),
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/>' + P('M3 9h18M3 15h18M9 3v18M15 3v18'),
  rowAbove: '<rect x="3" y="11" width="18" height="10" rx="1.5"/>' + P('M3 16h18M9 11v10M15 11v10') + P('M12 2v6M9 5h6'),
  rowBelow: '<rect x="3" y="3" width="18" height="10" rx="1.5"/>' + P('M3 8h18M9 3v10M15 3v10') + P('M12 16v6M9 19h6'),
  colLeft: '<rect x="11" y="3" width="10" height="18" rx="1.5"/>' + P('M16 3v18M11 9h10M11 15h10') + P('M2 12h6M5 9v6'),
  colRight: '<rect x="3" y="3" width="10" height="18" rx="1.5"/>' + P('M8 3v18M3 9h10M3 15h10') + P('M16 12h6M19 9v6'),
  trash: P('M3 6h18') + P('M8 6V4h8v2') + P('M19 6l-1 14H6L5 6') + P('M10 11v6M14 11v6'),
  help: '<circle cx="12" cy="12" r="9"/>' + P('M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3') + P('M12 17h.01'),
  eye: P('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z') + '<circle cx="12" cy="12" r="3"/>',
  send: P('m22 2-7 20-4-9-9-4Z') + P('M22 2 11 13'),
  back: P('m12 19-7-7 7-7') + P('M19 12H5'),
  newdoc: P('M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z') + P('M14 3v6h6') + P('M12 12v6M9 15h6'),
};
$$('[data-icon]').forEach(el => { el.outerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[el.dataset.icon] || ''}</svg>`; });

/* ---------- 設定 ---------- */
const FONTS = [
  { key: 'hei', label: '黑體', css: '"Noto Sans TC", "Noto Sans CJK TC", sans-serif', names: ['noto sans tc', 'noto sans cjk tc'] },
  { key: 'ming', label: '明體', css: '"Noto Serif TC", "Noto Serif CJK TC", serif', names: ['noto serif tc', 'noto serif cjk tc'] },
  { key: 'arial', label: 'Arial', css: 'Arial, Arimo, "Noto Sans TC", sans-serif', names: ['arial', 'arimo'] },
  { key: 'times', label: 'Times New Roman', css: '"Times New Roman", Tinos, "Noto Serif TC", serif', names: ['times new roman', 'tinos'] },
  { key: 'courier', label: 'Courier New', css: '"Courier New", Cousine, monospace', names: ['courier new', 'cousine'] },
];
const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
const COLORS = {
  theme: ['#000000', '#FFFFFF', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'],
  std: ['#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'],
  hi: ['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#0000FF', '#FF0000', '#000080', '#008080', '#008000', '#800080', '#800000', '#808000', '#808080', '#C0C0C0', '#000000'],
};
const ZW = '​';
let lastFore = '#C00000', lastHi = '#FFFF00';
const lastListType = { ul: 'disc', ol: 'decimal' };
let composing = false, selImg = null, savedRange = null;
const BLOCK_RE = /^(P|H1|H2|H3|BLOCKQUOTE|DIV|LI|TD|TH)$/;
const BLOCKISH_RE = /^(P|H1|H2|H3|H4|H5|H6|UL|OL|LI|TABLE|THEAD|TBODY|TR|TD|TH|BLOCKQUOTE|DIV)$/;

try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}

/* ---------- 選取範圍工具 ---------- */
const inEditor = n => !!n && (n === editor || editor.contains(n));
function curRange() {
  const s = getSelection();
  if (s.rangeCount) { const r = s.getRangeAt(0); if (inEditor(r.commonAncestorContainer)) return r; }
  return null;
}
function setSel(r) { const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
function placeEnd() {
  const r = document.createRange();
  const last = editor.lastElementChild || editor;
  r.selectNodeContents(last); r.collapse(false); setSel(r);
}
function caretIn(node, atStart) {
  const r = document.createRange(); r.selectNodeContents(node); r.collapse(!!atStart); setSel(r);
}
function ensureSel() {
  if (document.activeElement === editor) { const r = curRange(); if (r) return r; }
  editor.focus({ preventScroll: true });
  if (savedRange && savedRange.startContainer.isConnected && inEditor(savedRange.startContainer) && savedRange.endContainer.isConnected) {
    setSel(savedRange.cloneRange());
  } else if (!curRange()) placeEnd();
  return getSelection().getRangeAt(0);
}
const elOf = n => (n && n.nodeType === 3 ? n.parentNode : n);
function elAtRange(r) {
  let n = r.startContainer;
  if (n.nodeType === 1 && n.childNodes[r.startOffset] && !r.collapsed) n = n.childNodes[r.startOffset];
  n = elOf(n);
  return inEditor(n) ? n : editor;
}
function blockOf(node) {
  let n = elOf(node);
  while (n && n !== editor) { if (BLOCK_RE.test(n.tagName)) return n; n = n.parentNode; }
  return null;
}
function closestIn(node, sel) { const e = elOf(node); const c = e && e.closest ? e.closest(sel) : null; return c && editor.contains(c) ? c : null; }
const isBlockEl = n => n && n.nodeType === 1 && BLOCKISH_RE.test(n.tagName);
function isEmptyBlock(b) { return !b.querySelector('img,table') && b.textContent.replace(/[​\s]/g, '') === ''; }
function newP() { const p = document.createElement('p'); p.innerHTML = '<br>'; return p; }

/* ---------- 復原／重做（自己管理，才能涵蓋所有操作） ---------- */
const hist = { stack: [], idx: -1, timer: 0, pending: false, since: 0 };
function nodePath(node) {
  const p = [];
  while (node && node !== editor) { const par = node.parentNode; if (!par) return null; p.unshift(Array.prototype.indexOf.call(par.childNodes, node)); node = par; }
  return node === editor ? p : null;
}
function walkPath(p) { let n = editor; for (const i of p) { n = n.childNodes[i]; if (!n) return null; } return n; }
const maxOff = n => (n.nodeType === 3 ? n.length : n.childNodes.length);
function selState() {
  const r = curRange(); if (!r) return null;
  const a = nodePath(r.startContainer), b = nodePath(r.endContainer);
  return a && b ? { a, ao: r.startOffset, b, bo: r.endOffset } : null;
}
function applySel(st) {
  if (!st) { placeEnd(); return; }
  const a = walkPath(st.a), b = walkPath(st.b);
  if (!a || !b) { placeEnd(); return; }
  try { const r = document.createRange(); r.setStart(a, Math.min(st.ao, maxOff(a))); r.setEnd(b, Math.min(st.bo, maxOff(b))); setSel(r); }
  catch (e) { placeEnd(); }
}
const snapHTML = () => editor.innerHTML.replace(/ class="is-sel"/g, '');
function commit() {
  clearTimeout(hist.timer); hist.pending = false;
  const html = snapHTML(), sel = selState(), cur = hist.stack[hist.idx];
  if (cur && cur.html === html) { cur.sel = sel; updateUndoBtns(); return false; }
  hist.stack.length = hist.idx + 1;
  hist.stack.push({ html, sel });
  if (hist.stack.length > 300) hist.stack.shift();
  hist.idx = hist.stack.length - 1;
  updateUndoBtns();
  return true;
}
function scheduleCommit() {
  if (!hist.pending) hist.since = Date.now();
  hist.pending = true; clearTimeout(hist.timer);
  if (Date.now() - hist.since > 3000) { commit(); return; }
  hist.timer = setTimeout(commit, 600);
}
function restoreState(st) {
  clearImgSel();
  editor.innerHTML = st.html;
  editor.focus({ preventScroll: true });
  applySel(st.sel);
  changed();
}
function doUndo() { if (composing) return; if (hist.pending) commit(); if (hist.idx <= 0) return; hist.idx--; restoreState(hist.stack[hist.idx]); updateUndoBtns(); }
function doRedo() { if (composing) return; if (hist.pending) commit(); if (hist.idx >= hist.stack.length - 1) return; hist.idx++; restoreState(hist.stack[hist.idx]); updateUndoBtns(); }
function updateUndoBtns() {
  $('[data-cmd="undo"]').disabled = !(hist.idx > 0 || hist.pending);
  $('[data-cmd="redo"]').disabled = !(hist.idx < hist.stack.length - 1);
}

/* ---------- 執行指令的共同流程 ---------- */
function run(fn) {
  if (composing) return;
  const r = ensureSel();
  if (hist.pending) commit();
  try { fn(r); } catch (e) { console.error(e); toast('這個動作沒有成功，請再試一次'); }
  tidy();
  commit();
  changed();
}
function ec(cmd, val, css) {
  try { document.execCommand('styleWithCSS', false, !!css); } catch (e) {}
  return document.execCommand(cmd, false, val == null ? null : val);
}
function tidy() {
  editor.querySelectorAll('span').forEach(s => {
    if (!s.attributes.length || (s.attributes.length === 1 && s.hasAttribute('style') && !s.getAttribute('style').trim())) s.replaceWith(...s.childNodes);
  });
}

/* ---------- 字型與字級 ---------- */
function fontInfo(el) {
  const ff = getComputedStyle(el).fontFamily;
  const first = ff.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
  return FONTS.find(f => f.names.includes(first)) || { key: '', label: ff.split(',')[0].replace(/["']/g, '').trim() };
}
const pxToPt = px => Math.round(parseFloat(px) * 0.75 * 2) / 2;
const fmtPt = pt => String(pt).replace(/\.0$/, '');
function curSizePt() {
  const r = curRange() || savedRange; if (!r) return 12;
  return pxToPt(getComputedStyle(elAtRange(r)).fontSize);
}
function applySize(pt) {
  pt = Math.max(1, Math.min(400, Math.round(pt * 2) / 2));
  run(r => {
    if (r.collapsed) {
      const host = elOf(r.startContainer);
      if (host && host.tagName === 'SPAN' && host.textContent === ZW) { host.style.fontSize = pt + 'pt'; return; }
      const span = document.createElement('span'); span.style.fontSize = pt + 'pt'; span.textContent = ZW;
      r.insertNode(span);
      const nr = document.createRange(); nr.setStart(span.firstChild, 1); nr.collapse(true); setSel(nr);
      return;
    }
    ec('fontSize', '7', false);
    const spans = [];
    editor.querySelectorAll('font[size="7"]').forEach(f => {
      const sp = document.createElement('span');
      sp.style.fontSize = pt + 'pt';
      if (f.getAttribute('face')) sp.style.fontFamily = f.getAttribute('face');
      if (f.getAttribute('color')) sp.style.color = f.getAttribute('color');
      while (f.firstChild) sp.appendChild(f.firstChild);
      f.replaceWith(sp);
      sp.querySelectorAll('[style]').forEach(e => { if (e.style.fontSize) { e.style.fontSize = ''; if (!e.getAttribute('style').trim()) e.removeAttribute('style'); } });
      spans.push(sp);
    });
    if (spans.length) { const nr = document.createRange(); nr.setStart(spans[0], 0); const last = spans[spans.length - 1]; nr.setEnd(last, last.childNodes.length); setSel(nr); }
  });
}
function stepSize(dir) {
  const cur = curSizePt();
  const next = dir > 0 ? (SIZES.find(s => s > cur) || cur + 10) : ([...SIZES].reverse().find(s => s < cur) || Math.max(1, cur - 1));
  applySize(next);
}
function applyFont(f) { run(() => ec('fontName', f.css, true)); }

/* ---------- 清單與縮排（自己處理，Chrome 內建的清單指令會產生錯誤結構） ---------- */
function curList() { const r = curRange(); return r ? closestIn(r.startContainer, 'ul,ol') : null; }
const isList = n => n && n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL');
function selItems(r) {
  let items = [...editor.querySelectorAll('li')].filter(li => r.intersectsNode(li));
  return items.filter(li => !items.some(o => o !== li && li.contains(o)));
}
// 移動節點時保住游標：記下起訖點，被換掉的元素用 repl 對應到新元素
function withSel(fn) {
  const r = curRange();
  const a = r ? [r.startContainer, r.startOffset, r.endContainer, r.endOffset] : null;
  const repl = new Map();
  fn(repl);
  if (!a) return;
  const fix = (n, o) => { if (repl.has(n)) return [repl.get(n), Math.min(o, repl.get(n).childNodes.length)]; return [n, o]; };
  const [sn, so] = fix(a[0], a[1]), [en, eo] = fix(a[2], a[3]);
  if (sn.isConnected && en.isConnected && inEditor(sn)) {
    try { const nr = document.createRange(); nr.setStart(sn, Math.min(so, maxOff(sn))); nr.setEnd(en, Math.min(eo, maxOff(en))); setSel(nr); return; } catch (e) {}
  }
}
function retag(L, tag) {
  if (L.tagName.toLowerCase() === tag) return L;
  const n = document.createElement(tag);
  if (L.style.cssText) n.style.cssText = L.style.cssText;
  n.style.removeProperty('list-style-type');
  while (L.firstChild) n.appendChild(L.firstChild);
  L.replaceWith(n); return n;
}
function setType(L, tag, type) {
  const def = tag === 'ol' ? 'decimal' : 'disc';
  if (type && type !== def) L.style.listStyleType = type; else L.style.removeProperty('list-style-type');
  if (!L.getAttribute('style')) L.removeAttribute('style');
}
function unlistItem(li, repl) {
  const L = li.parentElement;
  const p = document.createElement('p');
  if (li.style.textAlign) p.style.textAlign = li.style.textAlign;
  const subs = [];
  [...li.childNodes].forEach(c => { if (isList(c)) subs.push(c); else p.appendChild(c); });
  if (!p.firstChild) p.innerHTML = '<br>';
  const after = []; let n = li.nextElementSibling; while (n) { after.push(n); n = n.nextElementSibling; }
  let L2 = null; if (after.length) { L2 = L.cloneNode(false); after.forEach(x => L2.appendChild(x)); }
  L.after(p); let ref = p;
  subs.forEach(sub => { ref.after(sub); ref = sub; });
  if (L2) ref.after(L2);
  li.remove(); if (!L.children.length) L.remove();
  repl.set(li, p);
}
function blocksForList(r) {
  let blocks = selectedBlocks(r).filter(b => !b.closest('li'));
  if (!blocks.length) {
    const b = blockOf(r.startContainer);
    if (b && /^(TD|TH)$/.test(b.tagName)) {
      const p = document.createElement('p'); while (b.firstChild) p.appendChild(b.firstChild); if (!p.firstChild) p.innerHTML = '<br>'; b.appendChild(p); blocks = [p];
    } else if (b && !/^(LI)$/.test(b.tagName)) blocks = [b];
  }
  return blocks.filter(b => /^(P|H1|H2|H3|DIV|BLOCKQUOTE)$/.test(b.tagName));
}
function makeList(tag, type) {
  const r = curRange();
  const items = r ? selItems(r) : [];
  withSel(repl => {
    const blocks = blocksForList(r);
    if (items.length) {
      const lists = [...new Set(items.map(li => li.parentElement))];
      const same = lists.every(L => L.tagName.toLowerCase() === tag);
      if (same && type == null && !blocks.length) { items.forEach(li => unlistItem(li, repl)); return; }   // 再按一次＝取消清單
      lists.forEach(L => { const n = retag(L, tag); repl.set(L, n); setType(n, tag, type != null ? type : lastListType[tag]); });
    }
    const groups = [];
    blocks.forEach(b => { const g = groups[groups.length - 1]; if (g && g[g.length - 1].nextElementSibling === b) g.push(b); else groups.push([b]); });
    groups.forEach(g => {
      const L = document.createElement(tag); setType(L, tag, type != null ? type : lastListType[tag]);
      g[0].before(L);
      g.forEach(b => {
        const li = document.createElement('li');
        if (b.style.textAlign) li.style.textAlign = b.style.textAlign;
        while (b.firstChild) li.appendChild(b.firstChild);
        if (!li.firstChild) li.innerHTML = '<br>';
        L.appendChild(li); repl.set(b, li); b.remove();
      });
      // 和前後同類型清單接起來（編號才會連續）
      const prev = L.previousElementSibling, next = L.nextElementSibling;
      const same = x => x && x.tagName === L.tagName && (x.style.listStyleType || '') === (L.style.listStyleType || '');
      if (same(next)) { while (next.firstChild) L.appendChild(next.firstChild); next.remove(); }
      if (same(prev)) { while (L.firstChild) prev.appendChild(L.firstChild); L.remove(); }
    });
  });
}
function toggleList(tag) { run(() => makeList(tag, null)); }
function setListType(tag, type) { lastListType[tag] = type; run(() => makeList(tag, type)); }
function indentItems(items) {
  items.forEach(li => {
    const prev = li.previousElementSibling; if (!prev) return;
    let sub = prev.lastElementChild && isList(prev.lastElementChild) ? prev.lastElementChild : null;
    if (!sub) { sub = document.createElement(li.parentElement.tagName.toLowerCase()); prev.appendChild(sub); }
    sub.appendChild(li);
    const own = li.lastElementChild && isList(li.lastElementChild) && li.lastElementChild.tagName === sub.tagName ? li.lastElementChild : null;
    if (own) { while (own.firstChild) sub.appendChild(own.firstChild); own.remove(); }
  });
}
function outdentItems(items, repl) {
  [...items].reverse().forEach(li => {
    const L = li.parentElement, parentLi = L.parentElement;
    if (!parentLi || parentLi.tagName !== 'LI') { unlistItem(li, repl); return; }
    const after = []; let n = li.nextElementSibling; while (n) { after.push(n); n = n.nextElementSibling; }
    if (after.length) {
      let sub = li.lastElementChild && isList(li.lastElementChild) ? li.lastElementChild : null;
      if (!sub) { sub = L.cloneNode(false); li.appendChild(sub); }
      after.forEach(x => sub.appendChild(x));
    }
    parentLi.after(li);
    if (!L.children.length) L.remove();
  });
}
function selectedBlocks(r) {
  let blocks = [...editor.querySelectorAll('p,h1,h2,h3,blockquote')].filter(b => r.intersectsNode(b) && !b.closest('li'));
  blocks = blocks.filter(b => !blocks.some(o => o !== b && b.contains(o)));
  return blocks;
}
function indent(dir) {
  run(r => {
    const items = selItems(r);
    if (items.length) { withSel(repl => (dir > 0 ? indentItems(items) : outdentItems(items, repl))); return; }
    selectedBlocks(r).forEach(b => {
      const em = (parseFloat(b.style.marginLeft) || 0) + dir * 2;
      if (em <= 0) { b.style.removeProperty('margin-left'); if (!b.getAttribute('style')) b.removeAttribute('style'); }
      else b.style.marginLeft = Math.min(em, 20) + 'em';
    });
  });
}

/* ---------- 插入區塊（圖片、表格、貼上內容共用） ---------- */
function insertBlocks(nodes) {
  const r = getSelection().getRangeAt(0);
  if (!r.collapsed) r.deleteContents();
  const blk = blockOf(r.startContainer);
  if (!blk || /^(LI|TD|TH)$/.test(blk.tagName)) {
    const frag = document.createDocumentFragment(); nodes.forEach(n => frag.appendChild(n));
    r.insertNode(frag);
    const last = nodes[nodes.length - 1];
    if (!blk) {
      let after = last.nextSibling;
      if (!after || !isBlockEl(after) || after.tagName === 'TABLE') { after = newP(); last.after(after); }
      return after;
    }
    const nr = document.createRange(); nr.setStartAfter(last); nr.collapse(true); setSel(nr);
    return null;
  }
  const tailR = document.createRange();
  tailR.setStart(r.startContainer, r.startOffset); tailR.setEnd(blk, blk.childNodes.length);
  const tail = tailR.extractContents();
  const blk2 = blk.cloneNode(false); blk2.appendChild(tail);
  const parent = blk.parentNode, ref = blk.nextSibling;
  nodes.forEach(n => parent.insertBefore(n, ref));
  let next;
  if (!isEmptyBlock(blk2)) { parent.insertBefore(blk2, ref); next = blk2; }
  else {
    const lastN = nodes[nodes.length - 1], sib = lastN.nextSibling;
    if (sib && isBlockEl(sib) && sib.tagName !== 'TABLE' && !sib.classList.contains('img-wrap')) next = sib;
    else { next = newP(); parent.insertBefore(next, ref); }
  }
  if (isEmptyBlock(blk)) blk.remove();
  return next;
}

/* ---------- 表格 ---------- */
function closestCell(n) { return closestIn(n, 'td,th'); }
function cellCtx() {
  const r = curRange() || savedRange; if (!r) return null;
  const td = closestCell(r.startContainer); if (!td) return null;
  const tr = td.parentElement, table = td.closest('table');
  return { td, tr, table, ci: td.cellIndex };
}
function insertTable(rows, cols) {
  run(r => {
    if (closestCell(r.startContainer)) { toast('表格裡不能再插入表格'); return; }
    const t = document.createElement('table'); t.className = 'doc-table';
    const tb = t.createTBody();
    for (let i = 0; i < rows; i++) { const tr = tb.insertRow(); for (let j = 0; j < cols; j++) tr.insertCell().innerHTML = '<br>'; }
    insertBlocks([t]);
    caretIn(t.rows[0].cells[0], true);
  });
}
function emptyCellLike(cell) { const n = document.createElement(cell ? cell.tagName.toLowerCase() : 'td'); n.innerHTML = '<br>'; return n; }
function addRow(dir) {
  run(() => {
    const c = cellCtx(); if (!c) return;
    const nr = c.tr.cloneNode(false);
    [...c.tr.cells].forEach(cell => nr.appendChild(emptyCellLike(cell)));
    dir < 0 ? c.tr.before(nr) : c.tr.after(nr);
    caretIn(nr.cells[Math.min(c.ci, nr.cells.length - 1)], true);
  });
}
function addCol(dir) {
  run(() => {
    const c = cellCtx(); if (!c) return;
    let mine = null;
    [...c.table.rows].forEach(row => {
      const ref = row.cells[Math.min(c.ci, row.cells.length - 1)];
      const n = emptyCellLike(ref);
      if (!ref) row.appendChild(n); else (dir < 0 ? ref.before(n) : ref.after(n));
      if (row === c.tr) mine = n;
    });
    if (mine) caretIn(mine, true);
  });
}
function removeTable(table) {
  let after = table.nextElementSibling;
  if (!after || after.tagName === 'TABLE') { after = newP(); table.after(after); }
  table.remove();
  caretIn(after, true);
}
function delRow() {
  run(() => {
    const c = cellCtx(); if (!c) return;
    if (c.table.rows.length <= 1) { removeTable(c.table); return; }
    const other = c.tr.nextElementSibling || c.tr.previousElementSibling;
    c.tr.remove();
    caretIn(other.cells[Math.min(c.ci, other.cells.length - 1)], true);
  });
}
function delCol() {
  run(() => {
    const c = cellCtx(); if (!c) return;
    const maxCols = Math.max(...[...c.table.rows].map(r => r.cells.length));
    if (maxCols <= 1) { removeTable(c.table); return; }
    [...c.table.rows].forEach(row => { if (row.cells[c.ci]) row.cells[c.ci].remove(); });
    const row = c.tr; caretIn(row.cells[Math.min(c.ci, row.cells.length - 1)], true);
  });
}
function delTable() { run(() => { const c = cellCtx(); if (c) removeTable(c.table); }); }
function tabCell(back) {
  const c = cellCtx(); if (!c) return false;
  const cells = [...c.table.querySelectorAll('td,th')];
  const target = cells[cells.indexOf(c.td) + (back ? -1 : 1)];
  if (!target) {
    if (back) return true;
    run(() => {
      const nr = c.tr.cloneNode(false);
      [...c.tr.cells].forEach(cell => nr.appendChild(emptyCellLike(cell)));
      c.tr.after(nr); caretIn(nr.cells[0], true);
    });
    return true;
  }
  if (hist.pending) commit();
  const r = document.createRange(); r.selectNodeContents(target);
  if (isEmptyBlock(target)) r.collapse(true);
  setSel(r);
  return true;
}

/* ---------- 圖片 ---------- */
const imgData = new Map(); // blob 網址 → data 網址（存草稿用）
function dataURLtoBlob(d) {
  const [head, body] = d.split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const bin = atob(body); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function registerDataURL(d) { const url = URL.createObjectURL(dataURLtoBlob(d)); imgData.set(url, d); return url; }
function blobToDataURL(b) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); }); }
async function registerBlob(b) { const d = await blobToDataURL(b); const url = URL.createObjectURL(b); imgData.set(url, d); return url; }
function loadImageEl(file) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
}
async function compressImage(file) {
  const LIMIT = 230 * 1024;
  const im = await loadImageEl(file);
  const w0 = im.naturalWidth, h0 = im.naturalHeight;
  if (file.size <= LIMIT && Math.max(w0, h0) <= 1600) return { blob: file, w: w0, h: h0 };
  let scale = Math.min(1, 1600 / Math.max(w0, h0)), q = 0.85, blob = null, cw = w0, ch = h0;
  for (let i = 0; i < 10; i++) {
    cw = Math.max(1, Math.round(w0 * scale)); ch = Math.max(1, Math.round(h0 * scale));
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); ctx.drawImage(im, 0, 0, cw, ch);
    blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size <= LIMIT) break;
    if (q > 0.62) q -= 0.08; else scale *= 0.82;
  }
  return { blob, w: cw, h: ch };
}
async function insertImages(files, range) {
  const list = [...files].filter(f => /^image\//.test(f.type));
  if (!list.length) return;
  toast('圖片處理中⋯');
  const items = [];
  for (const f of list) {
    try { const c = await compressImage(f); items.push({ url: await registerBlob(c.blob), w: c.w, h: c.h }); }
    catch (e) { console.error(e); toast('有一張圖片讀不出來，請換一張試試'); }
  }
  if (!items.length) return;
  editor.focus({ preventScroll: true });
  if (range && range.startContainer.isConnected && inEditor(range.startContainer)) setSel(range);
  run(() => {
    const nodes = items.map(it => {
      const p = document.createElement('p'); p.className = 'img-wrap'; p.style.textAlign = 'center';
      const img = document.createElement('img'); img.src = it.url; img.alt = '';
      if (it.w >= 400) img.style.width = (it.h > it.w ? 50 : 75) + '%';
      p.appendChild(img); return p;
    });
    const next = insertBlocks(nodes);
    if (next) caretIn(next, true);
  });
  toast(`已插入 ${items.length} 張圖片`);
}
function setImgSel(img) {
  if (selImg && selImg !== img) selImg.classList.remove('is-sel');
  selImg = img;
  if (img) img.classList.add('is-sel');
}
function clearImgSel() { if (selImg) { selImg.classList.remove('is-sel'); if (!selImg.className) selImg.removeAttribute('class'); } selImg = null; }
function selectImage(img) {
  if (hist.pending) commit();
  editor.focus({ preventScroll: true });
  const r = document.createRange(); r.selectNode(img); setSel(r);
  setImgSel(img);
  if (activeTab !== 'image') tabBeforeImage = activeTab;
  setCtxVisible('image', true); showTab('image');
}
function rangeIsNode(r, node) {
  const par = node.parentNode; if (!par) return false;
  const i = Array.prototype.indexOf.call(par.childNodes, node);
  return r.startContainer === par && r.endContainer === par && r.startOffset === i && r.endOffset === i + 1;
}
function imgWidth(pct) { const img = selImg; if (!img) return; run(() => { img.style.width = pct + '%'; const r = document.createRange(); r.selectNode(img); setSel(r); }); setImgSel(img); updateUI(); }
function imgAlign(a) {
  const img = selImg; if (!img) return;
  run(() => { const b = blockOf(img); if (b) b.style.textAlign = a; const r = document.createRange(); r.selectNode(img); setSel(r); });
  setImgSel(img); updateUI();
}
function delImage() {
  const img = selImg; if (!img) return;
  run(() => {
    const b = blockOf(img);
    img.remove(); clearImgSel();
    if (b && b.classList.contains('img-wrap') && isEmptyBlock(b)) { b.className = ''; b.removeAttribute('class'); b.removeAttribute('style'); b.innerHTML = '<br>'; caretIn(b, true); }
  });
}

/* ---------- 貼上：清理外來格式 ---------- */
const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'FORM', 'NOSCRIPT', 'TEMPLATE', 'O:P', 'XML', 'COLGROUP', 'COL']);
const MAP_TAGS = { H4: 'H3', H5: 'H3', H6: 'H3', DIV: 'P', SECTION: 'P', ARTICLE: 'P', HEADER: 'P', FOOTER: 'P', PRE: 'P', ADDRESS: 'P', FIGURE: 'P', FIGCAPTION: 'P', MAIN: 'P', ASIDE: 'P', DT: 'P', DD: 'P', STRONG: 'B', EM: 'I', DEL: 'S', STRIKE: 'S', INS: 'U', FONT: 'SPAN', MARK: 'SPAN', CODE: 'SPAN', SMALL: 'SPAN', BIG: 'SPAN', LABEL: 'SPAN', CITE: 'I', Q: 'SPAN' };
const KEEP_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'BLOCKQUOTE', 'B', 'I', 'U', 'S', 'SUB', 'SUP', 'SPAN', 'A', 'BR', 'IMG']);
const HAS_BLOCK_SEL = 'p,div,h1,h2,h3,h4,h5,h6,ul,ol,li,table,blockquote,section,article,pre';
function isDefaultColor(c) { const v = c.replace(/\s/g, '').toLowerCase(); return ['black', '#000', '#000000', 'rgb(0,0,0)', 'windowtext', 'inherit', 'initial', 'currentcolor', 'auto'].includes(v); }
function isNoBg(c) { const v = c.replace(/\s/g, '').toLowerCase(); return ['transparent', 'white', '#fff', '#ffffff', 'rgb(255,255,255)', 'rgba(0,0,0,0)', 'inherit', 'initial', 'window', 'none'].includes(v); }
function toPt(v) {
  const m = String(v).match(/^([\d.]+)(pt|px)$/); if (!m) return null;
  const n = parseFloat(m[1]); return Math.round((m[2] === 'px' ? n * 0.75 : n) * 2) / 2;
}
function copyStyles(src, dst, isBlock) {
  const s = src.style; if (!s) return;
  if (src.tagName === 'FONT' && src.getAttribute('color') && !isDefaultColor(src.getAttribute('color'))) dst.style.color = src.getAttribute('color');
  if (isBlock) {
    const ta = s.textAlign || src.getAttribute('align') || '';
    if (/^(center|right|justify)$/i.test(ta)) dst.style.textAlign = ta.toLowerCase();
    if (src.tagName === 'TD' || src.tagName === 'TH') { if (s.backgroundColor && !isNoBg(s.backgroundColor)) dst.style.backgroundColor = s.backgroundColor; }
    return;
  }
  if (s.color && !isDefaultColor(s.color)) dst.style.color = s.color;
  if (s.backgroundColor && !isNoBg(s.backgroundColor)) dst.style.backgroundColor = s.backgroundColor;
  const fw = s.fontWeight; if (fw === 'bold' || parseInt(fw, 10) >= 600) dst.style.fontWeight = 'bold';
  if (s.fontStyle === 'italic') dst.style.fontStyle = 'italic';
  const td = (s.textDecorationLine || s.textDecoration || '');
  const deco = [/underline/.test(td) && 'underline', /line-through/.test(td) && 'line-through'].filter(Boolean).join(' ');
  if (deco) dst.style.textDecorationLine = deco;
  const pt = toPt(s.fontSize); if (pt && pt !== 11 && pt !== 12) dst.style.fontSize = pt + 'pt';
  if (s.fontFamily) {
    const first = s.fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
    const f = FONTS.find(x => x.names.includes(first));
    if (f && f.key !== 'hei') dst.style.fontFamily = f.css;
  }
}
function cleanInto(src, out) {
  for (const ch of [...src.childNodes]) {
    if (ch.nodeType === 3) {
      const t = ch.data.replace(/[\r\n\t ]+/g, ' ');
      if (!t.trim() && out.nodeType === 1 && /^(TABLE|THEAD|TBODY|TFOOT|TR|UL|OL)$/.test(out.tagName)) continue;
      if (t) out.appendChild(document.createTextNode(t));
      continue;
    }
    if (ch.nodeType !== 1) continue;
    let tag = ch.tagName.toUpperCase();
    if (DROP_TAGS.has(tag)) continue;
    if (tag === 'IMG') {
      const src2 = ch.getAttribute('src') || '';
      let url = null;
      if (/^data:image\//.test(src2)) { try { url = registerDataURL(src2); } catch (e) {} }
      else if (/^blob:/.test(src2) && imgData.has(src2)) url = src2;
      else if (/^https?:/.test(src2)) url = src2;
      if (url) { const im = document.createElement('img'); im.src = url; im.alt = ''; const w = ch.style && ch.style.width; if (w && /%$/.test(w)) im.style.width = w; out.appendChild(im); }
      continue;
    }
    if ((tag === 'B' || tag === 'STRONG') && ch.style && /^(normal|400|300)$/.test(ch.style.fontWeight)) tag = 'SPAN';
    const mapped = MAP_TAGS[tag] || tag;
    const nestedBlock = ch.querySelector(HAS_BLOCK_SEL);
    if (!KEEP_TAGS.has(mapped) || ((mapped === 'P' || !BLOCKISH_RE.test(mapped)) && nestedBlock && mapped !== 'TD')) { cleanInto(ch, out); continue; }
    const el = document.createElement(mapped.toLowerCase());
    if (mapped === 'A') { const h = ch.getAttribute('href') || ''; if (/^https?:/i.test(h)) el.setAttribute('href', h); else { cleanInto(ch, out); continue; } }
    if (mapped === 'TD' || mapped === 'TH') { ['colspan', 'rowspan'].forEach(a => { const v = parseInt(ch.getAttribute(a), 10); if (v > 1) el.setAttribute(a, v); }); }
    if (mapped === 'TABLE') el.className = 'doc-table';
    if (tag === 'MARK') el.style.backgroundColor = '#FFFF00';
    if (mapped === 'SPAN' || mapped === 'B' || mapped === 'I' || mapped === 'U' || mapped === 'S' || mapped === 'A') copyStyles(ch, el, false);
    else if (/^(P|H1|H2|H3|LI|TD|TH|BLOCKQUOTE)$/.test(mapped)) copyStyles(ch, el, true);
    cleanInto(ch, el);
    if (mapped === 'SPAN' && !el.attributes.length) { out.append(...el.childNodes); continue; }
    if ((mapped === 'TD' || mapped === 'TH') && !el.firstChild) el.innerHTML = '<br>';
    if (mapped === 'TABLE' && !el.querySelector('tr')) continue;
    out.appendChild(el);
  }
}
function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const frag = document.createDocumentFragment();
  cleanInto(doc.body, frag);
  // 段落頭尾的多餘空白
  frag.querySelectorAll('p,h1,h2,h3,li,td,th').forEach(b => {
    const f = b.firstChild, l = b.lastChild;
    if (f && f.nodeType === 3) f.data = f.data.replace(/^\s+/, '');
    if (l && l.nodeType === 3) l.data = l.data.replace(/\s+$/, '');
  });
  frag.querySelectorAll('p,h1,h2,h3').forEach(b => { if (isEmptyBlock(b) && !b.querySelector('br')) b.remove(); });
  return frag;
}
function insertFragment(frag) {
  const kids = [...frag.childNodes];
  if (!kids.length) return;
  if (!kids.some(isBlockEl)) {
    const r = getSelection().getRangeAt(0); r.deleteContents();
    const last = frag.lastChild; r.insertNode(frag);
    const nr = document.createRange(); nr.setStartAfter(last); nr.collapse(true); setSel(nr);
    return;
  }
  const blocks = []; let run_ = null, list = null;
  kids.forEach(k => {
    if (k.nodeType === 1 && k.tagName === 'LI') { run_ = null; if (!list) { list = document.createElement('ul'); blocks.push(list); } list.appendChild(k); return; }
    list = null;
    if (k.nodeType === 1 && /^(TR|TD|TH|TBODY|THEAD)$/.test(k.tagName)) { const p = document.createElement('p'); p.textContent = k.textContent; blocks.push(p); run_ = null; return; }
    if (isBlockEl(k)) { run_ = null; blocks.push(k); return; }
    if (k.nodeType === 3 && !k.data.trim() && !run_) return;
    if (!run_) { run_ = document.createElement('p'); blocks.push(run_); }
    run_.appendChild(k);
  });
  const next = insertBlocks(blocks);
  if (next) {
    const lastB = blocks[blocks.length - 1];
    if (lastB && lastB.tagName !== 'TABLE' && lastB.isConnected) caretIn(lastB, false); else caretIn(next, true);
  }
}
function pasteText(text) {
  text = text.replace(/\r\n?/g, '\n');
  ec('insertText', text);
}

/* ---------- 功能區按鈕 ---------- */
const CMDS = {
  undo: doUndo, redo: doRedo,
  bold: () => run(() => ec('bold')), italic: () => run(() => ec('italic')),
  underline: () => run(() => ec('underline')), strike: () => run(() => ec('strikeThrough')),
  grow: () => stepSize(1), shrink: () => stepSize(-1),
  foreColor: () => run(() => ec('foreColor', lastFore, true)),
  hilite: () => run(() => ec('hiliteColor', lastHi === 'none' ? 'transparent' : lastHi, true)),
  clearFormat: () => run(r => {
    ec('removeFormat');
    ec('hiliteColor', 'transparent', true);
    ec('removeFormat');
    const b = blockOf(r.startContainer); if (b && /^H[1-3]$/.test(b.tagName)) ec('formatBlock', '<p>');
  }),
  ul: () => toggleList('ul'), ol: () => toggleList('ol'),
  indent: () => indent(1), outdent: () => indent(-1),
  alignLeft: () => run(() => ec('justifyLeft', null, true)), alignCenter: () => run(() => ec('justifyCenter', null, true)),
  alignRight: () => run(() => ec('justifyRight', null, true)), alignJustify: () => run(() => ec('justifyFull', null, true)),
  pickImage: () => { const r = curRange() || savedRange; pendingImageRange = r ? r.cloneRange() : null; $('#fileInput').click(); },
  rowAbove: () => addRow(-1), rowBelow: () => addRow(1), colLeft: () => addCol(-1), colRight: () => addCol(1),
  delRow, delCol, delTable, delImage,
};
let pendingImageRange = null;
$('#fileInput').addEventListener('change', e => { const files = [...e.target.files]; e.target.value = ''; insertImages(files, pendingImageRange); });

const ribbonAreas = ['#ribbon', '#tabs', ...$$('.pop').map(p => '#' + p.id)];
ribbonAreas.forEach(sel => {
  $(sel).addEventListener('mousedown', e => { if (e.target.closest('input')) return; if (e.target.closest('button,.tgrid i,.sw')) e.preventDefault(); });
});
$('#ribbon').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.pop) { togglePop(b.dataset.pop, b); return; }
  closePops();
  if (b.dataset.cmd && CMDS[b.dataset.cmd]) CMDS[b.dataset.cmd]();
  else if (b.dataset.block) run(() => ec('formatBlock', '<' + b.dataset.block + '>'));
  else if (b.dataset.imgw) imgWidth(+b.dataset.imgw);
  else if (b.dataset.imga) imgAlign(b.dataset.imga);
});

/* 字型大小輸入框 */
const sizeInput = $('#sizeInput');
function commitSizeInput() {
  const v = parseFloat(sizeInput.value);
  if (!isFinite(v) || v <= 0) { sizeInput.value = fmtPt(curSizePt()); toast('請輸入數字，例如 12'); return; }
  applySize(v);
}
sizeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitSizeInput(); } if (e.key === 'Escape') { editor.focus(); } });
sizeInput.addEventListener('focus', () => sizeInput.select());

/* ---------- 彈出選單 ---------- */
function buildPops() {
  $('#popFont').innerHTML = FONTS.map(f => `<button class="mi" data-font="${f.key}" type="button" style="font-family:${f.css.replace(/"/g, "'")}">${f.label}${f.key === 'hei' ? '（預設）' : ''}</button>`).join('') +
    '<div class="pop-note">Chromebook 沒有標楷體，<br>中文請選黑體或明體。</div>';
  $('#popSize').innerHTML = SIZES.map(s => `<button class="mi" data-size="${s}" type="button" style="justify-content:center;min-width:84px">${s}</button>`).join('');
  $$('.sw-grid').forEach(g => {
    g.innerHTML = COLORS[g.dataset.set].map(c => `<button class="sw" type="button" title="${c}" style="background:${c}" data-${g.dataset.kind === 'hi' ? 'hi' : 'color'}="${c}"></button>`).join('');
  });
  const tg = $('#tgrid'); let h = '';
  for (let r = 1; r <= 8; r++) for (let c = 1; c <= 10; c++) h += `<i data-r="${r}" data-c="${c}"></i>`;
  tg.innerHTML = h;
  tg.addEventListener('mouseover', e => {
    const i = e.target.closest('i'); if (!i) return;
    const R = +i.dataset.r, C = +i.dataset.c;
    tg.querySelectorAll('i').forEach(x => x.classList.toggle('hl', +x.dataset.r <= R && +x.dataset.c <= C));
    $('#tgridLabel').textContent = `插入 ${C} 欄 × ${R} 列表格`;
  });
  tg.addEventListener('mouseleave', () => { tg.querySelectorAll('i').forEach(x => x.classList.remove('hl')); $('#tgridLabel').textContent = '插入表格'; });
  tg.addEventListener('click', e => { const i = e.target.closest('i'); if (!i) return; closePops(); insertTable(+i.dataset.r, +i.dataset.c); });
}
buildPops();
let openPop = null;
function togglePop(id, anchor) {
  const p = $('#' + id);
  if (openPop === p) { closePops(); return; }
  closePops();
  p.classList.add('on'); openPop = p;
  const host = anchor.closest('.split,.size-combo') || anchor;
  const a = host.getBoundingClientRect();
  const left = Math.max(8, Math.min(a.left, innerWidth - p.offsetWidth - 8));
  p.style.left = left + 'px'; p.style.top = (a.bottom + 4) + 'px';
  if (id === 'popFont') { const cur = $('#fontLabel').textContent; p.querySelectorAll('.mi').forEach(m => m.classList.toggle('on', m.textContent.startsWith(cur))); }
  if (id === 'popSize') { const cur = sizeInput.value; p.querySelectorAll('.mi').forEach(m => m.classList.toggle('on', m.dataset.size === cur)); }
}
function closePops() { if (openPop) openPop.classList.remove('on'); openPop = null; }
document.addEventListener('mousedown', e => { if (openPop && !e.target.closest('.pop') && !e.target.closest('[data-pop]')) closePops(); });
$$('.pop').forEach(p => p.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.font) { closePops(); applyFont(FONTS.find(f => f.key === d.font)); }
  else if (d.size) { closePops(); applySize(+d.size); }
  else if (d.color) { closePops(); lastFore = d.color; $('#fcBar').style.background = d.color; CMDS.foreColor(); }
  else if (d.hi) { closePops(); lastHi = d.hi; $('#hiBar').style.background = d.hi === 'none' ? 'transparent' : d.hi; CMDS.hilite(); }
  else if (d.block) { closePops(); run(() => ec('formatBlock', '<' + d.block + '>')); }
  else if (d.ul) { closePops(); setListType('ul', d.ul); }
  else if (d.ol) { closePops(); setListType('ol', d.ol); }
}));

/* ---------- 索引標籤 ---------- */
let activeTab = 'home', tabBeforeImage = null;
function showTab(name) {
  activeTab = name;
  $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name));
  $$('.panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + name));
}
function setCtxVisible(name, vis) {
  const t = $(`.tab[data-tab="${name}"]`);
  if (t.hidden === !vis) return;
  t.hidden = !vis;
  if (!vis && activeTab === name) {
    let back = name === 'image' && tabBeforeImage ? tabBeforeImage : 'home';
    if ($(`.tab[data-tab="${back}"]`).hidden) back = 'home';
    showTab(back);
  }
}
$('#tabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) { closePops(); showTab(t.dataset.tab); } });

/* ---------- 工具列狀態同步 ---------- */
let uiQueued = false;
function scheduleUI() { if (!uiQueued) { uiQueued = true; requestAnimationFrame(() => { uiQueued = false; updateUI(); }); } }
function qState(c) {
  if (c === 'insertUnorderedList' || c === 'insertOrderedList') { const L = curList(); return !!L && L.tagName === (c === 'insertOrderedList' ? 'OL' : 'UL'); }
  try { return document.queryCommandState(c); } catch (e) { return false; } }
function updateUI() {
  const r = curRange();
  if (selImg && !(selImg.isConnected && r && rangeIsNode(r, selImg))) clearImgSel();
  setCtxVisible('image', !!selImg);
  setCtxVisible('table', !!(r && closestCell(r.startContainer)));
  updateUndoBtns();
  if (!r || document.activeElement !== editor) return;
  $$('[data-state]').forEach(b => b.classList.toggle('on', qState(b.dataset.state)));
  const el = elAtRange(r);
  $('#fontLabel').textContent = fontInfo(el).label;
  if (document.activeElement !== sizeInput) sizeInput.value = fmtPt(pxToPt(getComputedStyle(el).fontSize));
  const blk = closestIn(r.startContainer, 'h1,h2,h3');
  const tag = blk ? blk.tagName.toLowerCase() : 'p';
  $('#styleLabel').textContent = { p: '內文', h1: '標題 1', h2: '標題 2', h3: '標題 3' }[tag];
  $$('.sty-item').forEach(x => x.classList.toggle('on', x.dataset.block === tag));
  if (selImg) {
    const w = selImg.style.width;
    $$('[data-imgw]').forEach(b => b.classList.toggle('on', w === b.dataset.imgw + '%'));
    const b = blockOf(selImg); const ta = b ? (getComputedStyle(b).textAlign) : 'left';
    $$('[data-imga]').forEach(x => x.classList.toggle('on', x.dataset.imga === (ta === 'start' ? 'left' : ta)));
  }
}

/* ---------- 編輯區事件 ---------- */
function fixEmpty() {
  if (!editor.firstElementChild || (editor.childNodes.length === 1 && editor.firstChild.nodeName === 'BR')) {
    editor.innerHTML = '<p><br></p>'; caretIn(editor.firstChild, true);
  }
}
editor.addEventListener('keydown', e => {
  if (e.isComposing || e.keyCode === 229) return;
  fixEmpty();
  const mod = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
  if (mod && !e.altKey) {
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); return; }
    if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); doRedo(); return; }
    if (!e.shiftKey && k === 'b') { e.preventDefault(); CMDS.bold(); return; }
    if (!e.shiftKey && k === 'i') { e.preventDefault(); CMDS.italic(); return; }
    if (!e.shiftKey && k === 'u') { e.preventDefault(); CMDS.underline(); return; }
    if ((e.shiftKey && (e.code === 'Period' || e.key === '>')) || e.key === ']') { e.preventDefault(); stepSize(1); return; }
    if ((e.shiftKey && (e.code === 'Comma' || e.key === '<')) || e.key === '[') { e.preventDefault(); stepSize(-1); return; }
  }
  if (e.key === 'Tab' && !mod && !e.altKey) {
    e.preventDefault();
    if (tabCell(e.shiftKey)) return;
    if (curList()) { indent(e.shiftKey ? -1 : 1); return; }
    if (!e.shiftKey) run(() => ec('insertText', '\t'));
    return;
  }
  if ((e.key === 'Backspace' || e.key === 'Delete') && selImg) { e.preventDefault(); delImage(); return; }
  if (e.key === 'Backspace' && !mod && !e.shiftKey) {
    // 像 Word：在項目最前面按 Backspace，先拿掉項目符號
    const r = curRange();
    const li = r && r.collapsed ? closestIn(r.startContainer, 'li') : null;
    if (li) {
      const pre = document.createRange(); pre.setStart(li, 0); pre.setEnd(r.startContainer, r.startOffset);
      const frag = pre.cloneContents();
      if (!frag.textContent.replace(/\u200B/g, '') && !frag.querySelector('img,table')) {
        e.preventDefault();
        run(() => withSel(repl => { const L = li.parentElement; if (L.parentElement && L.parentElement.tagName === 'LI') outdentItems([li], repl); else unlistItem(li, repl); }));
        return;
      }
    }
  }
  if (e.key === 'Enter' && hist.pending) commit();
});
editor.addEventListener('beforeinput', e => {
  if (e.inputType === 'historyUndo') { e.preventDefault(); doUndo(); }
  else if (e.inputType === 'historyRedo') { e.preventDefault(); doRedo(); }
});
function dropRedundantStyles(root) {
  // Chrome 合併段落時常留下和外層相同的字級／字色，清掉以免格式越來越亂
  if (!root) return;
  const spans = [...root.querySelectorAll('span[style]')];
  if (!spans.length) return;
  withSel(() => {
    spans.forEach(sp => {
      ['fontSize', 'color'].forEach(prop => {
        if (!sp.style[prop]) return;
        const keep = sp.style[prop], withIt = getComputedStyle(sp)[prop];
        sp.style[prop] = '';
        if (getComputedStyle(sp)[prop] !== withIt) sp.style[prop] = keep;
      });
      if (!sp.getAttribute('style') || !sp.getAttribute('style').trim()) { sp.removeAttribute('style'); if (!sp.attributes.length) sp.replaceWith(...sp.childNodes); }
    });
  });
}
editor.addEventListener('input', e => {
  if (e.isComposing || composing) return;
  if (/^delete/.test(e.inputType || '')) { const r = curRange(); if (r) dropRedundantStyles(blockOf(r.startContainer)); }
  if (!editor.firstElementChild && !editor.textContent) fixEmpty();
  scheduleCommit(); changed();
});
editor.addEventListener('compositionstart', () => { composing = true; editor.classList.remove('is-empty'); });
editor.addEventListener('compositionend', () => { composing = false; scheduleCommit(); changed(); });
editor.addEventListener('mousedown', e => { if (e.target.tagName === 'IMG') { e.preventDefault(); selectImage(e.target); } });
editor.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
editor.addEventListener('paste', e => {
  const cd = e.clipboardData; if (!cd) return;
  const files = [...(cd.files || [])].filter(f => /^image\//.test(f.type));
  const html = cd.getData('text/html'), text = cd.getData('text/plain');
  const htmlHasText = html && new DOMParser().parseFromString(html, 'text/html').body.textContent.trim();
  if (files.length && !htmlHasText) { e.preventDefault(); const r = curRange(); insertImages(files, r && r.cloneRange()); return; }
  if (html) { e.preventDefault(); run(() => insertFragment(sanitize(html))); return; }
  if (text) { e.preventDefault(); run(() => pasteText(text)); }
});
editor.addEventListener('dragover', e => { if ([...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
editor.addEventListener('drop', e => {
  const files = [...(e.dataTransfer.files || [])].filter(f => /^image\//.test(f.type));
  if (!files.length) return;
  e.preventDefault();
  const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
  insertImages(files, r && inEditor(r.startContainer) ? r : null);
});

const grabSel = () => { const r = curRange(); if (r) savedRange = r.cloneRange(); };
['keyup', 'mouseup', 'blur'].forEach(ev => editor.addEventListener(ev, grabSel));
document.addEventListener('selectionchange', () => {
  const r = curRange();
  if (r) savedRange = r.cloneRange();
  if (r && !composing) {
    editor.querySelectorAll('span').forEach(s => {
      if (s.textContent === ZW && !s.contains(r.startContainer)) s.remove();
    });
  }
  scheduleUI();
});

/* ---------- 字數、空白提示、草稿 ---------- */
function updateEmpty() {
  const f = editor.firstElementChild;
  editor.classList.toggle('is-empty', !composing && editor.children.length === 1 && f.tagName === 'P' && isEmptyBlock(f));
}
function countWords() {
  const t = editor.innerText.replace(/​/g, '');
  const cjk = (t.match(/[㐀-鿿豈-﫿　-〿！-～]/g) || []).length;
  const latin = (t.replace(/[㐀-鿿豈-﫿　-〿！-～]/g, ' ').match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g) || []).length;
  return cjk + latin;
}
let countTimer = 0;
function changed() {
  updateEmpty();
  clearTimeout(countTimer); countTimer = setTimeout(() => { $('#wordCount').textContent = '字數：' + countWords(); }, 250);
  scheduleDraft(); scheduleUI();
}
/* ---------- 儲存：交給平台存進資料庫；連不上時先存在這台電腦 ---------- */
let H = {};            // 平台給的處理函式：onSave, onSubmit, onPreview, onBack
let noteKey = null;    // 目前開著的筆記 id
let saveTimer = 0, saving = null, submittedEver = false, baselineSig = null;
const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
function setSave(kind, msg) { const s = $('#saveState'); s.className = 'save ' + kind; s.textContent = msg; }
function serialize() {
  const c = editor.cloneNode(true);
  c.querySelectorAll('img').forEach(i => {
    i.classList.remove('is-sel'); if (!i.className) i.removeAttribute('class');
    const d = imgData.get(i.getAttribute('src')); if (d) i.setAttribute('src', d);
  });
  c.querySelectorAll('span').forEach(s => { if (s.textContent === ZW) s.remove(); });
  return c.innerHTML.replace(/​/g, '');
}
function plainText() { return (editor.innerText || '').replace(/​/g, '').replace(/\n{3,}/g, '\n\n').trim(); }
const currentSig = () => titleEl.value + '\u0001' + serialize();
function getData() { return { title: titleEl.value.trim(), html: serialize(), text: plainText(), words: countWords() }; }
const thumbCache = new Map();
function makeThumb() {
  const img = editor.querySelector('img'); if (!img) return Promise.resolve(null);
  const key = imgData.get(img.getAttribute('src')) || img.src;
  if (thumbCache.has(key)) return Promise.resolve(thumbCache.get(key));
  return new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const W = 480, H2 = 300, cv = document.createElement('canvas'); cv.width = W; cv.height = H2;
      const ctx = cv.getContext('2d'), s = Math.max(W / im.naturalWidth, H2 / im.naturalHeight);
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H2); ctx.drawImage(im, (W - w) / 2, (H2 - h) / 2, w, h);
      const d = cv.toDataURL('image/jpeg', 0.72); thumbCache.set(key, d); res(d);
    };
    im.onerror = () => res(null);
    im.src = img.src;
  });
}
function backupLocal() {
  if (!noteKey) return;
  try { localStorage.setItem('lr-backup-' + noteKey, JSON.stringify({ title: titleEl.value, html: serialize(), at: Date.now() })); } catch (e) {}
}
function refreshSubmitBtn() {
  const label = !submittedEver ? '送出' : (baselineSig !== null && baselineSig === currentSig()) ? '已送出' : '再次送出';
  $('#submitLabel').textContent = label;
}
function scheduleDraft() {
  if (!noteKey) return;
  setSave('', '編輯中⋯'); clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 1500);
}
async function flushSave() {
  clearTimeout(saveTimer);
  if (!noteKey || !H.onSave) return true;
  if (saving) { await saving.catch(() => {}); }
  if (hist.pending) commit();
  const key = noteKey;
  const run_ = (async () => {
    const data = getData(); data.thumb = await makeThumb();
    setSave('', '儲存中⋯');
    await H.onSave(data);
  })();
  saving = run_;
  try {
    await run_;
    if (key === noteKey) { try { localStorage.removeItem('lr-backup-' + key); } catch (e) {} setSave('ok', `已儲存 ${hhmm(new Date())}`); refreshSubmitBtn(); }
    return true;
  } catch (e) {
    console.error(e);
    backupLocal();
    if (key === noteKey) { setSave('warn', '沒有連上網路，先存在這台電腦，等一下會自動再存'); clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 8000); }
    return false;
  } finally { if (saving === run_) saving = null; }
}
titleEl.addEventListener('input', scheduleDraft);
titleEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); editor.focus(); caretIn(editor.firstElementChild || editor, true); } });
document.addEventListener('keydown', e => {
  if (!noteKey) return;
  if ((e.ctrlKey || e.metaKey) && (e.key || '').toLowerCase() === 's') { e.preventDefault(); flushSave().then(ok => toast(ok ? '已儲存' : '先存在這台電腦了')); }
  if (e.key === 'Escape') { closePops(); $$('#editorView .modal-bg.on').forEach(m => m.classList.remove('on')); }
});
addEventListener('pagehide', () => { if (noteKey) { if (hist.pending) commit(); backupLocal(); flushSave(); } });
document.addEventListener('visibilitychange', () => { if (noteKey && document.visibilityState === 'hidden') { backupLocal(); flushSave(); } });

/* ---------- 顯示比例 ---------- */
const zr = $('#zoomRange');
function setZoom(z) {
  z = Math.max(50, Math.min(200, Math.round(z / 10) * 10));
  page.style.zoom = z / 100; zr.value = z; $('#zoomLabel').textContent = z + '%';
  try { localStorage.setItem('lr-editor-zoom', z); } catch (e) {}
}
zr.addEventListener('input', () => setZoom(+zr.value));
$('#zoomIn').addEventListener('click', () => setZoom(+zr.value + 10));
$('#zoomOut').addEventListener('click', () => setZoom(+zr.value - 10));

/* ---------- 對話框、提示 ---------- */
let toastTimer = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2400); }
$$('#editorView .modal-bg').forEach(m => m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('on'); }));
$('#btnHelp').addEventListener('click', () => $('#helpModal').classList.add('on'));
$('#btnBack').addEventListener('click', async () => { await flushSave(); H.onBack && H.onBack(); });
$('#btnPreview').addEventListener('click', async () => { closePops(); await flushSave(); H.onPreview && H.onPreview(getData()); });

/* ---------- 送出 ---------- */
function openSubmit() {
  closePops(); if (hist.pending) commit();
  const m = $('#submitModal');
  const title = titleEl.value.trim();
  const empty = !editor.textContent.replace(/[​\s]/g, '') && !editor.querySelector('img,table');
  if (!title || empty) {
    $('#smTitle').textContent = '還差一點點';
    $('#smBody').innerHTML = `<p>${!title ? '這篇筆記還沒有<b>標題</b>。' : ''}${empty ? '內容還是空的，先寫一些再送出吧。' : ''}</p>`;
    $('#smActions').innerHTML = '<button class="pbtn" data-close type="button">回去寫</button>';
    m.classList.add('on');
    if (!title) m.addEventListener('click', function once(e) { if (e.target.closest('[data-close]')) { m.removeEventListener('click', once); setTimeout(() => titleEl.focus(), 0); } });
    return;
  }
  $('#smTitle').textContent = submittedEver ? '送出修改後的版本？' : '送出這篇筆記？';
  $('#smBody').innerHTML = `<p>送出後，這篇會出現在你的<b>學習紀錄頁</b>，老師也看得到。</p><p>之後還是可以回來修改，改好再按一次「送出」就會更新。</p><p style="color:var(--muted);font-size:16px">字數：${countWords()}　圖片：${editor.querySelectorAll('img').length} 張　表格：${editor.querySelectorAll('table').length} 個</p>`;
  $('#smActions').innerHTML = '<button class="sbtn" data-close type="button">再檢查一下</button><button class="dbtn" id="confirmSubmit" type="button">送出</button>';
  m.classList.add('on');
}
document.addEventListener('click', async e => {
  const b = e.target.closest('#confirmSubmit'); if (!b) return;
  b.disabled = true; b.textContent = '送出中⋯';
  const ok = await flushSave();
  if (!ok) { $('#submitModal').classList.remove('on'); toast('現在連不上網路，連上後再按一次送出'); return; }
  try {
    const data = getData(); data.thumb = await makeThumb();
    await H.onSubmit(data);
    submittedEver = true; baselineSig = currentSig(); refreshSubmitBtn();
    $('#submitModal').classList.remove('on');
    setSave('ok', `已送出 ${hhmm(new Date())}`);
    H.afterSubmit && H.afterSubmit();
  } catch (err) {
    console.error(err); $('#submitModal').classList.remove('on'); toast('送出沒有成功，請再按一次');
  }
});
$('#btnSubmit').addEventListener('click', openSubmit);

/* ---------- 給平台用的介面 ---------- */
function loadContent(title, html) {
  clearImgSel(); closePops();
  titleEl.value = title || '';
  editor.innerHTML = html || '<p><br></p>';
  editor.querySelectorAll('img').forEach(i => { const s = i.getAttribute('src') || ''; if (s.startsWith('data:')) { try { i.src = registerDataURL(s); } catch (e) {} } });
  fixEmpty();
  hist.stack = [{ html: snapHTML(), sel: null }]; hist.idx = 0; hist.pending = false; clearTimeout(hist.timer);
  updateEmpty(); updateUndoBtns();
  $('#wordCount').textContent = '字數：' + countWords();
}
window.LREditor = {
  open(note, handlers) {
    H = handlers || {}; noteKey = note.id;
    let title = note.title, html = note.content_html, restored = false;
    try {
      const b = JSON.parse(localStorage.getItem('lr-backup-' + note.id) || 'null');
      if (b && b.at > Date.parse(note.updated_at || 0) + 1000) { title = b.title; html = b.html; restored = true; }
    } catch (e) {}
    loadContent(title, html);
    submittedEver = !!note.submitted_at;
    baselineSig = (note.submitted_at && !restored && note.sub_html === note.content_html && (note.sub_title || '') === (note.title || '')) ? currentSig() : null;
    refreshSubmitBtn();
    showTab('home');
    let z0 = null; try { z0 = +localStorage.getItem('lr-editor-zoom') || null; } catch (e) {}
    setZoom(z0 || Math.max(60, Math.min(120, Math.floor((workspace.clientWidth - 40) / 794 * 10) * 10)));
    workspace.scrollTop = 0;
    if (restored) { scheduleDraft(); setTimeout(() => toast('找回了上次沒存到網路上的內容'), 300); }
    else setSave('', note.submitted_at ? `上次送出：${new Date(note.submitted_at).toLocaleString('zh-TW', { hour12: false })}` : '還沒送出（會自動存草稿）');
    setTimeout(() => { if (!titleEl.value) titleEl.focus(); else { editor.focus(); placeEnd(); } }, 50);
  },
  flush: flushSave,
  close() { clearTimeout(saveTimer); noteKey = null; H = {}; clearImgSel(); closePops(); },
  isOpen: () => !!noteKey,
};

// 測試用掛鉤
window.__editor = { sanitize, serialize, countWords, hist, applySize, insertTable, CMDS, compressImage };
})();
