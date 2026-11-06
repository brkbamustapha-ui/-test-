/* iEat Fast Food — admin panel */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(+n || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);
  const LA = 'ieat_auth_v1';

  let MODE = 'local', TOKEN = null, STATE = null, VIEW = 'dash', saveTimer = 0;
  const CUR = () => (STATE && STATE.site.currency) || 'DA';

  /* ---------- toast & sync pill ---------- */
  let toastT = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
  function sync(cls, txt) { const s = $('#sync'); s.className = 'sync ' + cls; s.lastElementChild.textContent = txt; }

  /* ---------- auth ---------- */
  async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
  async function localAuth() {
    try { const a = JSON.parse(localStorage.getItem(LA) || 'null'); if (a && a.hash) return a; } catch (e) {}
    return { user: 'user', salt: 'ieat', hash: await sha('ieat:Ieat') };
  }
  async function detectMode() {
    try { const r = await fetch('/api/state', { cache: 'no-store' }); if (r.ok) return 'server'; } catch (e) {}
    return 'local';
  }
  async function api(action, extra) {
    const r = await fetch('/api/state', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}), body: JSON.stringify(Object.assign({ action }, extra || {})) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const err = new Error(j.error || ('Erreur ' + r.status)); err.status = r.status; throw err; }
    return j;
  }
  function hydrate(s) { return IEAT.merge(IEAT.defaults(), s || {}); }

  async function login(user, pass) {
    MODE = await detectMode();
    if (MODE === 'server') {
      const j = await api('login', { user, pass });
      TOKEN = j.token; sessionStorage.setItem('ieat_tok', TOKEN);
      STATE = hydrate(j.state);
      if (!j.state) await saveNow();
    } else {
      const a = await localAuth();
      if (user !== a.user || (await sha(a.salt + ':' + pass)) !== a.hash) throw new Error('Identifiants incorrects');
      sessionStorage.setItem('ieat_local', '1');
      STATE = hydrate(IEAT.readLocal());
    }
    start();
  }
  async function resume() {
    const tok = sessionStorage.getItem('ieat_tok');
    if (tok) {
      TOKEN = tok; MODE = 'server';
      try { const j = await api('load'); STATE = hydrate(j.state); start(); return; } catch (e) { TOKEN = null; sessionStorage.removeItem('ieat_tok'); }
    }
    if (sessionStorage.getItem('ieat_local') && (await detectMode()) === 'local') { MODE = 'local'; STATE = hydrate(IEAT.readLocal()); start(); }
  }
  function logout() { sessionStorage.removeItem('ieat_tok'); sessionStorage.removeItem('ieat_local'); TOKEN = null; STATE = null; $('#app').hidden = true; $('#login').hidden = false; }

  /* ---------- saving ---------- */
  function save() { sync('busy', 'Enregistrement…'); clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 700); }
  async function saveNow() {
    clearTimeout(saveTimer);
    if (MODE === 'server') {
      try { await api('save', { state: STATE }); sync('ok', 'Enregistré · ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' · en ligne'); }
      catch (e) { sync('err', 'Échec de l’enregistrement'); toast(e.message); if (e.status === 401) logout(); }
    } else {
      if (IEAT.writeLocal(STATE)) sync('ok', 'Enregistré · local (ce navigateur)'); else { sync('err', 'Stockage plein'); toast('Stockage du navigateur plein : réduis la taille des photos.'); }
    }
  }

  /* ---------- path binding ---------- */
  function getPath(o, p) { return p.split('.').reduce((a, k) => a == null ? a : a[k], o); }
  function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const tgt = ks.reduce((a, k) => a[k], o); tgt[last] = v; }
  function readVal(el) {
    const t = el.dataset.t;
    if (t === 'bool') return el.checked;
    if (t === 'num') return el.value === '' ? 0 : +el.value;
    if (t === 'lines') return el.value.split('\n').map(x => x.trim()).filter(Boolean);
    return el.value;
  }
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-k]'); if (!el || !STATE) return;
    setPath(STATE, el.dataset.k, readVal(el)); save();
    if (el.dataset.live) refreshLive(el);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-k]'); if (!el || !STATE) return;
    setPath(STATE, el.dataset.k, readVal(el)); save();
    if (el.dataset.t === 'bool' || el.dataset.rerender) render();
  });
  function refreshLive(el) {
    const card = el.closest('[data-live-card]'); if (!card) return;
    if (el.dataset.live === 'img') { const im = $('.ed-img', card); if (im) im.style.backgroundImage = `url('${el.value}')`; }
  }

  /* ---------- helpers for stats ---------- */
  const dk = (d) => IEAT.dayKey(d);
  const daysBack = (n) => { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(dk(d)); } return out; };
  const day = (k) => STATE.sales[k] || { orders: 0, revenue: 0, items: {} };
  const sumRange = (keys, f) => keys.reduce((a, k) => a + (day(k)[f] || 0), 0);
  const allItems = () => [...STATE.packs.map(p => ({ id: p.id, name: 'Pack ' + p.num + ' · ' + p.name, short: 'Pack ' + p.num, price: +p.price || 0, available: p.available })),
    ...STATE.menu.map(m => ({ id: m.id, name: m.name, short: m.name, price: +m.price || 0, available: m.available }))];
  const pct = (a, b) => b ? Math.round((a - b) / b * 100) : (a ? 100 : 0);
  const delta = (a, b, lbl) => { const p = pct(a, b); return `<span class="d ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)} % ${lbl}</span>`; };
  const stockStatus = (s) => s.qty <= 0 ? ['bad', 'Rupture'] : s.qty <= s.min ? ['warn', 'Stock bas'] : ['ok', 'OK'];
  const payroll = () => STATE.employees.filter(e => e.active).reduce((a, e) => a + (+e.salary || 0), 0);

  function barChart(rows, h = 220) {
    const W = 720, pad = 28, max = Math.max(1, ...rows.map(r => r.v));
    const bw = (W - pad) / rows.length;
    const nice = Math.pow(10, Math.floor(Math.log10(max))); const top = Math.ceil(max / nice) * nice;
    let g = '';
    for (let i = 0; i <= 4; i++) { const y = h - 20 - (h - 30) * i / 4; g += `<line x1="${pad}" x2="${W}" y1="${y}" y2="${y}" stroke="currentColor" opacity=".1"/><text class="ax" x="0" y="${y + 3}">${fmt(top * i / 4 / 1000)}k</text>`; }
    rows.forEach((r, i) => {
      const bh = (h - 30) * r.v / top, x = pad + i * bw + bw * 0.18, y = h - 20 - bh;
      g += `<rect class="bar-r" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}" rx="3"><title>${esc(r.l)} : ${fmt(r.v)} ${CUR()}</title></rect>`;
      if (r.lbl) g += `<text class="ax" x="${(x + bw * 0.32).toFixed(1)}" y="${h - 4}" text-anchor="middle">${esc(r.lbl)}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${h}"><defs><linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F09A34"/><stop offset="1" stop-color="#E0503A"/></linearGradient></defs>${g}</svg></div>`;
  }
  const hbars = (rows, unit) => { const max = Math.max(1, ...rows.map(r => r.v)); return rows.map((r, i) => `<div class="hbar"><span class="nm" title="${esc(r.l)}">${esc(r.l)}</span><span class="tr"><i class="fi" style="width:${r.v / max * 100}%;animation-delay:${i * 60}ms"></i></span><span class="vv">${fmt(r.v)}${unit || ''}</span></div>`).join(''); };

  /* ---------- views ---------- */
  const ICON = {
    dash: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    sales: '<path d="M3 3v18h18M7 15l4-4 3 3 6-6"/>',
    packs: '<path d="M21 8l-9-5-9 5 9 5zM3 8v8l9 5 9-5V8M12 13v8"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    stock: '<path d="M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6"/>',
    team: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 1 0 0-6M22 21c0-3-1.5-5-4-5.6"/>',
    site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    security: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };
  const VIEWS = {
    dash: ['Tableau de bord', 'Vue d’ensemble de l’activité'],
    sales: ['Ventes & revenus', 'Saisie rapide des ventes et historique'],
    packs: ['Packs', 'Prix, contenu, photo et disponibilité des 14 packs'],
    menu: ['Carte à l’unité', 'Articles, prix et disponibilité'],
    stock: ['Stock', 'Niveaux, seuils d’alerte et valeur'],
    team: ['Équipe', 'Employés, rôles et masse salariale'],
    site: ['Site & contacts', 'Textes, téléphones, réseaux sociaux, adresse'],
    security: ['Sécurité & données', 'Identifiants, sauvegarde, restauration']
  };
  function renderNav() {
    const low = STATE.stock.filter(s => s.qty <= s.min).length;
    $('#sideNav').innerHTML = Object.keys(VIEWS).map(k => `<button class="nav-i${VIEW === k ? ' on' : ''}" data-view="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>${VIEWS[k][0]}${k === 'stock' && low ? `<span class="cnt">${low}</span>` : ''}</button>`).join('');
  }
  $('#sideNav').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (!b) return; VIEW = b.dataset.view; $('.side').classList.remove('open'); render(); scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); });
  $('#menuBtn').addEventListener('click', () => $('.side').classList.toggle('open'));

  function render() {
    renderNav();
    $('#viewTitle').textContent = VIEWS[VIEW][0];
    $('#viewSub').textContent = VIEWS[VIEW][1] + ' · ' + new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const v = $('#view');
    v.innerHTML = R[VIEW]();
    v.style.animation = 'none'; void v.offsetWidth; v.style.animation = '';
  }

  const R = {};
  R.dash = function () {
    const today = dk(new Date()), d30 = daysBack(30), d7 = daysBack(7);
    const prev7 = (() => { const o = []; for (let i = 13; i >= 7; i--) { const d = new Date(); d.setDate(d.getDate() - i); o.push(dk(d)); } return o; })();
    const yest = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return dk(d); })();
    const r30 = sumRange(d30, 'revenue'), o30 = sumRange(d30, 'orders');
    const r7 = sumRange(d7, 'revenue'), rp7 = sumRange(prev7, 'revenue');
    const pay = payroll(), ex = STATE.expenses || {};
    const food = (+ex.foodCostPct || 35) / 100;
    const result = r30 * (1 - food) - pay - (+ex.rent || 0) - (+ex.utilities || 0) - (+ex.other || 0);
    const stockVal = STATE.stock.reduce((a, s) => a + s.qty * (+s.cost || 0), 0);
    const low = STATE.stock.filter(s => s.qty <= s.min);
    const pAv = STATE.packs.filter(p => p.available).length, mAv = STATE.menu.filter(m => m.available).length;
    const act = STATE.employees.filter(e => e.active).length;
    const hasDemo = Object.values(STATE.sales).some(x => x.demo);
    // top items 30d
    const qty = {}; d30.forEach(k => { const it = day(k).items || {}; for (const id in it) qty[id] = (qty[id] || 0) + it[id]; });
    const items = allItems(); const top = items.map(i => ({ l: i.name, v: qty[i.id] || 0 })).filter(x => x.v).sort((a, b) => b.v - a.v).slice(0, 7);
    const wd = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']; const wsum = Array(7).fill(0), wcnt = Array(7).fill(0);
    d30.forEach(k => { const g = new Date(k + 'T12:00').getDay(); wsum[g] += day(k).revenue; wcnt[g]++; });
    const kpi = (k, v, sub, c) => `<div class="glass kpi" style="--c:${c || 'var(--accent)'}"><span class="k">${k}</span><span class="v">${v}</span>${sub || ''}</div>`;
    return `
      ${hasDemo ? `<div class="glass card" style="display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b>Données de démonstration.</b> <span class="muted" style="display:inline">Les ventes des 30 derniers jours sont fictives pour illustrer le tableau de bord.</span></span><button class="gbtn sm danger" data-act="clearDemo">Effacer les données de démo</button></div>` : ''}
      <div class="kpis">
        ${kpi('CA aujourd’hui', fmt(day(today).revenue) + `<small>${CUR()}</small>`, delta(day(today).revenue, day(yest).revenue, 'vs hier'))}
        ${kpi('CA 7 jours', fmt(r7) + `<small>${CUR()}</small>`, delta(r7, rp7, 'vs semaine préc.'), 'var(--orange)')}
        ${kpi('CA 30 jours', fmt(r30) + `<small>${CUR()}</small>`, `<span class="d muted">${fmt(o30)} articles vendus</span>`)}
        ${kpi('Commandes du jour', fmt(day(today).orders), `<span class="d muted">Panier moyen 30 j : ${fmt(o30 ? r30 / o30 : 0)} ${CUR()}</span>`, 'var(--orange)')}
        ${kpi('Résultat estimé 30 j', fmt(result) + `<small>${CUR()}</small>`, `<span class="d ${result >= 0 ? 'up' : 'down'}">Matières ${Math.round(food * 100)} % · salaires · charges</span>`, result >= 0 ? 'var(--ok)' : 'var(--bad)')}
        ${kpi('Employés', act + `<small>/ ${STATE.employees.length}</small>`, `<span class="d muted">Masse salariale ${fmt(pay)} ${CUR()}/mois</span>`, '#8B5CF6')}
        ${kpi('Valeur du stock', fmt(stockVal) + `<small>${CUR()}</small>`, `<span class="d ${low.length ? 'down' : 'up'}">${low.length ? low.length + ' alerte(s) stock' : 'Aucune alerte'}</span>`, low.length ? 'var(--bad)' : 'var(--ok)')}
        ${kpi('Articles disponibles', (pAv + mAv) + `<small>/ ${STATE.packs.length + STATE.menu.length}</small>`, `<span class="d muted">${pAv} packs · ${mAv} à l’unité</span>`, 'var(--ok)')}
      </div>
      <div class="grid2">
        <div class="glass card"><div class="card-h"><h3>Chiffre d’affaires · 30 jours</h3><span class="pill">${fmt(r30)} ${CUR()}</span></div>
          ${barChart(d30.map((k, i) => ({ l: k, v: day(k).revenue, lbl: i % 5 === 4 || i === 29 ? k.slice(8) + '/' + k.slice(5, 7) : '' })))}</div>
        <div class="glass card"><div class="card-h"><h3>Meilleures ventes · 30 j</h3><span class="pill">quantités</span></div>${top.length ? hbars(top) : '<p class="muted">Aucune vente enregistrée.</p>'}</div>
      </div>
      <div class="grid2 even">
        <div class="glass card"><div class="card-h"><h3>CA moyen par jour de semaine</h3></div>${hbars([1, 2, 3, 4, 5, 6, 0].map(g => ({ l: wd[g], v: wcnt[g] ? wsum[g] / wcnt[g] : 0 })), ' ' + CUR())}</div>
        <div class="glass card"><div class="card-h"><h3>Alertes de stock</h3><button class="gbtn sm" data-view-go="stock">Gérer le stock →</button></div>
          <div class="alerts">${low.length ? low.map(s => { const [c, t] = stockStatus(s); return `<div class="alert"><span><b>${esc(s.name)}</b> <span class="muted" style="display:inline">· ${s.qty} ${esc(s.unit)} (seuil ${s.min})</span></span><span class="pill ${c}">${t}</span></div>`; }).join('') : '<p class="muted">Tout est au-dessus des seuils. 👌</p>'}</div></div>
      </div>`;
  };

  R.sales = function () {
    const items = allItems().filter(i => i.price > 0);
    const keys = Object.keys(STATE.sales).sort().reverse().slice(0, 21);
    const today = dk(new Date());
    return `
      <div class="glass card"><div class="card-h"><h3>Saisie rapide · aujourd’hui</h3><span class="pill ok">Aujourd’hui : ${fmt(day(today).revenue)} ${CUR()} · ${day(today).orders} art.</span></div>
        <p class="hint" style="margin:-6px 0 14px">Un appui = 1 vente ajoutée au jour courant.</p>
        <div class="qs">${items.map(i => `<button data-act="quick" data-id="${i.id}" ${i.available ? '' : 'disabled style="opacity:.45"'}><b>${esc(i.short)}</b><small>${fmt(i.price)} ${CUR()}${i.available ? '' : ' · indispo'}</small></button>`).join('')}</div>
        <div class="toolbar" style="margin-top:14px"><button class="gbtn sm" data-act="undo">↶ Annuler la dernière saisie</button></div>
      </div>
      <div class="glass card"><div class="card-h"><h3>Ajouter une vente</h3></div>
        <form class="form-grid" id="saleForm">
          <label class="field"><span>Date</span><input type="date" name="date" value="${today}" required></label>
          <label class="field"><span>Article</span><select name="id">${items.map(i => `<option value="${i.id}">${esc(i.name)} — ${fmt(i.price)} ${CUR()}</option>`).join('')}</select></label>
          <label class="field"><span>Quantité</span><input type="number" name="qty" min="1" value="1" required></label>
          <div class="field"><span>&nbsp;</span><button class="gbtn primary" type="submit">Ajouter la vente</button></div>
        </form>
      </div>
      <div class="glass card"><div class="card-h"><h3>Historique (21 derniers jours saisis)</h3>
        ${Object.values(STATE.sales).some(x => x.demo) ? '<button class="gbtn sm danger" data-act="clearDemo">Effacer les données de démo</button>' : ''}</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Articles</th><th>Chiffre d’affaires</th><th>Panier moyen</th><th></th><th></th></tr></thead><tbody>
        ${keys.map(k => { const d = STATE.sales[k]; return `<tr><td><b>${new Date(k + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</b></td><td>${fmt(d.orders)}</td><td><b>${fmt(d.revenue)} ${CUR()}</b></td><td>${fmt(d.orders ? d.revenue / d.orders : 0)} ${CUR()}</td><td>${d.demo ? '<span class="pill">démo</span>' : '<span class="pill ok">réel</span>'}</td><td style="text-align:right"><button class="gbtn sm danger" data-act="delDay" data-k="${k}" data-nobind>Supprimer</button></td></tr>`; }).join('') || '<tr><td colspan="6">Aucune vente.</td></tr>'}
        </tbody></table></div></div>`;
  };

  const assetOpts = (cur) => Array.from({ length: 14 }, (_, i) => `assets/pack-${i + 1}.webp`).map(a => `<option value="${a}" ${a === cur ? 'selected' : ''}>Photo du pack ${a.match(/\d+/)[0]}</option>`).join('');
  R.packs = function () {
    return `
      <div class="toolbar"><button class="gbtn primary" data-act="addPack">+ Ajouter un pack</button>
        <button class="gbtn" data-act="allPacks" data-v="1">Tout disponible</button><button class="gbtn" data-act="allPacks" data-v="0">Tout indisponible</button></div>
      <div class="items-grid">${STATE.packs.map((p, i) => `
        <div class="glass ed${p.available ? '' : ' off'}" data-live-card>
          <div class="ed-top"><div class="ed-img" style="background-image:url('${esc(p.img)}')"></div>
            <div style="min-width:0;flex:1"><b style="font-family:Lobster;font-weight:400;font-size:24px;color:var(--accent)">Pack ${esc(p.num)}</b><div class="muted" style="font-size:13px">${esc(p.name)}</div></div></div>
          <div class="ed-row"><label class="field"><span>N°</span><input type="number" data-t="num" data-k="packs.${i}.num" value="${esc(p.num)}"></label>
            <label class="field"><span>Prix (${CUR()})</span><input type="number" data-t="num" data-k="packs.${i}.price" value="${esc(p.price)}"></label>
            <label class="field"><span>Catégorie</span><input data-k="packs.${i}.cat" value="${esc(p.cat)}"></label></div>
          <label class="field"><span>Nom</span><input data-k="packs.${i}.name" value="${esc(p.name)}"></label>
          <label class="field"><span>Contenu (une ligne par article)</span><textarea data-t="lines" data-k="packs.${i}.items">${esc((p.items || []).join('\n'))}</textarea></label>
          <div class="ed-row two"><label class="field"><span>Photo</span><select data-k="packs.${i}.img" data-live="img"><option value="${esc(p.img)}">Photo actuelle</option>${assetOpts(p.img)}</select></label>
            <label class="field"><span>Importer une photo</span><input type="file" accept="image/*" data-act-file="pack" data-i="${i}"></label></div>
          <div class="ed-foot"><label class="sw"><input type="checkbox" data-t="bool" data-k="packs.${i}.available" ${p.available ? 'checked' : ''}><i></i><b>${p.available ? 'Disponible' : 'Indisponible'}</b></label>
            <button class="gbtn sm danger" data-act="del" data-list="packs" data-i="${i}">Supprimer</button></div>
        </div>`).join('')}</div>`;
  };

  R.menu = function () {
    return `
      <div class="toolbar"><button class="gbtn primary" data-act="addMenu">+ Ajouter un article</button></div>
      <div class="glass card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Article</th><th>Catégorie</th><th>Prix (${CUR()})</th><th>Description</th><th>Disponibilité</th><th></th></tr></thead><tbody>
      ${STATE.menu.map((m, i) => `<tr>
        <td><input data-k="menu.${i}.name" value="${esc(m.name)}"></td>
        <td><input data-k="menu.${i}.cat" value="${esc(m.cat)}" list="cats"></td>
        <td><input class="num" type="number" data-t="num" data-k="menu.${i}.price" value="${esc(m.price)}" placeholder="0 = masqué"></td>
        <td><input data-k="menu.${i}.desc" value="${esc(m.desc)}" placeholder="optionnel"></td>
        <td><label class="sw"><input type="checkbox" data-t="bool" data-k="menu.${i}.available" ${m.available ? 'checked' : ''}><i></i><b>${m.available ? 'Disponible' : 'Indisponible'}</b></label></td>
        <td><button class="gbtn sm danger" data-act="del" data-list="menu" data-i="${i}">✕</button></td></tr>`).join('')}
      </tbody></table></div>
      <datalist id="cats">${[...new Set(STATE.menu.map(m => m.cat))].map(c => `<option value="${esc(c)}">`).join('')}</datalist>
      <p class="hint">Un prix à 0 n’affiche pas de prix sur le site.</p></div>`;
  };

  R.stock = function () {
    const val = STATE.stock.reduce((a, s) => a + s.qty * (+s.cost || 0), 0);
    const low = STATE.stock.filter(s => s.qty <= s.min && s.qty > 0).length, out = STATE.stock.filter(s => s.qty <= 0).length;
    return `
      <div class="kpis">
        <div class="glass kpi"><span class="k">Valeur du stock</span><span class="v">${fmt(val)}<small>${CUR()}</small></span></div>
        <div class="glass kpi" style="--c:var(--ok)"><span class="k">Références</span><span class="v">${STATE.stock.length}</span></div>
        <div class="glass kpi" style="--c:var(--warn)"><span class="k">Stock bas</span><span class="v">${low}</span></div>
        <div class="glass kpi" style="--c:var(--bad)"><span class="k">En rupture</span><span class="v">${out}</span></div>
      </div>
      <div class="toolbar"><button class="gbtn primary" data-act="addStock">+ Ajouter un produit</button></div>
      <div class="glass card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Produit</th><th>Unité</th><th>Quantité</th><th>Seuil d’alerte</th><th>Coût / unité</th><th>État</th><th>Valeur</th><th></th></tr></thead><tbody>
      ${STATE.stock.map((s, i) => { const [c, t] = stockStatus(s); const r = Math.min(1, s.qty / Math.max(1, s.min * 2.5)); return `<tr>
        <td><input data-k="stock.${i}.name" value="${esc(s.name)}"></td>
        <td><input style="width:80px" data-k="stock.${i}.unit" value="${esc(s.unit)}"></td>
        <td><div class="qty"><button data-act="qty" data-i="${i}" data-d="-1">−</button><input type="number" data-t="num" data-rerender="1" data-k="stock.${i}.qty" value="${esc(s.qty)}"><button data-act="qty" data-i="${i}" data-d="1">+</button></div></td>
        <td><input class="num" type="number" data-t="num" data-rerender="1" data-k="stock.${i}.min" value="${esc(s.min)}"></td>
        <td><input class="num" type="number" data-t="num" data-rerender="1" data-k="stock.${i}.cost" value="${esc(s.cost)}"></td>
        <td><span class="pill ${c}">${t}</span><div class="lvl"><i style="width:${r * 100}%;background:var(--${c})"></i></div></td>
        <td><b>${fmt(s.qty * (+s.cost || 0))}</b></td>
        <td><button class="gbtn sm danger" data-act="del" data-list="stock" data-i="${i}">✕</button></td></tr>`; }).join('')}
      </tbody></table></div></div>`;
  };

  R.team = function () {
    const teams = {}; STATE.employees.forEach(e => { if (e.active) teams[e.team || 'Autre'] = (teams[e.team || 'Autre'] || 0) + 1; });
    const act = STATE.employees.filter(e => e.active).length;
    return `
      <div class="kpis">
        <div class="glass kpi" style="--c:#8B5CF6"><span class="k">Employés</span><span class="v">${STATE.employees.length}</span></div>
        <div class="glass kpi" style="--c:var(--ok)"><span class="k">Actifs</span><span class="v">${act}</span></div>
        <div class="glass kpi"><span class="k">Masse salariale / mois</span><span class="v">${fmt(payroll())}<small>${CUR()}</small></span></div>
        <div class="glass kpi" style="--c:var(--orange)"><span class="k">Salaire moyen</span><span class="v">${fmt(act ? payroll() / act : 0)}<small>${CUR()}</small></span></div>
      </div>
      <div class="grid2">
        <div class="glass card"><div class="card-h"><h3>Membres de l’équipe</h3><button class="gbtn sm primary" data-act="addEmp">+ Ajouter</button></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nom</th><th>Poste</th><th>Équipe</th><th>Salaire</th><th>Téléphone</th><th>Statut</th><th></th></tr></thead><tbody>
          ${STATE.employees.map((e, i) => `<tr>
            <td><input data-k="employees.${i}.name" value="${esc(e.name)}"></td>
            <td><input data-k="employees.${i}.role" value="${esc(e.role)}"></td>
            <td><select data-k="employees.${i}.team" data-rerender="1">${['Gérance', 'Cuisine', 'Service', 'Livraison', 'Entretien', 'Autre'].map(t => `<option ${t === e.team ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
            <td><input class="num" type="number" data-t="num" data-rerender="1" data-k="employees.${i}.salary" value="${esc(e.salary)}"></td>
            <td><input data-k="employees.${i}.phone" value="${esc(e.phone)}" placeholder="—"></td>
            <td><label class="sw"><input type="checkbox" data-t="bool" data-k="employees.${i}.active" ${e.active ? 'checked' : ''}><i></i><b>${e.active ? 'Actif' : 'Inactif'}</b></label></td>
            <td><button class="gbtn sm danger" data-act="del" data-list="employees" data-i="${i}">✕</button></td></tr>`).join('')}
          </tbody></table></div></div>
        <div class="glass card"><div class="card-h"><h3>Répartition (actifs)</h3></div>${hbars(Object.keys(teams).map(t => ({ l: t, v: teams[t] })))}</div>
      </div>`;
  };

  R.site = function () {
    const S = STATE.site, ex = STATE.expenses;
    const f = (k, label, opt = {}) => `<label class="field${opt.full ? ' full' : ''}"><span>${label}</span>${opt.area ? `<textarea data-k="site.${k}"${opt.t ? ` data-t="${opt.t}"` : ''}>${esc(opt.t === 'lines' ? (S[k] || []).join('\n') : S[k])}</textarea>` : `<input ${opt.type ? `type="${opt.type}"` : ''} ${opt.t ? `data-t="${opt.t}"` : ''} data-k="site.${k}" value="${esc(S[k])}">`}${opt.hint ? `<span class="hint">${opt.hint}</span>` : ''}</label>`;
    return `
      <div class="glass card"><div class="card-h"><h3>Identité & accueil</h3><a class="gbtn sm" href="/" target="_blank" rel="noopener">Prévisualiser ↗</a></div>
        <div class="form-grid">${f('name', 'Nom du restaurant')}${f('city', 'Ville')}${f('tagline', 'Slogan')}${f('announcement', 'Bandeau d’annonce')}
        ${f('heroTitle', 'Titre principal', { area: 1, full: 1, hint: 'Entoure un mot d’astérisques pour le style manuscrit : fait pour *toi*.' })}
        ${f('heroText', 'Texte d’accueil', { area: 1, full: 1 })}</div></div>
      <div class="glass card"><div class="card-h"><h3>Contact & localisation</h3></div>
        <div class="form-grid">${f('phones', 'Téléphones (un par ligne)', { area: 1, t: 'lines', hint: 'Utilisés par les boutons « Appeler ».' })}
        ${f('address', 'Adresse')}${f('hours', 'Horaires')}${f('mapsUrl', 'Lien Google Maps', { full: 1 })}
        ${f('lat', 'Latitude', { type: 'number', t: 'num' })}${f('lng', 'Longitude', { type: 'number', t: 'num' })}${f('currency', 'Devise')}</div></div>
      <div class="glass card"><div class="card-h"><h3>Réseaux sociaux</h3></div>
        <div class="form-grid">${f('facebook', 'Facebook')}${f('instagram', 'Instagram')}${f('tiktok', 'TikTok')}</div></div>
      <div class="glass card"><div class="card-h"><h3>Charges mensuelles (pour le résultat estimé)</h3></div>
        <div class="form-grid">
          <label class="field"><span>Loyer (${CUR()})</span><input type="number" data-t="num" data-k="expenses.rent" value="${esc(ex.rent)}"></label>
          <label class="field"><span>Électricité, gaz, eau (${CUR()})</span><input type="number" data-t="num" data-k="expenses.utilities" value="${esc(ex.utilities)}"></label>
          <label class="field"><span>Autres charges (${CUR()})</span><input type="number" data-t="num" data-k="expenses.other" value="${esc(ex.other)}"></label>
          <label class="field"><span>Coût matières (% du CA)</span><input type="number" data-t="num" data-k="expenses.foodCostPct" value="${esc(ex.foodCostPct == null ? 35 : ex.foodCostPct)}"></label>
        </div></div>`;
  };

  R.security = function () {
    return `
      <div class="grid2 even">
        <div class="glass card"><div class="card-h"><h3>Changer les identifiants</h3></div>
          <form class="form-grid" id="credForm" style="grid-template-columns:1fr">
            <label class="field"><span>Mot de passe actuel</span><input type="password" name="current" autocomplete="current-password" required></label>
            <label class="field"><span>Nouveau nom d’utilisateur</span><input name="user" autocomplete="username" required minlength="3"></label>
            <label class="field"><span>Nouveau mot de passe</span><input type="password" name="pass" autocomplete="new-password" required minlength="4"></label>
            <label class="field"><span>Confirmer le mot de passe</span><input type="password" name="pass2" autocomplete="new-password" required minlength="4"></label>
            <button class="gbtn primary" type="submit">Mettre à jour</button>
          </form></div>
        <div class="glass card"><div class="card-h"><h3>Données</h3><span class="pill ${MODE === 'server' ? 'ok' : 'warn'}">${MODE === 'server' ? 'Stockage en ligne' : 'Stockage local'}</span></div>
          <p class="muted" style="margin-bottom:16px">${MODE === 'server' ? 'Les modifications sont enregistrées sur le serveur et visibles par tous les visiteurs du site.' : 'Stockage serveur indisponible : les modifications sont enregistrées dans ce navigateur uniquement.'}</p>
          <div class="toolbar">
            <button class="gbtn" data-act="export">⬇ Exporter (JSON)</button>
            <label class="gbtn" style="cursor:pointer">⬆ Importer<input type="file" accept="application/json" data-act-file="import" hidden></label>
            <button class="gbtn danger" data-act="reset">Réinitialiser le site</button>
          </div></div>
      </div>`;
  };

  /* ---------- actions ---------- */
  const undo = [];
  function addSale(id, qty, dateKey) {
    const it = allItems().find(x => x.id === id); if (!it) return;
    const k = dateKey || dk(new Date());
    const d = STATE.sales[k] && !STATE.sales[k].demo ? STATE.sales[k] : (STATE.sales[k] = { orders: 0, revenue: 0, items: {} });
    d.orders += qty; d.revenue += it.price * qty; d.items[id] = (d.items[id] || 0) + qty;
    undo.push({ k, id, qty, price: it.price });
    save();
  }
  document.addEventListener('click', async (e) => {
    const g = e.target.closest('[data-view-go]'); if (g) { VIEW = g.dataset.viewGo; render(); return; }
    const b = e.target.closest('[data-act]'); if (!b || !STATE) return;
    const a = b.dataset.act, i = +b.dataset.i;
    if (a === 'quick') { addSale(b.dataset.id, 1); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); const pill = $('.card-h .pill.ok'); const t = day(dk(new Date())); if (pill) pill.textContent = `Aujourd’hui : ${fmt(t.revenue)} ${CUR()} · ${t.orders} art.`; return; }
    if (a === 'undo') { const u = undo.pop(); if (!u) return toast('Rien à annuler'); const d = STATE.sales[u.k]; d.orders -= u.qty; d.revenue -= u.price * u.qty; d.items[u.id] -= u.qty; if (!d.items[u.id]) delete d.items[u.id]; save(); render(); return toast('Dernière saisie annulée'); }
    if (a === 'delDay') { if (!confirm('Supprimer les ventes de ce jour ?')) return; delete STATE.sales[b.dataset.k]; save(); render(); return; }
    if (a === 'clearDemo') { if (!confirm('Effacer toutes les ventes de démonstration ?')) return; for (const k in STATE.sales) if (STATE.sales[k].demo) delete STATE.sales[k]; save(); render(); return toast('Données de démo effacées'); }
    if (a === 'del') { const list = STATE[b.dataset.list]; if (!confirm('Supprimer « ' + (list[i].name || 'cet élément') + ' » ?')) return; list.splice(i, 1); save(); render(); return; }
    if (a === 'addPack') { const n = Math.max(0, ...STATE.packs.map(p => +p.num || 0)) + 1; STATE.packs.push({ id: uid('p'), num: n, name: 'Nouveau pack', cat: 'Mix', price: 1000, items: ['1 Boisson 1 L'], img: 'assets/pack-1.webp', available: true }); save(); render(); return toast('Pack ' + n + ' ajouté'); }
    if (a === 'allPacks') { STATE.packs.forEach(p => { p.available = b.dataset.v === '1'; }); save(); render(); return; }
    if (a === 'addMenu') { STATE.menu.push({ id: uid('m'), name: 'Nouvel article', cat: 'Burgers', price: 0, desc: '', available: true }); save(); render(); return; }
    if (a === 'addStock') { STATE.stock.push({ id: uid('s'), name: 'Nouveau produit', unit: 'pcs', qty: 0, min: 10, cost: 0 }); save(); render(); return; }
    if (a === 'addEmp') { STATE.employees.push({ id: uid('e'), name: 'Nouvel employé', role: 'Équipier', team: 'Service', salary: 30000, phone: '', active: true }); save(); render(); return; }
    if (a === 'qty') { const s = STATE.stock[i]; s.qty = Math.max(0, (+s.qty || 0) + (+b.dataset.d)); save(); render(); return; }
    if (a === 'export') { const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = 'ieat-sauvegarde-' + dk(new Date()) + '.json'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); return; }
    if (a === 'reset') { if (!confirm('Réinitialiser tout le contenu (packs, carte, stock, équipe, ventes) aux valeurs par défaut ?')) return; STATE = IEAT.defaults(); await saveNow(); render(); return toast('Site réinitialisé'); }
  });
  document.addEventListener('change', async (e) => {
    const f = e.target.closest('[data-act-file]'); if (!f || !f.files[0]) return;
    if (f.dataset.actFile === 'import') {
      try { const j = JSON.parse(await f.files[0].text()); if (!j.site || !Array.isArray(j.packs)) throw new Error(); STATE = hydrate(j); await saveNow(); render(); toast('Sauvegarde importée'); } catch (er) { toast('Fichier invalide'); }
      return;
    }
    if (f.dataset.actFile === 'pack') {
      try { STATE.packs[+f.dataset.i].img = await shrink(f.files[0]); save(); render(); toast('Photo mise à jour'); } catch (er) { toast('Image illisible'); }
    }
  });
  function shrink(file) {
    return new Promise((ok, ko) => {
      const img = new Image(); img.onload = () => {
        const s = Math.min(1, 720 / img.width); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        let u = c.toDataURL('image/webp', 0.78); if (!u.startsWith('data:image/webp')) u = c.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(img.src); ok(u);
      }; img.onerror = ko; img.src = URL.createObjectURL(file);
    });
  }
  document.addEventListener('submit', async (e) => {
    const f = e.target;
    if (f.id === 'saleForm') { e.preventDefault(); const d = new FormData(f); addSale(d.get('id'), Math.max(1, +d.get('qty') || 1), d.get('date')); render(); toast('Vente ajoutée'); }
    if (f.id === 'credForm') {
      e.preventDefault(); const d = new FormData(f);
      const user = String(d.get('user')).trim(), pass = String(d.get('pass')), cur = String(d.get('current'));
      if (pass !== d.get('pass2')) return toast('Les mots de passe ne correspondent pas');
      if (user.length < 3 || pass.length < 4) return toast('Utilisateur ≥ 3 caractères, mot de passe ≥ 4');
      try {
        if (MODE === 'server') { const j = await api('credentials', { current: cur, user, pass }); TOKEN = j.token; sessionStorage.setItem('ieat_tok', TOKEN); }
        else {
          const a = await localAuth();
          if ((await sha(a.salt + ':' + cur)) !== a.hash) throw new Error('Mot de passe actuel incorrect');
          const salt = Math.random().toString(36).slice(2); localStorage.setItem(LA, JSON.stringify({ user, salt, hash: await sha(salt + ':' + pass) }));
        }
        f.reset(); toast('Identifiants mis à jour ✓');
      } catch (er) { toast(er.message); }
    }
  });

  /* ---------- theme ---------- */
  $('#themeBtn').addEventListener('click', (e) => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => { document.documentElement.dataset.theme = next; try { localStorage.setItem('ieat_theme', next); } catch (er) {} };
    const r = e.currentTarget.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R2 = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    if (RM || !document.startViewTransition) return apply();
    document.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R2}px at ${x}px ${y}px)`] }, { duration: 900, easing: 'cubic-bezier(.76,0,.18,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
  });

  /* ---------- boot ---------- */
  function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    sync('ok', MODE === 'server' ? 'Connecté · stockage en ligne' : 'Connecté · stockage local');
    render();
  }
  $('#logout').addEventListener('click', logout);
  $('.pw-eye').addEventListener('click', () => { const i = $('#loginForm [name=pass]'); i.type = i.type === 'password' ? 'text' : 'password'; });
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget, d = new FormData(f), err = $('#loginErr'), btn = $('button[type=submit]', f);
    err.textContent = ''; btn.disabled = true; btn.firstElementChild.textContent = 'Connexion…';
    try { await login(String(d.get('user')).trim(), String(d.get('pass'))); }
    catch (er) { err.textContent = er.message || 'Erreur de connexion'; f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
    finally { btn.disabled = false; btn.firstElementChild.textContent = 'Se connecter'; }
  });
  resume();
})();
