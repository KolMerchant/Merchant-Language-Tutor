# Merchant Language Tutor: setup guide

A family language tutor that runs in the browser: talk to it and it talks back.
Spanish is the starting language, and 13 more (French, German, Dutch, Cantonese and others) are one tap away.

**Who gets what**

| Person | Type | What they see |
|---|---|---|
| Fatihi, Helen | Adult | *Talk with Profe*: spoken conversation on 10 topics with corrections, English on tap, a slow mode and levels from Beginner to Advanced. Also *Picture words* drills. |
| Zuri (7) | Kid | Say-it games (colors, animals, numbers, food, body, things, greetings): the app shows a picture, says the word, and she says it back for stars. Then *Quiz me*. Also *Talk with Profe* in kid mode. |
| Zoe (4) | Kid | The same say-it games, with gentler matching and a star for trying. |
| Zayn (1) | Little one | Tap a big picture and hear the word. No talking needed. |

More people can be added in ⚙️ Settings, which is locked by a parent PIN.

---

## One-time setup (about 20 minutes)

### 1. Get an OpenAI API key
1. Go to <https://platform.openai.com>, sign in, and open **Billing**. Add a card and about $5 of credit.
2. Under **Billing → Limits**, set a monthly budget (for example $10) as a safety cap.
3. Open **API keys → Create new secret key** and copy it (it starts with `sk-`).

Expected cost: a few dollars a month. Word sounds are saved on each device after the first play, so repeat plays are free.

### 2. Put the site on Vercel (free)
**Option A: no command line**
1. Create a free account at <https://github.com>. Make a new **private** repository called `merchant-language-tutor`, then use **Add file → Upload files** to upload everything in this folder (keep the `api` and `icons` folders).
2. Create a free account at <https://vercel.com> using **Continue with GitHub**.
3. Click **Add New → Project**, pick the repository and click **Deploy**. Leave all the settings at their defaults.

**Option B: command line** (needs Node.js)
```
npm i -g vercel
cd merchant-language-tutor
vercel deploy --prod
```

### 3. Add the secrets
In Vercel, open the project, then **Settings → Environment Variables**, and add:

| Name | Value |
|---|---|
| `OPENAI_API_KEY` | your `sk-…` key |
| `APP_PASSCODE` | a family code, e.g. `merchant2026`. Every device asks for it once, which stops strangers from using your OpenAI credit. |

Then open **Deployments**, click **⋯** on the latest one and choose **Redeploy**.

### 4. (Recommended) Share progress across devices
Without this step, each tablet keeps its own profiles and stars.
1. In the Vercel project, open **Storage → Create Database → Upstash for Redis** (the free plan) and connect it to this project.
2. Redeploy. Settings → Connection should now show **Share profiles & stars across devices: On**.

### 5. First run
Open your site (`https://<project>.vercel.app`), enter the family code and create the parent PIN. The five profiles are already set up.

---

## Fire tablets
1. **Kids' profiles block websites.** In the Amazon Parent Dashboard (parents.amazon.com), open the child's settings and add your `…vercel.app` address under **Web content**, or use the app from a parent profile.
2. Open the site in **Silk**, then use the menu and choose **Add to Home Screen**. It now opens full screen like an app.
3. The first time someone taps 🎤, choose **Allow** for the microphone. If you tapped Block by mistake, open Silk **Settings → Site settings → Microphone** and allow the site.

Any update you make reaches every device the next time it's opened. There's nothing to reinstall.

## Adding or changing languages
Kids or adults: ⚙️ Settings → Edit person → **Language**. Adults can also tap the language pill at the top of their screen.
To add a language that isn't in the list, add one line to `languages.js` (copy an existing line). The picture-card words for a new language are translated automatically the first time and then saved.

## Privacy
- First names only.
- Voice recordings go to OpenAI to be turned into text and are never stored by this app.
- Profiles and stars are saved in your own Redis database, or only on the device if you skipped step 4.

## Optional settings (environment variables)
| Name | Default | What it does |
|---|---|---|
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | The tutor's AI model |
| `OPENAI_TRANSCRIBE_MODEL` | `gpt-transcribe` (falls back to `whisper-1`) | Speech to text |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | The speaking voice |
| `TTS_VOICE_KIDS` / `TTS_VOICE_ADULT` | `coral` / `sage` | Voice choice |

## Testing on your own computer
```
OPENAI_API_KEY=sk-... node dev-server.mjs
```
Then open http://localhost:3000. The microphone works on localhost.

## Files
- `index.html`, `styles.css`, `app.js`: the app
- `languages.js`: languages, picture cards, built-in Spanish words and conversation topics
- `api/`: the small server (speech-to-text, tutor, voice, word translation, profile sync)
