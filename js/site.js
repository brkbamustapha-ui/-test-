/* iEat Fast Food — public site: 3D logo, "à ta façon" hero, detail sheet, dark mode, call sheet. */
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


  /* ---------------- "à ta façon" hero: one clock ---------------- */
  (function vela() {
    const sec = $('#offre'); if (!sec) return;
    const WORDS = [
      { w: 'Savoure',   icon: 'star',  tint: '#F2772F' },
      { w: 'Économise', icon: 'coin',  tint: '#3FB874' },
      { w: 'Partage',   icon: 'globe', tint: '#C564C4' },
      { w: 'Commande',  icon: 'chat',  tint: '#E9C22E' }
    ];
    const SLOT = 1.75, ENTER = 0.5, LEAVE = 0.42, XF = 0.77;
    const layers = $$('.v-layer', sec), ico = $('#vIco'), img = $('#vImg'), tint = $('#vTint'), word = $('#vWord');
    const src = (n) => '/assets/icons/' + n + '.webp';
    WORDS.forEach(x => { const im = new Image(); im.src = src(x.icon); });
    // dynamic texts
    const ph = phones.slice(0, 2);
    const glyph = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/></svg>';
    $('#vStores').innerHTML = ph.map((p, i) => `<a class="v-store" href="${telHref(p)}">${glyph}<span><small>${i === 0 ? 'Appelle le mobile' : 'Appelle le fixe'}</small><b>${esc(p)}</b></span></a>`).join('');
    $('#vStat1').textContent = PACKS.length;
    $('#vStat2').textContent = minPrice + ' ' + CUR;
    $('#vCap').innerHTML = `Burgers, tacos, pizzas et sandwichs préparés à la commande <br>à ${esc(S.address || 'Belgaïd, Oran')}. ${PACKS.length} packs dès ${minPrice} ${CUR}, boisson incluse.`;
    const store0 = $('.v-store', sec);
    // tint: CSS mask on the icon's own shape (same-origin); fall back to the plain icon if the mask can't load
    const setIcon = (x) => {
      img.src = src(x.icon); ico.style.setProperty('--tint', x.tint);
      ico.style.setProperty('--m', `url("${src(x.icon)}")`);
    };
    img.addEventListener('error', () => { ico.style.visibility = 'hidden'; });
    img.addEventListener('load', () => { ico.style.visibility = ''; });
    const easeOut = (t) => 1 - Math.pow(1 - t, 3), easeIn = (t) => t * t * t;
    const cl = (t) => Math.max(0, Math.min(1, t));
    const sm = (t) => t * t * (3 - 2 * t);

    // the one clock: a long Web Animation whose currentTime everything reads
    const clock = document.createElement('i').animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1e9 });
    document.addEventListener('visibilitychange', () => { document.hidden ? clock.pause() : clock.play(); });
    let cur = -1, visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(sec);

    function paint(t, idx, local) {
      if (idx !== cur) { cur = idx; word.textContent = WORDS[idx].w; setIcon(WORDS[idx]); }
      const eo = easeOut(cl(local / ENTER)), ei = easeOut(cl((local - 0.06) / ENTER));
      const li = easeIn(cl((local - (SLOT - LEAVE)) / LEAVE));
      const op = eo * (1 - li);
      word.style.opacity = op.toFixed(3);
      word.style.transform = `translateY(${((1 - eo) * 0.32 - li * 0.16).toFixed(4)}em) scale(${(0.96 + 0.04 * eo).toFixed(4)})`;
      word.style.filter = `blur(${(10 * (1 - eo) + 8 * li).toFixed(2)}px)`;
      const bob = Math.sin(t * 1.7) * 0.028, sway = Math.sin(t * 1.25) * 3;
      ico.style.opacity = (eo > 0 ? ei : 0) * (1 - li);
      ico.style.transform = `translateY(${(bob - li * 0.16 + (1 - ei) * 0.12).toFixed(4)}em) rotate(${(-14 * (1 - ei) + sway).toFixed(2)}deg) scale(${(0.7 + 0.3 * ei).toFixed(4)})`;
      ico.style.filter = li > 0 ? `blur(${(8 * li).toFixed(2)}px)` : '';
      // panel colour: 0.77 s crossfade straddling each word change
      const h = XF / 2; let a = idx, b = idx, p = 0;
      if (local > SLOT - h) { b = (idx + 1) % 4; p = (local - (SLOT - h)) / XF; }
      else if (local < h) { a = (idx + 3) % 4; b = idx; p = (local + h) / XF; }
      p = sm(cl(p));
      layers.forEach((L, i) => {
        const o = a === b ? (i === a ? 1 : 0) : (i === a ? 1 - p : i === b ? p : 0);
        L.style.opacity = o.toFixed(3);
        if (o > 0) L.style.transform = `translate(${(Math.sin(t * 0.21 + i * 1.7) * 2.2).toFixed(3)}%,${(Math.cos(t * 0.17 + i) * 1.6).toFixed(3)}%) scale(1.08)`;
      });
      if (store0) store0.classList.toggle('lit', idx === 3 && local > 0.25 && local < SLOT - 0.3);
    }
    if (RM) { paint(0, 0, ENTER + 0.2); word.style.filter = ''; return; }
    function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      const t = (clock.currentTime || 0) / 1000;
      const idx = Math.floor(t / SLOT) % 4, local = t % SLOT;
      paint(t, idx, local);
    }
    requestAnimationFrame(frame);
  })();

  /* ---------------- detail sheet (opens from a pack card) ---------------- */
  const TONES = ['dark', 'coral', 'cream', 'orange'];
  const detail = $('#detail');
  const circles = $$('#inkG circle');
  let inkStart = 0, inkRaf = 0, clipAnim = null, fromEl = null, detailOpen = false;
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
      <text x="36" y="700" fill="${fg}" font-family="Inter Tight" font-weight="800" font-size="40" letter-spacing="-1">${esc(String(p.name).toUpperCase())}</text>
      <text x="36" y="740" fill="${fg}" font-family="Inter Tight" font-weight="600" font-size="14" letter-spacing="2" opacity=".75">${esc((p.items || []).length)} ARTICLES · ${esc((p.cat || '').toUpperCase())}</text>
      <text x="36" y="842" fill="${fg}" font-family="Inter Tight" font-weight="800" font-size="64" letter-spacing="-2">${esc(p.price)}<tspan font-size="22" letter-spacing="2" dx="6">${CUR}</tspan></text>
      <rect x="352" y="804" width="86" height="40" fill="none" stroke="${fg}" stroke-width="2"/>
      <text x="395" y="830" text-anchor="middle" fill="${fg}" font-family="Inter Tight" font-weight="800" font-size="15" letter-spacing="2">${p.available ? 'DISPO' : 'ÉPUISÉ'}</text>`;
  }
  function inkLoop(now) {
    const el = now - inkStart - 520; let done = true;
    circles.forEach(c => { const t = Math.max(0, Math.min(1, (el - +c.dataset.d) / 1250)); if (t < 1) done = false; c.setAttribute('r', (720 * (1 - Math.pow(1 - t, 3))).toFixed(1)); });
    if (!done) inkRaf = requestAnimationFrame(inkLoop);
  }
  const insetOf = (el) => { const r = el.getBoundingClientRect(); return `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 3px)`; };
  function openDetail(i, el) {
    if (detailOpen) return;
    const p = PACKS[i];
    $('#dSub').textContent = `PACK ${pad(p.num)} / باك ${ar(p.num)}`;
    $('#dTitle').textContent = p.name;
    $('#dMeta').textContent = `${p.price} ${CUR} / ${(p.cat || '').toUpperCase()} / ${(p.items || []).length} articles`;
    $('#dItems').innerHTML = (p.items || []).map(x => `<li>${esc(x)}</li>`).join('');
    const call = $('#dCall');
    call.classList.toggle('disabled', !p.available);
    call.firstElementChild.textContent = p.available ? 'Appeler pour commander / اطلب الآن' : 'Indisponible aujourd’hui';
    $('#posterArt').innerHTML = posterArt(p, TONES[i % 4]);
    circles.forEach(c => c.setAttribute('r', 0));
    fromEl = el; detailOpen = true;
    detail.classList.add('on'); detail.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    clipAnim = detail.animate([{ clipPath: insetOf(el) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: RM ? 1 : 1050, easing: 'cubic-bezier(.76,0,.18,1)', fill: 'both' });
    $$('.d-text .mask > *', detail).forEach((x, n) => {
      x.getAnimations().forEach(a => a.cancel());
      x.animate([{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: RM ? 1 : 900, delay: RM ? 0 : 620 + n * 75, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    });
    cancelAnimationFrame(inkRaf);
    inkStart = performance.now() - (RM ? 5000 : 0);
    inkRaf = requestAnimationFrame(inkLoop);
    setTimeout(() => $('#dClose').focus({ preventScroll: true }), RM ? 0 : 700);
  }
  function closeDetail() {
    if (!detailOpen) return;
    if (clipAnim) clipAnim.cancel();
    detail.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: insetOf(fromEl) }], { duration: RM ? 1 : 850, easing: 'cubic-bezier(.76,0,.18,1)', fill: 'both' })
      .finished.then(() => {
        detail.classList.remove('on'); detail.setAttribute('aria-hidden', 'true');
        detail.getAnimations({ subtree: true }).forEach(x => x.cancel());
        cancelAnimationFrame(inkRaf);
        document.documentElement.style.overflow = '';
        detailOpen = false;
      });
  }
  $('#dClose').addEventListener('click', closeDetail);
  $('#packGrid').addEventListener('click', (e) => { const b = e.target.closest('.pk'); if (b) openDetail(+b.dataset.i, $('.pk-img', b) || b); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (cs.classList.contains('on')) closeCall(); else closeDetail(); } });
})();
