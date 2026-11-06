/* iEat Fast Food — shared data layer (site + admin).
   State lives on the server (/api/state, Vercel Blob) when available,
   otherwise in this browser's localStorage. */
(function (g) {
  'use strict';

  const PACKS = [
    { num: 1,  name: 'Le Combo Tacos',  cat: 'Tacos & Burger',   price: 1000, items: ['2 Mini Tacos', '2 Burgers', '2 B. de frites', '1 Boisson 1 L'] },
    { num: 2,  name: 'Pizza & Tacos',   cat: 'Pizza & Tacos',    price: 1000, items: ['1 Pizza Poulet Haché', '2 Mini Tacos', '2 B. de frites', '1 Boisson 1 L'] },
    { num: 3,  name: 'Le Maison',       cat: 'Sandwich & Tenders', price: 1200, items: ['2 Sandwichs Maison', '2 Burgers', '3 Tenders', '2 B. de frites', '1 Boisson 1 L'] },
    { num: 4,  name: 'Le Libanais',     cat: 'Kebab & Burger',   price: 1200, items: ['2 Libanais Kebab', '2 Burgers', '2 B. de frites', '1 Boisson 1 L'] },
    { num: 5,  name: 'Duo Pizza',       cat: 'Pizza & Burger',   price: 1000, items: ['2 Pizzas Poulet Haché', '2 Burgers', '1 Boisson 1 L'] },
    { num: 6,  name: 'Tacos Gratiné',   cat: 'Tacos',            price: 1200, items: ['3 Tacos Poulet Haché gratiné', '1 Boisson 1 L'] },
    { num: 7,  name: 'Trio Pizza',      cat: 'Pizza',            price: 1000, items: ['1 Pizza Poulet Haché', '1 Pizza Thon', '1 Pizza Margherita', '1 Boisson 1 L'] },
    { num: 8,  name: 'Le Mariné',       cat: 'Sandwich & Burger', price: 1200, items: ['2 Sandwichs Mariné', '3 Burgers', '2 B. de frites', '1 Boisson 1 L'] },
    { num: 9,  name: 'Crispy Tenders',  cat: 'Tenders & Burger', price: 1200, items: ['2 Burgers', '6 Tenders', '2 B. de frites', '1 Boisson 1 L'] },
    { num: 10, name: 'Tacos Party',     cat: 'Tacos',            price: 1000, items: ['4 Mini Tacos', '1 Boisson 1 L'] },
    { num: 11, name: 'Burger Tower',    cat: 'Burger',           price: 1000, items: ['6 Burgers', '1 Boisson 1 L'] },
    { num: 12, name: 'Maison XL',       cat: 'Sandwich & Burger', price: 1000, items: ['2 Sandwichs Maison', '3 Burgers', '2 B. de frites', '1 Boisson 1 L'] },
    { num: 13, name: 'Le Grand Mix',    cat: 'Mix',              price: 1300, items: ['2 Sandwichs Mariné', '1 Burger', '1 Pizza Poulet Haché', '2 B. de frites', '1 Boisson 1 L'] },
    { num: 14, name: 'Le Festin',       cat: 'Familial',         price: 2000, items: ['2 Pizzas Poulet Haché', '2 Tacos Poulet Haché', '3 Burgers', '1 Plat de frites', '1 Boisson 1 L'] }
  ].map(p => Object.assign({ id: 'p' + p.num, img: 'assets/pack-' + p.num + '.webp', available: true }, p));

  const MENU = [
    ['Burger', 'Burgers'], ['Mini Tacos', 'Tacos'], ['Tacos Poulet Haché gratiné', 'Tacos'],
    ['Pizza Poulet Haché', 'Pizzas'], ['Pizza Thon', 'Pizzas'], ['Pizza Margherita', 'Pizzas'],
    ['Sandwich Maison', 'Sandwichs'], ['Sandwich Mariné', 'Sandwichs'], ['Libanais Kebab', 'Sandwichs'],
    ['Tenders', 'Accompagnements'], ['Barquette de frites', 'Accompagnements'], ['Boisson 1 L', 'Boissons']
  ].map((m, i) => ({ id: 'm' + (i + 1), name: m[0], cat: m[1], price: 0, desc: '', available: true }));

  const STOCK = [
    ['Pain burger', 'pcs', 180, 60, 25], ['Steak haché', 'pcs', 150, 60, 90], ['Poulet haché', 'kg', 18, 8, 900],
    ['Poulet mariné', 'kg', 12, 6, 950], ['Thon', 'boîtes', 20, 8, 260], ['Fromage', 'kg', 9, 4, 1400],
    ['Pâte à pizza', 'pcs', 70, 30, 40], ['Galettes tacos', 'pcs', 120, 50, 20], ['Pommes de terre', 'kg', 60, 25, 90],
    ['Huile de friture', 'L', 25, 10, 300], ['Boissons 1 L', 'pcs', 90, 40, 110], ['Sauces', 'L', 14, 5, 450],
    ['Emballages', 'pcs', 400, 150, 8]
  ].map((s, i) => ({ id: 's' + (i + 1), name: s[0], unit: s[1], qty: s[2], min: s[3], cost: s[4] }));

  const EMPLOYEES = [
    ['Gérant', 'Gérance', 60000], ['Chef cuisinier', 'Cuisine', 50000], ['Cuisinier', 'Cuisine', 40000],
    ['Pizzaïolo', 'Cuisine', 40000], ['Caissier', 'Service', 35000], ['Livreur', 'Livraison', 30000]
  ].map((e, i) => ({ id: 'e' + (i + 1), name: e[0] + ' (à renommer)', role: e[0], team: e[1], salary: e[2], phone: '', active: true }));

  function dayKey(d) { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); }

  // Clearly-flagged demo history so the dashboard is not empty on day one.
  function demoSales() {
    const out = {}; let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 30; i >= 1; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const wk = [0.85, 0.8, 0.85, 0.95, 1.25, 1.35, 1.1][d.getDay()];
      const items = {}; let revenue = 0, orders = 0;
      PACKS.forEach(p => {
        const q = Math.round((2 + rnd() * 7) * wk * (p.num === 5 || p.num === 1 || p.num === 11 ? 1.5 : 1));
        if (q) { items[p.id] = q; revenue += q * p.price; orders += q; }
      });
      out[dayKey(d)] = { orders, revenue, items, demo: true };
    }
    return out;
  }

  function defaults() {
    return {
      v: 1,
      site: {
        name: 'iEat Fast Food',
        city: 'Oran',
        tagline: 'Le fast food premium de Belgaïd',
        heroTitle: 'Chaud, rapide,\nfait pour *toi*.',
        heroText: 'Burgers, tacos, pizzas et sandwichs préparés à la commande au cœur de Belgaïd, Oran. Choisis ton pack, on s’occupe du reste.',
        announcement: 'Commande par téléphone, à emporter ou sur place',
        phones: ['0783 19 99 92', '040 53 81 48'],
        address: 'Belgaïd, Oran, Algérie',
        hours: 'Tous les jours · midi et soir',
        mapsUrl: 'https://www.google.com/maps/place/iEat+Fast+Food+Oran+Belgaid/@35.7401984,-0.5390394,17z',
        lat: 35.7401984, lng: -0.5390394,
        facebook: 'https://www.facebook.com/iEatFastFood/photos',
        tiktok: 'https://www.tiktok.com/@ieat_fast_food_oran',
        instagram: 'https://www.instagram.com/ieat_fast_food_belgaid_oran',
        currency: 'DA'
      },
      packs: PACKS,
      menu: MENU,
      // admin-only below (never sent to visitors by the server)
      stock: STOCK,
      employees: EMPLOYEES,
      sales: demoSales(),
      expenses: { rent: 80000, utilities: 25000, other: 15000 }
    };
  }

  const LS = 'ieat_state_v1';
  const PUBLIC_KEYS = ['v', 'site', 'packs', 'menu'];

  function merge(base, over) {
    if (!over || typeof over !== 'object') return base;
    const out = Object.assign({}, base);
    for (const k in over) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && k !== 'sales') out[k] = merge(base[k], over[k]);
      else if (over[k] !== undefined) out[k] = over[k];
    }
    return out;
  }

  function readLocal() { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { return null; } }
  function writeLocal(s) { try { localStorage.setItem(LS, JSON.stringify(s)); return true; } catch (e) { return false; } }

  // Visitors: server public state → local copy → defaults.
  async function loadPublic() {
    const def = defaults();
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); if (j && j.state) return { state: merge(def, j.state), source: 'server' }; if (j && j.empty) return { state: merge(def, readLocal()), source: 'defaults' }; }
    } catch (e) { /* offline / static hosting */ }
    return { state: merge(def, readLocal()), source: 'local' };
  }

  g.IEAT = { defaults, merge, readLocal, writeLocal, loadPublic, dayKey, PUBLIC_KEYS, LS };
})(window);
