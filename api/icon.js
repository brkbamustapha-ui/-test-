// Serves the four glossy 3D icons from our own origin (/assets/icons/<name>.webp),
// so the CSS mask used for the tint works without cross-origin restrictions.
const BASE = 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/';
const ICONS = {
  chat: '83de7c35-dd91-4e56-bfb8-0ffafc83d0e0.webp',
  star: '4d952211-0474-48cc-af48-58f68b3b7525.webp',
  coin: 'e2e91fca-5b3f-4e0e-a437-8a581592e407.webp',
  globe: '6b32bb47-4ad6-4938-a637-c997b373c68b.webp'
};
export default async function handler(req, res) {
  const file = ICONS[String(req.query.n || '')];
  if (!file) return res.status(404).end();
  try {
    const r = await fetch(BASE + file);
    if (!r.ok) return res.status(502).end();
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable');
    return res.status(200).send(buf);
  } catch (e) { return res.status(502).end(); }
}
