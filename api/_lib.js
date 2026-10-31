// Shared helpers for the API routes. Files starting with "_" are not routes on Vercel.

export const MODELS = {
  chat: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  transcribe: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-transcribe',
  transcribeFallback: 'whisper-1',
  tts: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
};

const BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

// Returns true if the request may proceed; otherwise sends 401 and returns false.
export function checkAuth(req, res) {
  const code = process.env.APP_PASSCODE;
  if (!code) return true; // no passcode configured
  const given = req.headers['x-family-code'];
  if (given && String(given).trim().toLowerCase() === code.trim().toLowerCase()) return true;
  res.status(401).json({ error: 'family_code_required' });
  return false;
}

export function requirePost(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return false;
  }
  return true;
}

export function keyMissing(res) {
  if (process.env.OPENAI_API_KEY) return false;
  res.status(503).json({ error: 'openai_key_missing' });
  return true;
}

export async function openai(path, init = {}) {
  const headers = { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...(init.headers || {}) };
  const r = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    const err = new Error(`OpenAI ${path} ${r.status}: ${body.slice(0, 300)}`);
    err.status = r.status;
    throw err;
  }
  return r;
}

export async function chatJSON(messages, { maxTokens = 500, temperature = 0.6 } = {}) {
  const r = await openai('/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELS.chat,
      messages,
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
    }),
  });
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

export function fail(res, e) {
  console.error(e);
  res.status(502).json({ error: 'upstream_error', detail: String(e.message || e).slice(0, 300) });
}

// ---- Optional Redis (Upstash via the Vercel Marketplace) ----
function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export function hasStore() {
  return !!redisConfig();
}

export async function redis(command) {
  const cfg = redisConfig();
  if (!cfg) return null;
  const r = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error(`Redis ${r.status}`);
  const data = await r.json();
  return data.result;
}
