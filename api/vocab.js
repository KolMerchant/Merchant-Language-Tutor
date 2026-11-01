import { checkAuth, requirePost, keyMissing, chatJSON, body, fail, redis, hasStore } from './_lib.js';

// POST { language: {code, name, accent}, items: [{id, en}] }
// -> { words: { [id]: { word, roman } } }
// Translates the kids' picture-card words into a new language once, then caches them.
export default async function handler(req, res) {
  if (!requirePost(req, res) || !checkAuth(req, res)) return;
  const { language = {}, items = [] } = body(req);
  const code = String(language.code || '').replace(/[^a-z-]/gi, '').slice(0, 12);
  if (!code || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'bad_request' });
  const key = `mlt:vocab:${code}:v3`;

  try {
    if (hasStore()) {
      const cached = await redis(['GET', key]);
      if (cached) return res.json({ words: JSON.parse(cached), cached: true });
    }
    if (keyMissing(res)) return;

    const list = items.slice(0, 120).map((i) => `${String(i.id).slice(0, 30)}: ${String(i.en).slice(0, 40)}`).join('\n');
    const out = await chatJSON(
      [
        {
          role: 'system',
          content: `You translate single words for a picture-card game for young children learning ${language.name} (${language.accent}).
For each item give the single most common, child-friendly word a native speaker would say to a small child. No articles unless the language always requires one. Numbers as words.
Always write words in the standard orthography with every diacritic and tone mark (e.g. Yoruba ẹ, ọ, ṣ with high/low tone accents such as ajá, ẹja, ọ̀bọ; Vietnamese tones; German umlauts); never drop them.
If ${language.name} is not written in the Latin alphabet, "roman" is the standard romanization (Jyutping with tone numbers for Cantonese, Pinyin with tone marks for Mandarin, Hepburn for Japanese, Revised Romanization for Korean, etc.); otherwise "roman" is "".
Reply only with JSON: {"words": {"<id>": {"word": "...", "roman": "..."}}}`,
        },
        { role: 'user', content: list },
      ],
      { maxTokens: 3000, temperature: 0.2 }
    );
    const words = out.words && typeof out.words === 'object' ? out.words : {};
    if (hasStore() && Object.keys(words).length >= Math.min(10, items.length)) {
      await redis(['SET', key, JSON.stringify(words)]);
    }
    res.json({ words });
  } catch (e) {
    fail(res, e);
  }
}
