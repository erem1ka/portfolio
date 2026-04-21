// Netlify serverless function: proxies GitHub API calls
// Token stays server-side, never exposed to client

const GH_TOKEN = process.env.GH_TOKEN;
const GH_USER  = process.env.GH_USER;
const GH_REPO  = process.env.GH_REPO || 'portfolio';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!GH_TOKEN || !GH_USER) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch(e) { body = {}; }

  const action = body.action;

  // ── Upload a file ────────────────────────────────────────────────────────
  if (action === 'upload') {
    const { path, content, filename } = body; // content = base64
    if (!path || !content) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing path or content' }) };
    }

    // Get existing SHA if file exists (for update)
    let sha;
    try {
      const r = await fetch(
        `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${path}`,
        { headers: { Authorization: 'token ' + GH_TOKEN } }
      );
      if (r.ok) { const d = await r.json(); sha = d.sha; }
    } catch(e) {}

    const putBody = { message: 'upload ' + (filename || path), content };
    if (sha) putBody.sha = sha;

    const r = await fetch(
      `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: { Authorization: 'token ' + GH_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody),
      }
    );

    if (r.ok) {
      const d = await r.json();
      return { statusCode: 200, headers, body: JSON.stringify({ url: d.content.download_url }) };
    } else {
      const d = await r.json();
      return { statusCode: r.status, headers, body: JSON.stringify({ error: d.message }) };
    }
  }

  // ── Save portfolio-data.json ──────────────────────────────────────────────
  if (action === 'save-data') {
    const { data } = body;
    if (!data) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing data' }) };

    const path = 'portfolio-data.json';
    const content = Buffer.from(JSON.stringify(data)).toString('base64');

    let sha;
    try {
      const r = await fetch(
        `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${path}`,
        { headers: { Authorization: 'token ' + GH_TOKEN } }
      );
      if (r.ok) { const d = await r.json(); sha = d.sha; }
    } catch(e) {}

    const putBody = { message: 'update portfolio data', content };
    if (sha) putBody.sha = sha;

    const r = await fetch(
      `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: { Authorization: 'token ' + GH_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody),
      }
    );

    if (r.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } else {
      const d = await r.json();
      return { statusCode: r.status, headers, body: JSON.stringify({ error: d.message }) };
    }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
};
