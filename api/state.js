import { checkAuth, body, fail, redis, hasStore } from './_lib.js';

const KEY = 'mlt:family-state:v1';

// GET  -> { stored: bool, state: object|null }
// POST { state } -> { ok: true }
// Family profiles and progress, shared across every device. Optional: needs Upstash Redis.
export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  if (!hasStore()) return res.json({ stored: false, state: null });
  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', KEY]);
      return res.json({ stored: true, state: raw ? JSON.parse(raw) : null });
    }
    if (req.method === 'POST') {
      const { state } = body(req);
      if (!state || typeof state !== 'object' || !Array.isArray(state.profiles)) {
        return res.status(400).json({ error: 'bad_state' });
      }
      const json = JSON.stringify(state);
      if (json.length > 500_000) return res.status(413).json({ error: 'too_large' });
      await redis(['SET', KEY, json]);
      return res.json({ ok: true });
    }
    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    fail(res, e);
  }
}
