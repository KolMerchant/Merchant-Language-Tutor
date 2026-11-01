// Native-speaker voices. Which service speaks which language:
//   Yoruba            -> 9jaLingo (NAIJALINGO_API_KEY), a service built for Nigerian languages
//   all other languages -> Azure neural voices (AZURE_SPEECH_KEY + AZURE_SPEECH_REGION)
//   anything left     -> OpenAI (an imitation of the accent; the fallback)
import { LANGUAGES } from '../languages.js';

const ENGLISH_VOICE = 'en-US-JennyNeural';

export function azureReady() {
  return !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
}
export function naijaReady() {
  return !!process.env.NAIJALINGO_API_KEY;
}

// Azure voice for a language code; an env var like AZURE_VOICE_ES overrides it.
export function azureVoice(code) {
  const override = process.env[`AZURE_VOICE_${String(code).toUpperCase()}`];
  if (override) return override;
  if (code === 'en') return ENGLISH_VOICE;
  return LANGUAGES.find((l) => l.code === code)?.voice || null;
}

// Languages that currently have a native voice (the app speaks their words separately from English).
export function nativeVoiceCodes() {
  const codes = [];
  for (const l of LANGUAGES) {
    if (l.code === 'yo' ? naijaReady() : azureReady() && azureVoice(l.code)) codes.push(l.code);
  }
  return codes;
}

const xml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

export async function azureSpeech(text, code, { style = 'adult', slow = false } = {}) {
  const voice = azureVoice(code);
  if (!voice) throw new Error(`no azure voice for ${code}`);
  const locale = voice.split('-').slice(0, 2).join('-');
  const rate = style === 'toddler' ? '-25%' : style === 'kid' ? '-15%' : slow ? '-20%' : '0%';
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${voice}"><prosody rate="${rate}">${xml(text)}</prosody></voice></speak>`;
  const url = process.env.AZURE_SPEECH_ENDPOINT || `https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'merchant-language-tutor',
    },
    body: ssml,
  });
  if (!r.ok) throw new Error(`Azure ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
  return { audio: Buffer.from(await r.arrayBuffer()), type: 'audio/mpeg' };
}

export async function naijalingoSpeech(text, code) {
  const base = (process.env.NAIJALINGO_BASE_URL || 'https://api.9jalingo.org').replace(/\/$/, '');
  const voice = process.env.NAIJALINGO_VOICE_YO || 'adeola_yo';
  const r = await fetch(`${base}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.NAIJALINGO_API_KEY },
    body: JSON.stringify({ input: text, voice, lang: code, model: '9jalingo-tts-1', response_format: 'wav' }),
  });
  if (!r.ok) throw new Error(`9jaLingo ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
  return { audio: Buffer.from(await r.arrayBuffer()), type: 'audio/wav' };
}
