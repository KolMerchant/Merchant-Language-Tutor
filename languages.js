// Languages the tutor can teach. To add one, copy a line and fill it in.
//   code:   short id used for saving progress
//   stt:    ISO-639-1 code for speech recognition (null = let it detect)
//   bcp:    browser voice tag, used only when the AI voice is unavailable
//   accent: what the AI voice and tutor are told to use
//   script: 'latin' or 'other' (other = show romanization, compare by characters)
//   voice:  native-speaker Azure neural voice for this language (used when AZURE_SPEECH_KEY is set)
export const LANGUAGES = [
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', stt: 'es', bcp: 'es-ES', voice: 'es-ES-ElviraNeural', accent: 'Castilian Spanish from Spain', script: 'latin', praise: ['¡Muy bien!', '¡Excelente!', '¡Bravo!', '¡Súper!'] },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', stt: 'fr', bcp: 'fr-FR', voice: 'fr-FR-DeniseNeural', accent: 'standard French from France', script: 'latin', praise: ['Très bien !', 'Bravo !', 'Super !'] },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', stt: 'de', bcp: 'de-DE', voice: 'de-DE-KatjaNeural', accent: 'standard German (Hochdeutsch)', script: 'latin', praise: ['Sehr gut!', 'Super!', 'Toll!'] },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱', stt: 'nl', bcp: 'nl-NL', voice: 'nl-NL-FennaNeural', accent: 'standard Netherlands Dutch', script: 'latin', praise: ['Heel goed!', 'Super!', 'Goed zo!'] },
  { code: 'yue', name: 'Cantonese', native: '廣東話', flag: '🇭🇰', stt: null, bcp: 'zh-HK', voice: 'zh-HK-HiuMaanNeural', accent: 'Hong Kong Cantonese, written in Traditional Chinese characters', script: 'other', praise: ['好叻呀！', '好好！', '勁呀！'] },
  { code: 'zh', name: 'Mandarin', native: '中文', flag: '🇨🇳', stt: 'zh', bcp: 'zh-CN', voice: 'zh-CN-XiaoxiaoNeural', accent: 'standard Mandarin Chinese, written in Simplified characters', script: 'other', praise: ['很好！', '太棒了！'] },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹', stt: 'it', bcp: 'it-IT', voice: 'it-IT-ElsaNeural', accent: 'standard Italian', script: 'latin', praise: ['Bravissimo!', 'Molto bene!'] },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹', stt: 'pt', bcp: 'pt-PT', voice: 'pt-PT-RaquelNeural', accent: 'European Portuguese from Portugal', script: 'latin', praise: ['Muito bem!', 'Parabéns!'] },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵', stt: 'ja', bcp: 'ja-JP', voice: 'ja-JP-NanamiNeural', accent: 'standard Tokyo Japanese', script: 'other', praise: ['すごい！', 'よくできました！'] },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷', stt: 'ko', bcp: 'ko-KR', voice: 'ko-KR-SunHiNeural', accent: 'standard Seoul Korean', script: 'other', praise: ['잘했어요!', '최고!'] },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', stt: 'ar', bcp: 'ar-SA', voice: 'ar-SA-ZariyahNeural', accent: 'Modern Standard Arabic', script: 'other', praise: ['ممتاز!', 'أحسنت!'] },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', stt: 'hi', bcp: 'hi-IN', voice: 'hi-IN-SwaraNeural', accent: 'standard Hindi', script: 'other', praise: ['बहुत अच्छे!', 'शाबाश!'] },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', flag: '🇹🇿', stt: 'sw', bcp: 'sw-TZ', voice: 'sw-TZ-RehemaNeural', accent: 'standard Swahili from Tanzania', script: 'latin', praise: ['Vizuri sana!', 'Hongera!'] },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá', flag: '🇳🇬', stt: 'yo', bcp: 'yo-NG', accent: 'standard Yoruba (Nigeria)', script: 'latin', praise: ['Ó dára!', 'Ó dára púpọ̀!'] },
];

export const langByCode = (code) => LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

// Picture cards. "swatch" draws a colour circle instead of an emoji.
export const CATEGORIES = [
  {
    id: 'colors', en: 'Colors', icon: '🎨',
    cards: [
      { id: 'red', en: 'red', swatch: '#e53935' }, { id: 'blue', en: 'blue', swatch: '#1e88e5' },
      { id: 'green', en: 'green', swatch: '#43a047' }, { id: 'yellow', en: 'yellow', swatch: '#fdd835' },
      { id: 'orange_c', en: 'orange (the color)', swatch: '#fb8c00' }, { id: 'purple', en: 'purple', swatch: '#8e24aa' },
      { id: 'pink', en: 'pink', swatch: '#f06292' }, { id: 'brown', en: 'brown', swatch: '#795548' },
      { id: 'black', en: 'black', swatch: '#212121' }, { id: 'white', en: 'white', swatch: '#ffffff' },
    ],
  },
  {
    id: 'animals', en: 'Animals', icon: '🐶',
    cards: [
      { id: 'dog', en: 'dog', emoji: '🐶' }, { id: 'cat', en: 'cat', emoji: '🐱' }, { id: 'cow', en: 'cow', emoji: '🐮' },
      { id: 'pig', en: 'pig', emoji: '🐷' }, { id: 'horse', en: 'horse', emoji: '🐴' }, { id: 'duck', en: 'duck', emoji: '🦆' },
      { id: 'fish', en: 'fish', emoji: '🐟' }, { id: 'bird', en: 'bird', emoji: '🐦' }, { id: 'lion', en: 'lion', emoji: '🦁' },
      { id: 'elephant', en: 'elephant', emoji: '🐘' }, { id: 'monkey', en: 'monkey', emoji: '🐵' }, { id: 'bear', en: 'bear', emoji: '🐻' },
      { id: 'frog', en: 'frog', emoji: '🐸' }, { id: 'rabbit', en: 'rabbit', emoji: '🐰' },
    ],
  },
  {
    id: 'numbers', en: 'Numbers', icon: '🔢',
    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ id: `n${n}`, en: `the number ${n}`, number: n })),
  },
  {
    id: 'food', en: 'Food', icon: '🍎',
    cards: [
      { id: 'apple', en: 'apple', emoji: '🍎' }, { id: 'banana', en: 'banana', emoji: '🍌' }, { id: 'orange_f', en: 'orange (the fruit)', emoji: '🍊' },
      { id: 'strawberry', en: 'strawberry', emoji: '🍓' }, { id: 'milk', en: 'milk', emoji: '🥛' }, { id: 'water', en: 'water', emoji: '💧' },
      { id: 'bread', en: 'bread', emoji: '🍞' }, { id: 'egg', en: 'egg', emoji: '🥚' }, { id: 'cheese', en: 'cheese', emoji: '🧀' },
      { id: 'cookie', en: 'cookie', emoji: '🍪' },
    ],
  },
  {
    id: 'body', en: 'My body', icon: '✋',
    cards: [
      { id: 'hand', en: 'hand', emoji: '✋' }, { id: 'foot', en: 'foot', emoji: '🦶' }, { id: 'eye', en: 'eye', emoji: '👁️' },
      { id: 'nose', en: 'nose', emoji: '👃' }, { id: 'mouth', en: 'mouth', emoji: '👄' }, { id: 'ear', en: 'ear', emoji: '👂' },
      { id: 'tooth', en: 'tooth', emoji: '🦷' },
    ],
  },
  {
    id: 'things', en: 'Things', icon: '⚽',
    cards: [
      { id: 'ball', en: 'ball', emoji: '⚽' }, { id: 'car', en: 'car', emoji: '🚗' }, { id: 'house', en: 'house', emoji: '🏠' },
      { id: 'sun', en: 'sun', emoji: '☀️' }, { id: 'moon', en: 'moon', emoji: '🌙' }, { id: 'star', en: 'star', emoji: '⭐' },
      { id: 'tree', en: 'tree', emoji: '🌳' }, { id: 'book', en: 'book', emoji: '📖' }, { id: 'shoe', en: 'shoe', emoji: '👟' },
    ],
  },
  {
    id: 'words', en: 'Hello & thank you', icon: '👋',
    cards: [
      { id: 'hello', en: 'hello', emoji: '👋' }, { id: 'goodbye', en: 'goodbye', emoji: '🙋' }, { id: 'thanks', en: 'thank you', emoji: '🙏' },
      { id: 'please', en: 'please', emoji: '🥺' }, { id: 'yes', en: 'yes', emoji: '👍' }, { id: 'no', en: 'no', emoji: '👎' },
      { id: 'goodmorning', en: 'good morning', emoji: '🌅' }, { id: 'goodnight', en: 'good night', emoji: '🌛' },
      { id: 'mom', en: 'mom', emoji: '👩' }, { id: 'dad', en: 'dad', emoji: '👨' }, { id: 'baby', en: 'baby', emoji: '👶' },
    ],
  },
];

// Built-in Spanish (Spain) so Spanish works instantly and reliably.
// Other languages are translated by the AI the first time, then saved.
export const BUILTIN_WORDS = {
  es: {
    red: 'rojo', blue: 'azul', green: 'verde', yellow: 'amarillo', orange_c: 'naranja', purple: 'morado', pink: 'rosa', brown: 'marrón', black: 'negro', white: 'blanco',
    dog: 'perro', cat: 'gato', cow: 'vaca', pig: 'cerdo', horse: 'caballo', duck: 'pato', fish: 'pez', bird: 'pájaro', lion: 'león', elephant: 'elefante', monkey: 'mono', bear: 'oso', frog: 'rana', rabbit: 'conejo',
    n1: 'uno', n2: 'dos', n3: 'tres', n4: 'cuatro', n5: 'cinco', n6: 'seis', n7: 'siete', n8: 'ocho', n9: 'nueve', n10: 'diez',
    apple: 'manzana', banana: 'plátano', orange_f: 'naranja', strawberry: 'fresa', milk: 'leche', water: 'agua', bread: 'pan', egg: 'huevo', cheese: 'queso', cookie: 'galleta',
    hand: 'mano', foot: 'pie', eye: 'ojo', nose: 'nariz', mouth: 'boca', ear: 'oreja', tooth: 'diente',
    ball: 'pelota', car: 'coche', house: 'casa', sun: 'sol', moon: 'luna', star: 'estrella', tree: 'árbol', book: 'libro', shoe: 'zapato',
    hello: 'hola', goodbye: 'adiós', thanks: 'gracias', please: 'por favor', yes: 'sí', no: 'no', goodmorning: 'buenos días', goodnight: 'buenas noches', mom: 'mamá', dad: 'papá', baby: 'bebé',
  },
};

export const TOPICS = [
  { id: 'free', icon: '💬', en: 'Free chat' },
  { id: 'intro', icon: '🙋', en: 'Introduce yourself' },
  { id: 'family', icon: '👨‍👩‍👧‍👦', en: 'Family' },
  { id: 'food', icon: '🍽️', en: 'Ordering food' },
  { id: 'shopping', icon: '🛒', en: 'Shopping' },
  { id: 'travel', icon: '🗺️', en: 'Directions & travel' },
  { id: 'work', icon: '💼', en: 'Work' },
  { id: 'weekend', icon: '🎉', en: 'Weekend plans' },
  { id: 'school', icon: '🏫', en: 'Kids & school' },
  { id: 'doctor', icon: '🩺', en: 'Role-play: at the doctor' },
];

export const KID_TOPICS = [
  { id: 'kid-animals', icon: '🐾', en: 'Favorite animals' },
  { id: 'kid-colors', icon: '🌈', en: 'Colors around me' },
  { id: 'kid-food', icon: '🍕', en: 'What I like to eat' },
  { id: 'kid-play', icon: '🧸', en: 'Toys and games' },
];
