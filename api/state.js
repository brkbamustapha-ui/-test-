// iEat Fast Food — shared state API (Vercel Function + Vercel Blob).
// GET  /api/state                      → public part of the site (site, packs, menu)
// POST /api/state {action:"login"}     → token + full state
// POST /api/state {action:"load"}      → full state            (Bearer token)
// POST /api/state {action:"save"}      → save full state        (Bearer token)
// POST /api/state {action:"credentials"} → change user/password (Bearer token)
import { put, head } from '@vercel/blob';
import crypto from 'node:crypto';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const SECRET = process.env.ADMIN_SECRET || TOKEN || '';
const PUBLIC_KEYS = ['v', 'site', 'packs', 'menu'];
const DEFAULT_USER = 'user';
const DEFAULT_PASS = 'Ieat';
const TTL = 12 * 3600 * 1000;

const hmac = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('hex');
const PUB_PATH = 'ieat/public.json';
const PRIV_PATH = () => 'ieat/private-' + hmac('private-state').slice(0, 32) + '.json';

async function readJson(path) {
  try {
    const meta = await head(path, { token: TOKEN });
    const r = await fetch(meta.url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
async function writeJson(path, data) {
  await put(path, JSON.stringify(data), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60, token: TOKEN
  });
}

function hashPass(pass, salt) { return crypto.scryptSync(String(pass), salt, 32).toString('hex'); }
function safeEq(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); }
function sign(user) { const exp = Date.now() + TTL; const body = Buffer.from(JSON.stringify({ user, exp })).toString('base64url'); return body + '.' + hmac('tok.' + body); }
function verify(tok) {
  if (!tok || tok.indexOf('.') < 0) return null;
  const [body, sig] = tok.split('.');
  if (!safeEq(sig, hmac('tok.' + body))) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch (e) { return null; }
}
async function getAuth(priv) {
  if (priv && priv.auth && priv.auth.hash) return priv.auth;
  const salt = 'default-salt';
  return { user: DEFAULT_USER, salt, hash: hashPass(DEFAULT_PASS, salt) };
}
function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((ok) => { let d = ''; req.on('data', c => { d += c; if (d.length > 4e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch (e) { ok({}); } }); });
}
const fails = new Map();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) return res.status(501).json({ configured: false, error: 'Stockage serveur non configuré (BLOB_READ_WRITE_TOKEN manquant).' });

  if (req.method === 'GET') {
    const pub = await readJson(PUB_PATH);
    return res.status(200).json(pub ? { state: pub } : { empty: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const body = await readBody(req);
  const action = body.action;

  if (action === 'login') {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
    const f = fails.get(ip) || { n: 0, t: 0 };
    if (f.n >= 8 && Date.now() - f.t < 5 * 60 * 1000) return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans 5 minutes.' });
    const priv = await readJson(PRIV_PATH());
    const auth = await getAuth(priv);
    const okUser = safeEq(String(body.user || ''), auth.user);
    const okPass = safeEq(hashPass(body.pass || '', auth.salt), auth.hash);
    if (!okUser || !okPass) { fails.set(ip, { n: f.n + 1, t: Date.now() }); return res.status(401).json({ error: 'Identifiants incorrects' }); }
    fails.delete(ip);
    const pub = await readJson(PUB_PATH);
    const state = Object.assign({}, priv ? priv.data : null, pub || {});
    return res.status(200).json({ token: sign(auth.user), user: auth.user, state: (pub || priv) ? state : null });
  }

  const tok = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  if (!tok) return res.status(401).json({ error: 'Session expirée, reconnecte-toi.' });

  if (action === 'load') {
    const [pub, priv] = await Promise.all([readJson(PUB_PATH), readJson(PRIV_PATH())]);
    return res.status(200).json({ state: (pub || priv) ? Object.assign({}, priv ? priv.data : null, pub || {}) : null });
  }

  if (action === 'save') {
    const s = body.state;
    if (!s || typeof s !== 'object' || !s.site || !Array.isArray(s.packs)) return res.status(400).json({ error: 'État invalide' });
    const pub = {}; const data = {};
    for (const k in s) (PUBLIC_KEYS.includes(k) ? pub : data)[k] = s[k];
    const priv = (await readJson(PRIV_PATH())) || {};
    priv.data = data;
    await Promise.all([writeJson(PUB_PATH, pub), writeJson(PRIV_PATH(), priv)]);
    return res.status(200).json({ ok: true, savedAt: Date.now() });
  }

  if (action === 'credentials') {
    const priv = (await readJson(PRIV_PATH())) || {};
    const auth = await getAuth(priv);
    if (!safeEq(hashPass(body.current || '', auth.salt), auth.hash)) return res.status(403).json({ error: 'Mot de passe actuel incorrect' });
    const user = String(body.user || '').trim(); const pass = String(body.pass || '');
    if (user.length < 3 || pass.length < 4) return res.status(400).json({ error: 'Nom d’utilisateur ≥ 3 caractères, mot de passe ≥ 4 caractères' });
    const salt = crypto.randomBytes(16).toString('hex');
    priv.auth = { user, salt, hash: hashPass(pass, salt) };
    await writeJson(PRIV_PATH(), priv);
    return res.status(200).json({ ok: true, token: sign(user), user });
  }

  return res.status(400).json({ error: 'Action inconnue' });
}
