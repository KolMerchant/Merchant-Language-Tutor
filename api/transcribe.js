import { checkAuth, requirePost, keyMissing, openai, body, fail, MODELS } from './_lib.js';

// POST { audio: base64, mime: "audio/webm", lang: "es" | null, prompt?: string }
// -> { text }
// The audio is forwarded to OpenAI and never stored.
export default async function handler(req, res) {
  if (!requirePost(req, res) || !checkAuth(req, res) || keyMissing(res)) return;
  const { audio, mime = 'audio/webm', lang, prompt } = body(req);
  if (!audio || typeof audio !== 'string') return res.status(400).json({ error: 'no_audio' });

  const buf = Buffer.from(audio, 'base64');
  if (buf.length < 800) return res.json({ text: '' }); // too short to contain speech
  if (buf.length > 4_000_000) return res.status(413).json({ error: 'audio_too_long' });

  const baseMime = mime.split(';')[0];
  const ext = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' }[baseMime] || 'webm';

  const send = async (model) => {
    const form = new FormData();
    form.append('file', new Blob([buf], { type: baseMime }), `clip.${ext}`);
    form.append('model', model);
    if (lang) form.append('language', lang);
    if (prompt) form.append('prompt', String(prompt).slice(0, 400));
    const r = await openai('/audio/transcriptions', { method: 'POST', body: form });
    const data = await r.json();
    return (data.text || '').trim();
  };

  try {
    let text;
    try {
      text = await send(MODELS.transcribe);
    } catch (e) {
      if (e.status === 400 || e.status === 404) text = await send(MODELS.transcribeFallback);
      else throw e;
    }
    res.json({ text });
  } catch (e) {
    fail(res, e);
  }
}
