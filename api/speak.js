import { checkAuth, requirePost, keyMissing, openai, body, fail, MODELS } from './_lib.js';
import { azureReady, naijaReady, azureVoice, azureSpeech, naijalingoSpeech } from './_voices.js';

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

// POST { text, lang: "es" | "en" | ..., accent, style: "toddler"|"kid"|"adult", slow?: bool }
// -> audio. Uses the native voice for the language when one is set up, else OpenAI.
export default async function handler(req, res) {
  if (!requirePost(req, res) || !checkAuth(req, res)) return;
  const { text, lang = '', accent = '', style = 'adult', slow = false } = body(req);
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'no_text' });
  const input = text.slice(0, 1200);

  try {
    let out = null;
    try {
      if (lang === 'yo' && naijaReady()) out = await naijalingoSpeech(input, lang);
      else if (azureReady() && azureVoice(lang)) out = await azureSpeech(input, lang, { style, slow });
    } catch (e) {
      console.error('native voice failed, using OpenAI', e);
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
