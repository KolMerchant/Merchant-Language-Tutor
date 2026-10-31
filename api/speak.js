import { checkAuth, requirePost, keyMissing, openai, body, fail, MODELS } from './_lib.js';

// POST { text, accent: "Latin American (Mexican) Spanish", style: "toddler"|"kid"|"adult", slow?: bool }
// -> audio/mpeg
export default async function handler(req, res) {
  if (!requirePost(req, res) || !checkAuth(req, res) || keyMissing(res)) return;
  const { text, accent = '', style = 'adult', slow = false } = body(req);
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'no_text' });

  const kid = style === 'kid' || style === 'toddler';
  const voice = kid ? process.env.TTS_VOICE_KIDS || 'coral' : process.env.TTS_VOICE_ADULT || 'sage';
  const pace = kid || slow ? 'Speak slowly, with short pauses, very clearly.' : 'Speak at a natural, relaxed pace.';
  const tone = kid
    ? 'You are a warm, cheerful, gentle preschool teacher talking to a small child. Sound happy and encouraging.'
    : 'You are a friendly, patient language tutor talking with an adult learner.';
  const instructions = `${tone} ${pace} Pronounce every word in ${accent || 'the target language'} like a native speaker; speak any English parts in clear American English.`;

  try {
    const r = await openai('/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELS.tts,
        voice,
        input: text.slice(0, 1200),
        instructions,
        response_format: 'mp3',
      }),
    });
    const audio = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=31536000');
    res.status(200).send(audio);
  } catch (e) {
    fail(res, e);
  }
}
