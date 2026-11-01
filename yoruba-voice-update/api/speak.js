import { checkAuth, requirePost, keyMissing, openai, body, fail, MODELS } from './_lib.js';

// Languages with a dedicated native voice service. Used when its key is set; otherwise OpenAI is used.
// 9jaLingo (Nigerian languages): https://9jalingo.org. Set NAIJALINGO_API_KEY in Vercel.
const NATIVE = {
  yo: { provider: 'naijalingo', voice: () => process.env.NAIJALINGO_VOICE_YO || 'adeola_yo' },
};

async function naijalingo(text, lang, voice) {
  const base = (process.env.NAIJALINGO_BASE_URL || 'https://api.9jalingo.org').replace(/\/$/, '');
  const r = await fetch(`${base}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.NAIJALINGO_API_KEY },
    body: JSON.stringify({ input: text, voice, lang, model: '9jalingo-tts-1', response_format: 'wav' }),
  });
  if (!r.ok) throw new Error(`9jaLingo ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
  return { audio: Buffer.from(await r.arrayBuffer()), type: 'audio/wav' };
}

async function openaiSpeech(text, accent, style, slow) {
  const kid = style === 'kid' || style === 'toddler';
  const voice = kid ? process.env.TTS_VOICE_KIDS || 'coral' : process.env.TTS_VOICE_ADULT || 'sage';
  const pace = kid || slow ? 'Speak slowly, with short pauses, very clearly.' : 'Speak at a natural, relaxed pace.';
  const tone = kid
    ? 'You are a warm, cheerful, gentle preschool teacher talking to a small child. Sound happy and encouraging.'
    : 'You are a friendly, patient language tutor talking with an adult learner.';
  const instructions = `${tone} ${pace} Pronounce every word in ${accent || 'the target language'} like a native speaker; speak any English parts in clear American English.`;
  const r = await openai('/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODELS.tts, voice, input: text, instructions, response_format: 'mp3' }),
  });
  return { audio: Buffer.from(await r.arrayBuffer()), type: 'audio/mpeg' };
}

// POST { text, lang: "es", accent: "Latin American (Mexican) Spanish", style: "toddler"|"kid"|"adult", slow?: bool }
// -> audio (mp3, or wav from a native voice)
export default async function handler(req, res) {
  if (!requirePost(req, res) || !checkAuth(req, res)) return;
  const { text, lang = '', accent = '', style = 'adult', slow = false } = body(req);
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'no_text' });
  const input = text.slice(0, 1200);

  try {
    let out = null;
    const native = NATIVE[lang];
    if (native && native.provider === 'naijalingo' && process.env.NAIJALINGO_API_KEY) {
      try { out = await naijalingo(input, lang, native.voice()); } catch (e) { console.error(e); }
    }
    if (!out) {
      if (keyMissing(res)) return;
      out = await openaiSpeech(input, accent, style, slow);
    }
    res.setHeader('Content-Type', out.type);
    res.setHeader('Cache-Control', 'private, max-age=31536000');
    res.status(200).send(out.audio);
  } catch (e) {
    fail(res, e);
  }
}
