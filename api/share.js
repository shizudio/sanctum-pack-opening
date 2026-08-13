export default function handler(req, res) {
  const c = (req.query.c || '').toString().replace(/[^a-z0-9,-]/g, '').slice(0, 300);
  const origin = 'https://sanctum-pack-opening.vercel.app';
  const img = origin + '/api/og?c=' + encodeURIComponent(c);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`<!doctype html><html><head>
<meta charset="utf-8">
<title>My Sanctum Pull — Furni Pack</title>
<meta property="og:title" content="My Sanctum Pull!">
<meta property="og:description" content="5 furni cards from a Sanctum Furni Pack. Pull yours.">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${origin}/">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="My Sanctum Pull!">
<meta name="twitter:description" content="5 furni cards from a Sanctum Furni Pack. Pull yours.">
<meta name="twitter:image" content="${img}">
<meta http-equiv="refresh" content="0; url=/">
</head><body><script>location.replace('/');</script></body></html>`);
}
