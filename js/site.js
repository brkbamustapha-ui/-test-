/* iEat Fast Food — public site: 3D logo, curved pack shelf, detail sheet, dark mode, call sheet. */
(async function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const smooth = (t) => t * t * (3 - 2 * t);
  const mod = (a, n) => ((a % n) + n) % n;
  const pad = (n) => String(n).padStart(2, '0');
  const ar = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  const { state } = await IEAT.loadPublic();
  const S = state.site;
  const PACKS = state.packs.filter(p => p && !p.hidden);
  const MENU = state.menu || [];
  const CUR = S.currency || 'DA';

  /* ---------------- texts & static sections ---------------- */
  const telHref = (n) => { const d = String(n).replace(/[^\d+]/g, ''); return 'tel:' + (d.startsWith('+') ? d : d.startsWith('0') ? '+213' + d.slice(1) : d); };
  const minPrice = PACKS.length ? Math.min.apply(null, PACKS.map(p => +p.price || 0)) : 0;
  $$('[data-bind]').forEach(el => {
    const k = el.dataset.bind;
    if (k === 'minPrice') { el.textContent = minPrice; return; }
    if (k === 'heroTitle') { el.innerHTML = esc(S.heroTitle || '').replace(/\*(.+?)\*/g, '<em>$1</em>'); return; }
    if (S[k] != null) el.textContent = S[k];
  });
  document.title = (S.name || 'iEat Fast Food') + ' · ' + (S.city || 'Oran');
  $('#year').textContent = new Date().getFullYear();

  const ICONS = {
    facebook: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.2h2.8V22z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.6c-1.4.1-2.6-.3-3.9-1.1v5.6c0 7-7.6 9.2-10.6 4.2-2-3.2-.8-8.9 5.6-9.1v2.7c-.5.1-1 .2-1.4.4-1.4.5-2.2 1.4-2 3 .4 3.1 6.2 4 5.7-2V3z"/></svg>'
  };
  const socials = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok']].filter(([k]) => S[k]);
  $('#socials').innerHTML = socials.map(([k, n]) => `<a class="soc" href="${esc(S[k])}" target="_blank" rel="noopener" aria-label="${n}">${ICONS[k]}</a>`).join('');
  $('#footSocial').innerHTML = socials.map(([k, n]) => `<a href="${esc(S[k])}" target="_blank" rel="noopener">${n}</a>`).join('');
  const phones = (S.phones || []).filter(Boolean);
  const phoneSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';
  $('#phones').innerHTML = phones.map(p => `<a class="phone" href="${telHref(p)}">${phoneSvg}<span>${esc(p)}</span></a>`).join('');
  $('#csList').innerHTML = phones.map((p, i) => `<a class="cs-num" href="${telHref(p)}"><span>${esc(p)}</span><small>${i === 0 ? 'Mobile' : 'Fixe'} →</small></a>`).join('');
  $('#mapsBtn').href = S.mapsUrl || '#';
  if (S.lat && S.lng) $('#mapFrame').src = `https://maps.google.com/maps?q=${encodeURIComponent(S.lat + ',' + S.lng)}&z=16&output=embed`;

  // pack grid + à la carte
  $('#packGrid').innerHTML = PACKS.map((p, i) => `
    <button class="pk${p.available ? '' : ' off'}" type="button" data-i="${i}">
      <div class="pk-top"><span class="pk-num">Pack ${p.num}</span><span class="pk-price">${esc(p.price)}<small>${CUR}</small></span></div>
      <div class="pk-name">${esc(p.name)}</div>
      <div class="pk-img" style="background-image:url('${esc(p.img)}')"></div>
      <p class="pk-items">${(p.items || []).map(esc).join(' · ')}</p>
    </button>`).join('');
  const groups = {};
  MENU.forEach(m => { (groups[m.cat || 'Autres'] = groups[m.cat || 'Autres'] || []).push(m); });
  $('#menuList').innerHTML = Object.keys(groups).map(c => `<div class="mgroup"><h3>${esc(c)}</h3>${groups[c].map(m => `
      <div class="mrow${m.available ? '' : ' off'}"><span class="nm">${esc(m.name)}${m.desc ? `<span class="ds">${esc(m.desc)}</span>` : ''}</span>
      ${m.available ? (+m.price > 0 ? `<i class="dots"></i><span class="pr">${esc(m.price)} ${CUR}</span>` : '') : '<i class="dots"></i><span class="tag-off">Indisponible</span>'}</div>`).join('')}</div>`).join('');
  $('#availCount').textContent = PACKS.filter(p => p.available).length + ' / ' + PACKS.length + ' packs disponibles';

  /* ---------------- top bar ---------------- */
  const top = $('#top');
  const onScroll = () => top.classList.toggle('scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------------- call sheet ---------------- */
  const cs = $('#callsheet');
  const openCall = () => {
    if (phones.length === 1) { location.href = telHref(phones[0]); return; }
    cs.classList.add('on'); cs.setAttribute('aria-hidden', 'false');
    if (!RM) { $('.cs-card', cs).animate([{ transform: 'translate(-50%,120%)' }, { transform: 'translate(-50%,0)' }], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' }); }
  };
  const closeCall = () => { cs.classList.remove('on'); cs.setAttribute('aria-hidden', 'true'); };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-call]') && !e.target.closest('.d-call.disabled')) { e.preventDefault(); openCall(); }
    if (e.target.closest('#callsheet [data-close]')) closeCall();
  });

  /* ---------------- dark mode ---------------- */
  const themeBtn = $('#themeBtn');
  const metaTheme = $('meta[name="theme-color"]');
  const setTheme = (t) => { document.documentElement.dataset.theme = t; try { localStorage.setItem('ieat_theme', t); } catch (e) {} metaTheme.content = t === 'dark' ? '#130B08' : '#F6E7D2'; };
  setTheme(document.documentElement.dataset.theme || 'light');
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    themeBtn.classList.remove('spin'); void themeBtn.offsetWidth; themeBtn.classList.add('spin');
    const r = themeBtn.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    if (RM) { setTheme(next); return; }
    if (document.startViewTransition) {
      const vt = document.startViewTransition(() => setTheme(next));
      vt.ready.then(() => {
        document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
          { duration: 950, easing: 'cubic-bezier(.76,0,.18,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(() => {});
    } else {
      const w = $('#themeWipe');
      w.style.display = 'block'; w.style.background = next === 'dark' ? '#130B08' : '#F6E7D2';
      w.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] }, { duration: 750, easing: 'cubic-bezier(.76,0,.18,1)' })
        .finished.then(() => { setTheme(next); w.style.display = 'none'; });
    }
  });

  /* ---------------- 3D logo ---------------- */
  (function logo3d() {
    const rot = $('#l3rot'), stage = $('#logoStage'), floor = $('.logo-floor', stage);
    const LAYERS = 18, STEP = 1.5;
    let html = '';
    for (let i = LAYERS - 1; i >= 0; i--) {
      const b = i === 0 ? 1 : 0.32 + 0.25 * (1 - i / LAYERS);
      html += `<img class="l3-layer" src="/assets/logo.webp" alt="" style="transform:translateZ(${(-i * STEP).toFixed(1)}px);${i ? `filter:brightness(${b.toFixed(2)}) saturate(1.2)` : ''}">`;
    }
    html += '<div class="l3-glare" style="transform:translateZ(.6px)"></div>';
    rot.innerHTML = html;
    const glare = $('.l3-glare', rot);
    let px = 0, py = 0, tx = 0, ty = 0, spin = 0, visible = true, t0 = performance.now();
    addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width)));
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height)));
    }, { passive: true });
    stage.addEventListener('click', () => { spin += 360; });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);
    let last = t0, spinNow = 0;
    const outBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;
      px += (tx - px) * (1 - Math.exp(-5 * dt)); py += (ty - py) * (1 - Math.exp(-5 * dt));
      spinNow += (spin - spinNow) * (1 - Math.exp(-4 * dt));
      const intro = RM ? 1 : Math.min(1, t / 1.8), e = outBack(intro);
      const q = Math.max(0, Math.min(1, scrollY / innerHeight));
      const idle = RM ? 0 : 1;
      const ry = (1 - e) * -220 + idle * Math.sin(t * 0.7) * 16 + px * 26 + q * 70 + spinNow;
      const rx = (1 - e) * 30 + idle * Math.cos(t * 0.55) * 5 - py * 16 - q * 10;
      const fy = idle * Math.sin(t * 1.1) * 10;
      const sc = (0.4 + 0.6 * e) * (1 - q * 0.18);
      rot.style.transform = `translateY(${fy.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      glare.style.backgroundPosition = `${(50 - (ry % 360) * 1.2).toFixed(1)}% 0`;
      floor.style.transform = `scale(${(1 - fy / 60).toFixed(3)},1)`;
    }
    requestAnimationFrame(frame);
  })();

  /* ---------------- curved pack shelf ---------------- */
  const N = PACKS.length;
  const sec = $('#packs');
  if (!N) { sec.style.display = 'none'; return; }
  const COPIES = Math.max(3, Math.ceil(36 / N));
  const LOOP = N * COPIES, HALF = LOOP / 2;
  const TONES = ['dark', 'coral', 'cream', 'orange'];
  const stage = $('#stage'), shelf = $('#shelf'), probe = $('#probe');
  const logoSm = '/assets/logo.webp';

  const coverHTML = (p, i) => `
    <div class="cv-top"><span>${esc(S.name || 'iEat')}</span><img src="${logoSm}" alt=""></div>
    <div class="cv-pack">Pack</div>
    <div class="cv-num">${pad(p.num)}</div>
    <div class="cv-name">${esc(p.name)}</div>
    <div class="cv-photo" style="background-image:url('${esc(p.img)}')"></div>
    <ul class="cv-items">${(p.items || []).slice(0, 5).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="cv-foot"><span class="cv-price">${esc(p.price)}<small>${CUR}</small></span><span class="cv-badge">${esc((S.city || 'ORAN').toUpperCase())}</span></div>
    ${p.available ? '' : '<div class="cv-off">ÉPUISÉ</div>'}`;
  const spineHTML = (p) => `
    <img src="${logoSm}" alt="">
    <div class="sp-num">Pack <b>${pad(p.num)}</b></div>
    <div class="sp-name">${esc(p.name)}</div>
    <div class="sp-price">${esc(p.price)} ${CUR}</div>`;

  const tapes = [];
  const frag = document.createDocumentFragment();
  for (let v = 0; v < LOOP; v++) {
    const i = v % N, p = PACKS[i], tone = TONES[i % 4];
    const el = document.createElement('div');
    el.className = 'tape'; el.dataset.v = v;
    el.innerHTML = `<div class="face sp${p.available ? '' : ' off'}" data-tone="${tone}">${spineHTML(p)}</div><div class="face cv" data-tone="${tone}">${coverHTML(p, i)}</div>`;
    frag.appendChild(el);
    tapes.push({ el, sp: el.children[0], cv: el.children[1], v, i, lift: 0, hidden: false });
  }
  stage.appendChild(frag);

  // geometry
  let W, Hs, H, ws, d, gap, U, XS = [], secTop = 0, shelfCY = 0;
  const P = 1400;
  function measure() {
    W = sec.clientWidth; Hs = sec.clientHeight;
    H = probe.offsetHeight;
    ws = H * 142 / 840; d = H * 474 / 900; gap = H * 0.035;
    U = H * (innerWidth < 768 ? 1.05 : 1.3);
    XS = [0]; let acc = 0;
    for (let u = 0; u < 3 * U; u += 2) { acc += 2 / (1 + Math.pow(u / U, 1.6)); XS.push(acc); }
    tapes.forEach(t => {
      t.sp.style.cssText = `width:${ws}px;left:${-ws / 2}px;transform:translateZ(${d / 2}px)`;
      t.cv.style.cssText = `width:${d}px;left:${-d / 2}px;transform:rotateY(90deg) translateZ(${ws / 2}px)`;
    });
    shelfCY = shelf.offsetTop + shelf.offsetHeight / 2;
    // ticks
    let tk = '';
    PACKS.forEach((p, i) => {
      const x = N > 1 ? i / (N - 1) * 100 : 50;
      tk += `<i class="maj" style="left:${x}%"></i><span class="${i % 2 ? 'odd' : ''}" style="left:${x}%">${pad(p.num)}</span>`;
      if (i < N - 1) for (let m = 1; m < 4; m++) tk += `<i class="min" style="left:${x + m / 4 * (100 / (N - 1))}%"></i>`;
    });
    $('#tlTicks').innerHTML = tk;
  }
  const scl = (u) => 1 / (1 + Math.pow(Math.abs(u) / U, 1.6));
  const xsc = (u) => { const a = Math.abs(u) / 2, i = Math.floor(a), f = a - i; const v = i + 1 < XS.length ? XS[i] + (XS[i + 1] - XS[i]) * f : XS[XS.length - 1]; return Math.sign(u) * v; };
  const B = (r) => Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : Math.sign(r) * 0.5;
  const F = (r) => r * (ws + gap) + (d - ws + 1.4 * gap) * B(r);
  const rel = (v, s) => { let r = mod(v - s, LOOP); if (r >= HALF) r -= LOOP; return r; };

  // state
  const startIdx = Math.max(0, PACKS.findIndex(p => p.num === 5));
  let T = Math.floor(COPIES / 2) * N + startIdx, s = T;
  let dragging = false, dragMoved = false, x0 = 0, T0 = 0, downTape = null, wheelTimer = 0;
  let tiltX = 0, tiltY = 0, mx = -1e4, my = -1e4, hoverTape = null, onCover = false;
  let active = -1, dot = -1, detailOpen = false, secVisible = true;

  // caption swap (mask slide)
  const capT = $('.m-title'), capS = $('.m-sub'), capY = $('.m-year');
  function swap(mask, text, dir, cls) {
    const olds = Array.from(mask.children);
    const n = document.createElement('span'); if (cls) n.className = cls; n.textContent = text;
    mask.appendChild(n);
    if (RM || dir === 0) { olds.forEach(o => o.remove()); return; }
    n.animate([{ transform: `translateY(${dir * 105}%)` }, { transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    olds.forEach(o => {
      const cur = getComputedStyle(o).transform;
      o.getAnimations().forEach(a => a.cancel());
      o.animate([{ transform: cur === 'none' ? 'translateY(0)' : cur }, { transform: `translateY(${-dir * 105}%)` }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }).finished.then(() => o.remove(), () => o.remove());
    });
  }
  function setCaption(i, dir) {
    const p = PACKS[i];
    swap(capT, p.name, dir);
    swap(capS, `PACK ${pad(p.num)} / باك ${ar(p.num)}`, dir, 'lbl');
    swap(capY, `${p.price} ${CUR} — ${(p.cat || '').toUpperCase()}${p.available ? '' : ' — INDISPONIBLE'}`, dir);
  }

  // inputs
  const tapeOf = (el) => { const t = el && el.closest && el.closest('.tape'); return t ? tapes[+t.dataset.v] : null; };
  shelf.addEventListener('pointerdown', (e) => {
    if (detailOpen || e.button > 0) return;
    dragging = true; dragMoved = false; x0 = e.clientX; T0 = T; downTape = tapeOf(e.target);
  });
  addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    hoverTape = tapeOf(e.target);
    if (!dragging) return;
    const dx = e.clientX - x0;
    if (!dragMoved && Math.abs(dx) > 5) { dragMoved = true; try { shelf.setPointerCapture(e.pointerId); } catch (er) {} }
    if (dragMoved) T = T0 - dx / (ws + gap);
  }, { passive: true });
  const endDrag = () => {
    if (!dragging) return; dragging = false;
    if (dragMoved) { T = Math.round(T); return; }
    if (downTape) {
      const r = rel(downTape.v, s);
      if (Math.abs(r) < 0.5 && Math.abs(T - s) < 0.3) openDetail(); else T = Math.round(T + rel(downTape.v, T));
    }
  };
  addEventListener('pointerup', endDrag); addEventListener('pointercancel', () => { dragging = false; T = Math.round(T); });
  shelf.addEventListener('wheel', (e) => {
    if (detailOpen || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    T += e.deltaX / (ws + gap) * 0.5;
    clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { T = Math.round(T); }, 160);
  }, { passive: false });
  $('#prev').addEventListener('click', () => { T = Math.round(T) - 1; });
  $('#next').addEventListener('click', () => { T = Math.round(T) + 1; });
  $('#play').addEventListener('click', () => openDetail());
  $('#tlHit').addEventListener('click', (e) => {
    const r = e.currentTarget.parentElement.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    goTo(Math.round(f * (N - 1)));
  });
  function goTo(i) { const cur = mod(Math.round(T), N); let diff = i - cur; if (diff > N / 2) diff -= N; if (diff < -N / 2) diff += N; T = Math.round(T) + diff; }
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (cs.classList.contains('on')) closeCall(); else if (detailOpen) closeDetail(); return; }
    if (detailOpen || !secVisible || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowLeft') { T = Math.round(T) - 1; e.preventDefault(); }
    if (e.key === 'ArrowRight') { T = Math.round(T) + 1; e.preventDefault(); }
    if (e.key === 'Enter' && document.activeElement === document.body) openDetail();
  });
  $('#packGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.pk'); if (!b) return;
    goTo(+b.dataset.i);
    sec.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
    const wait = () => { if (Math.abs(T - s) < 0.02 && Math.abs(sec.getBoundingClientRect().top) < 4) openDetail(); else requestAnimationFrame(wait); };
    setTimeout(() => requestAnimationFrame(wait), 300);
  });
  new IntersectionObserver(([e]) => { secVisible = e.intersectionRatio > 0.4; }, { threshold: [0, 0.4, 1] }).observe(sec);

  // cursor
  const cur = $('#cursor'); let cx = -100, cy = -100;
  const play = $('#play');

  // main loop
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const rect = sec.getBoundingClientRect();
    const inView = rect.bottom > 0 && rect.top < innerHeight;
    if (!inView && !detailOpen) return;

    const k = dragging && dragMoved ? 18 : 5.2;
    s = RM ? T : s + (T - s) * (1 - Math.exp(-k * dt));
    if (Math.abs(s) > 4 * LOOP) { const sh = Math.sign(s) * 4 * LOOP; s -= sh; T -= sh; T0 -= sh; }

    const ai = mod(Math.round(s), N);
    if (ai !== active) { const dir = active < 0 ? 0 : (Math.sign(T - s) || 1); active = ai; setCaption(ai, dir); }

    // timeline dot
    const fl = Math.floor(s), a = mod(fl, N), b = mod(fl + 1, N), f = s - fl;
    const pos = (i) => N > 1 ? i / (N - 1) : 0.5;
    const target = b === 0 ? (f < 0.5 ? pos(a) : pos(b)) : pos(a) + (pos(b) - pos(a)) * f;
    if (dot < 0 || Math.abs(target - dot) > 6 / 35) dot = target; else dot += (target - dot) * (1 - Math.exp(-14 * dt));
    $('#tlDot').style.left = (dot * 100) + '%';

    // tilt
    const settled = Math.abs(T - s) < 0.3;
    const scy = rect.top + shelfCY;
    onCover = !detailOpen && settled && Math.abs(mx - (rect.left + W / 2)) < 0.55 * d && Math.abs(my - scy) < 0.55 * H;
    const tY = onCover ? (mx - (rect.left + W / 2)) / (0.55 * d) * 8 : (mx > -1e3 ? (mx - W / 2) / W * 4 : 0);
    const tX = onCover ? -(my - scy) / (H / 2) * 5 : 0;
    tiltY += (tY - tiltY) * (1 - Math.exp(-7 * dt));
    tiltX += (tX - tiltX) * (1 - Math.exp(-7 * dt));

    for (let n = 0; n < tapes.length; n++) {
      const t = tapes[n];
      const r = rel(t.v, s);
      const o = smooth(Math.max(0, 1 - Math.abs(r)));
      const u = F(r);
      if (Math.abs(u) > U * 1.95) { if (!t.hidden) { t.el.style.visibility = 'hidden'; t.hidden = true; } continue; }
      if (t.hidden) { t.el.style.visibility = ''; t.hidden = false; }
      const lt = (hoverTape === t && Math.abs(r) > 0.5 && !dragMoved) ? 1 : 0;
      t.lift = RM ? lt : t.lift + (lt - t.lift) * (1 - Math.exp(-12 * dt));
      const sc = scl(u), kk = 1 / sc;
      const z = P * (1 - kk) + o * H * 0.1;
      const x = xsc(u) * kk;
      const y = (H * 0.5 * (1 - sc) * 0.42 + o * H * 0.012 - t.lift * H * 0.05) * kk;
      const ry = Math.sign(u) * Math.min(1, Math.abs(u) / U) * 26 * (1 - o) - 90 * o + tiltY * o;
      const rx = tiltX * o;
      t.el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      t.el.style.zIndex = Math.round(3000 + z);
      t.sp.style.setProperty('--shade', Math.min(0.6, o * 0.55 + (1 - sc) * 0.32).toFixed(3));
      t.cv.style.setProperty('--shade', ((1 - o) * 0.82).toFixed(3));
    }

    // play ring
    const ps = detailOpen ? 0 : smooth(Math.max(0, 1 - Math.abs(T - s) * 3));
    play.style.left = (W / 2 - d / 2 - 6) + 'px';
    play.style.top = (shelfCY + 0.36 * H) + 'px';
    play.style.transform = `scale(${ps.toFixed(3)})`;

    // cursor
    if (FINE) {
      const inside = !detailOpen && mx >= rect.left && mx <= rect.right && my >= rect.top && my <= rect.bottom;
      cur.classList.toggle('on', inside);
      if (inside) {
        cx += (mx - cx) * (1 - Math.exp(-16 * dt)); cy += (my - cy) * (1 - Math.exp(-16 * dt));
        if (Math.abs(cx - mx) > 400) { cx = mx; cy = my; }
        cur.style.transform = `translate3d(${cx}px,${cy}px,0)`;
        const el = document.elementFromPoint(mx, my);
        const isBtn = !!(el && el.closest('button,a,.timeline'));
        cur.classList.toggle('open', onCover && !isBtn);
        cur.classList.toggle('btn', isBtn && !onCover);
        cur.classList.toggle('spine', !onCover && !isBtn && !!hoverTape);
      }
    }
  }
  measure();
  addEventListener('resize', () => { measure(); });
  requestAnimationFrame(frame);

  /* ---------------- detail sheet ---------------- */
  const detail = $('#detail');
  const circles = $$('#inkG circle');
  let inkStart = 0, inkRaf = 0, clipAnim = null;
  function activeTape() {
    let best = null, bd = 1e9;
    tapes.forEach(t => { const r = Math.abs(rel(t.v, s)); if (r < bd) { bd = r; best = t; } });
    return best;
  }
  function posterArt(p, tone) {
    const bg = { dark: '#2A1410', coral: '#D9503A', cream: '#F3DDBF', orange: '#E98E2B' }[tone];
    const fg = tone === 'dark' || tone === 'coral' ? '#F6E7D2' : '#2A1410';
    const acc = tone === 'cream' ? '#D9503A' : tone === 'dark' ? '#F09A34' : '#2A1410';
    return `
      <rect width="474" height="900" fill="${bg}"/>
      <pattern id="htp" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" fill="#000" opacity=".22"/></pattern>
      <text x="36" y="64" fill="${fg}" font-family="Inter Tight" font-weight="700" font-size="15" letter-spacing="3">${esc((S.name || '').toUpperCase())} · ${esc((S.city || '').toUpperCase())}</text>
      <text x="36" y="132" fill="${fg}" font-family="Inter Tight" font-weight="800" font-size="22" letter-spacing="9" opacity=".8">PACK</text>
      <text x="30" y="270" fill="${acc}" font-family="Lobster" font-size="170">${pad(p.num)}</text>
      <image href="${esc(p.img)}" x="0" y="300" width="474" height="330" preserveAspectRatio="xMidYMid slice"/>
      <rect x="0" y="300" width="474" height="330" fill="url(#htp)"/>
      <text x="36" y="700" fill="${fg}" font-family="Inter Tight" font-weight="800" font-size="40" letter-spacing="-1">${esc(p.name.toUpperCase())}</text>
      <text x="36" y="740" fill="${fg}" font-family="Inter Tight" font-weight="600" font-size="14" letter-spacing="2" opacity=".75">${esc((p.items || []).length)} ARTICLES · ${esc((p.cat || '').toUpperCase())}</text>
      <text x="36" y="842" fill="${fg}" font-family="Inter Tight" font-weight="800" font-size="64" letter-spacing="-2">${esc(p.price)}<tspan font-size="22" letter-spacing="2" dx="6">${CUR}</tspan></text>
      <rect x="352" y="804" width="86" height="40" fill="none" stroke="${fg}" stroke-width="2"/>
      <text x="395" y="830" text-anchor="middle" fill="${fg}" font-family="Inter Tight" font-weight="800" font-size="15" letter-spacing="2">${p.available ? 'DISPO' : 'ÉPUISÉ'}</text>`;
  }
  function inkLoop(now) {
    const el = now - inkStart - 520;
    let done = true;
    circles.forEach(c => {
      const t = Math.max(0, Math.min(1, (el - +c.dataset.d) / 1250));
      if (t < 1) done = false;
      c.setAttribute('r', (720 * (1 - Math.pow(1 - t, 3))).toFixed(1));
    });
    if (!done) inkRaf = requestAnimationFrame(inkLoop);
  }
  function openDetail() {
    if (detailOpen) return;
    T = Math.round(T);
    const i = mod(Math.round(T), N), p = PACKS[i], tone = TONES[i % 4];
    $('#dSub').textContent = `PACK ${pad(p.num)} / باك ${ar(p.num)}`;
    $('#dTitle').textContent = p.name;
    $('#dMeta').textContent = `${p.price} ${CUR} / ${(p.cat || '').toUpperCase()} / ${(p.items || []).length} articles`;
    $('#dItems').innerHTML = (p.items || []).map(x => `<li>${esc(x)}</li>`).join('');
    const call = $('#dCall');
    call.classList.toggle('disabled', !p.available);
    call.firstElementChild.textContent = p.available ? 'Appeler pour commander / اطلب الآن' : 'Indisponible aujourd’hui';
    $('#posterArt').innerHTML = posterArt(p, tone);
    circles.forEach(c => c.setAttribute('r', 0));
    const at = activeTape();
    const r = at.cv.getBoundingClientRect();
    detailOpen = true; cur.classList.remove('on');
    detail.classList.add('on'); detail.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    const from = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 3px)`;
    const D = RM ? 1 : 1050;
    clipAnim = detail.animate([{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: D, easing: 'cubic-bezier(.76,0,.18,1)', fill: 'both' });
    $$('.d-text .mask > *', detail).forEach((el, n) => {
      el.getAnimations().forEach(a => a.cancel());
      el.animate([{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: RM ? 1 : 900, delay: RM ? 0 : 620 + n * 75, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    });
    cancelAnimationFrame(inkRaf);
    inkStart = performance.now() - (RM ? 5000 : 0);
    inkRaf = requestAnimationFrame(inkLoop);
    setTimeout(() => $('#dClose').focus({ preventScroll: true }), RM ? 0 : 700);
  }
  function closeDetail() {
    if (!detailOpen) return;
    const at = activeTape(); const r = at.cv.getBoundingClientRect();
    const to = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 3px)`;
    if (clipAnim) clipAnim.cancel();
    const a = detail.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: to }], { duration: RM ? 1 : 850, easing: 'cubic-bezier(.76,0,.18,1)', fill: 'both' });
    a.finished.then(() => {
      detail.classList.remove('on'); detail.setAttribute('aria-hidden', 'true');
      detail.getAnimations({ subtree: true }).forEach(x => x.cancel());
      cancelAnimationFrame(inkRaf);
      document.documentElement.style.overflow = '';
      detailOpen = false;
    });
  }
  $('#dClose').addEventListener('click', closeDetail);
})();
