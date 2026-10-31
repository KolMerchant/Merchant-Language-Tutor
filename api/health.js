import { checkAuth, hasStore } from './_lib.js';

// GET -> which services are configured (never returns secrets)
export default function handler(req, res) {
  if (!checkAuth(req, res)) return;
  res.json({ ok: true, ai: !!process.env.OPENAI_API_KEY, sync: hasStore() });
}
