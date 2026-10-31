import { checkAuth, requirePost, keyMissing, chatJSON, body, fail } from './_lib.js';

const LEVELS = {
  beginner:
    'Complete beginner. Use very short sentences (3-7 words), the most common words, present tense only. Ask one simple question at a time. Offer two possible answers in the target language when helpful.',
  elementary:
    'Elementary (A2). Short sentences, everyday vocabulary, present and simple past. Ask one question at a time.',
  intermediate:
    'Intermediate (B1). Natural everyday conversation with common idioms; occasionally introduce a useful new word.',
  advanced: 'Advanced (B2+). Speak naturally at native pace and vocabulary; correct only meaningful errors.',
};

// POST { language: {name, accent}, learner: {name, kind, age, level}, topic, messages: [{role, content}] }
// -> { reply, english, correction: {said, better, why} | null, hint }
export default async function handler(req, res) {
  if (!requirePost(req, res) || !checkAuth(req, res) || keyMissing(res)) return;
  const { language = {}, learner = {}, topic = 'free conversation', messages = [] } = body(req);
  const lang = String(language.name || 'Spanish').slice(0, 40);
  const accent = String(language.accent || lang).slice(0, 80);
  const level = LEVELS[learner.level] || LEVELS.beginner;
  const name = String(learner.name || 'friend').slice(0, 30);
  const isKid = learner.kind === 'kid';

  const system = `You are "Profe", a friendly ${lang} tutor inside the Merchant family's language app.
Learner: ${name}${isKid ? `, a child aged ${Number(learner.age) || 7}` : ', an adult'}.
Level: ${level}
Conversation topic: ${String(topic).slice(0, 80)}.
Use ${accent} vocabulary and spelling.

Rules:
- Keep the conversation going in ${lang}. Every reply ends with one question or prompt for the learner.
- Keep replies short: ${isKid ? '1-2 very short sentences, playful and encouraging' : '1-3 sentences'}.
- If the learner writes or speaks English, or says they are stuck, help them: show how to say it in ${lang}, then continue.
- If the learner's last message has a mistake in ${lang}, fill "correction" gently. Otherwise "correction" is null. Do not correct punctuation, capitalisation or missing accents that come from speech-to-text.
- The learner's messages come from speech recognition and may be imperfect; guess the intended meaning generously.
- For languages not written in the Latin alphabet, put a romanization (e.g. Jyutping for Cantonese, Pinyin for Mandarin) in "romanized"; otherwise "romanized" is "".

Reply ONLY with a JSON object:
{"reply": "<your message in ${lang}>", "romanized": "<romanization or empty>", "english": "<English translation of your reply>", "correction": null or {"said": "<what they said>", "better": "<corrected ${lang}>", "why": "<short English explanation>"}, "hint": "<one short English tip for how the learner could answer>"}`;

  const history = (Array.isArray(messages) ? messages : [])
    .slice(-16)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));

  if (history.length === 0) {
    history.push({ role: 'user', content: `(Start the conversation: greet ${name} and ask a first easy question about the topic.)` });
  }

  try {
    const out = await chatJSON([{ role: 'system', content: system }, ...history], { maxTokens: 450 });
    res.json({
      reply: String(out.reply || '').trim(),
      romanized: String(out.romanized || '').trim(),
      english: String(out.english || '').trim(),
      correction: out.correction && out.correction.better ? out.correction : null,
      hint: String(out.hint || '').trim(),
    });
  } catch (e) {
    fail(res, e);
  }
}
