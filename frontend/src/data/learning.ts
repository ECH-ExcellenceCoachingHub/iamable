/**
 * Content for the Learn Sign Language page. Every `en` gloss must exist in asl-signs.json, and
 * every `rw` word in the Kinyarwanda dictionary, so lessons show the same signs the translator uses.
 */

export interface LessonWord {
  /** English gloss, used to look up the ASL sign. */
  en: string;
  /** Kinyarwanda equivalent, when known. */
  rw?: string;
  /** Short usage hint. */
  note?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  emoji: string;
  words: LessonWord[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'greetings',
    title: 'Greetings & courtesy',
    description: 'The first signs to learn: say hello, thank people and be polite.',
    emoji: '👋',
    words: [
      { en: 'hello', rw: 'muraho' },
      { en: 'goodbye', rw: 'murabeho' },
      { en: 'thank you', rw: 'murakoze' },
      { en: 'please' },
      { en: 'sorry', rw: 'mbabarira' },
      { en: 'yes', rw: 'yego' },
      { en: 'no', rw: 'oya' },
      { en: 'name', rw: 'izina', note: 'Ask "your name what?" — questions come at the end in sign.' },
      { en: 'nice' },
      { en: 'meet' },
    ],
  },
  {
    id: 'questions',
    title: 'Questions',
    description: 'Question signs, with raised or lowered eyebrows to show you are asking.',
    emoji: '❓',
    words: [
      { en: 'what', rw: 'iki' },
      { en: 'where', rw: 'he' },
      { en: 'when', rw: 'ryari' },
      { en: 'who' },
      { en: 'why', rw: 'kuki' },
      { en: 'how', rw: 'gute' },
      { en: 'understand', note: 'Useful to check the other person has followed you.' },
      { en: 'again', note: 'Ask someone to repeat a sign.' },
      { en: 'slow', note: 'Ask someone to sign more slowly.' },
    ],
  },
  {
    id: 'people',
    title: 'Family & people',
    description: 'Talk about the people in your life and in the Deaf community.',
    emoji: '👨‍👩‍👧',
    words: [
      { en: 'mother', rw: 'mama' },
      { en: 'father', rw: 'papa' },
      { en: 'family', rw: 'umuryango' },
      { en: 'friend', rw: 'inshuti' },
      { en: 'brother', rw: 'umuvandimwe' },
      { en: 'sister', rw: 'mushiki' },
      { en: 'baby' },
      { en: 'teacher', rw: 'mwarimu' },
      { en: 'deaf', rw: 'igipfamatwi' },
      { en: 'hearing', note: 'Means a hearing person, not the sense of hearing.' },
    ],
  },
  {
    id: 'daily',
    title: 'Daily needs',
    description: 'Everyday signs for food, home, work and getting what you need.',
    emoji: '🏠',
    words: [
      { en: 'eat', rw: 'kurya' },
      { en: 'drink', rw: 'kunywa' },
      { en: 'water', rw: 'amazi' },
      { en: 'food', rw: 'ibiryo' },
      { en: 'sleep', rw: 'gusinzira' },
      { en: 'bathroom', rw: 'ubwiherero' },
      { en: 'want' },
      { en: 'need' },
      { en: 'more' },
      { en: 'finish' },
      { en: 'home', rw: 'urugo' },
      { en: 'work', rw: 'akazi' },
      { en: 'money', rw: 'amafaranga' },
      { en: 'phone', rw: 'telefoni' },
    ],
  },
  {
    id: 'health',
    title: 'Health & emergencies',
    description: 'Signs that can keep someone safe. Learn these early.',
    emoji: '🚑',
    words: [
      { en: 'help', rw: 'ubufasha' },
      { en: 'doctor', rw: 'umuganga' },
      { en: 'hospital', rw: 'ibitaro' },
      { en: 'medicine', rw: 'umuti' },
      { en: 'pain', rw: 'ububabare' },
      { en: 'hurt', rw: 'kubabara' },
      { en: 'sick' },
      { en: 'emergency' },
      { en: 'ambulance' },
      { en: 'police', rw: 'polisi' },
      { en: 'fire' },
      { en: 'danger' },
      { en: 'stop' },
      { en: 'wait' },
    ],
  },
  {
    id: 'feelings',
    title: 'Feelings',
    description: 'Show how you feel. Your face carries as much meaning as your hands.',
    emoji: '😊',
    words: [
      { en: 'happy' },
      { en: 'sad' },
      { en: 'love' },
      { en: 'i love you', rw: 'ndagukunda' },
      { en: 'good', rw: 'byiza' },
      { en: 'bad', rw: 'bibi' },
      { en: 'fine' },
      { en: 'like' },
      { en: 'hungry', rw: 'inzara' },
      { en: 'thirsty' },
      { en: 'tired', rw: 'umunaniro' },
      { en: 'cold' },
      { en: 'hot' },
    ],
  },
  {
    id: 'time-school',
    title: 'Time & school',
    description: 'Talk about when things happen and about learning.',
    emoji: '📚',
    words: [
      { en: 'today' },
      { en: 'tomorrow', rw: 'ejo', note: 'In Kinyarwanda, "ejo" means both tomorrow and yesterday.' },
      { en: 'yesterday', rw: 'ejo' },
      { en: 'now' },
      { en: 'morning' },
      { en: 'night' },
      { en: 'time' },
      { en: 'school', rw: 'ishuri' },
      { en: 'learn', rw: 'kwiga' },
      { en: 'sign' },
      { en: 'child', rw: 'umwana' },
    ],
  },
];

export const ALL_WORDS: LessonWord[] = LESSONS.flatMap((lesson) => lesson.words);

export const SIGN_LANGUAGES: { name: string; short: string; region: string; description: string; inApp?: boolean }[] = [
  {
    name: 'American Sign Language',
    short: 'ASL',
    region: 'United States, Canada and beyond',
    description:
      'The signs in these lessons and in the Am Able translator are ASL. It is widely used and influenced sign languages in many countries.',
    inApp: true,
  },
  {
    name: 'Rwandan Sign Language',
    short: 'RSL',
    region: 'Rwanda',
    description:
      'The sign language of Deaf Rwandans. Am Able understands Kinyarwanda words and shows the matching ASL sign; some local signs differ, so learn them from Deaf Rwandans too.',
  },
  {
    name: 'British Sign Language',
    short: 'BSL',
    region: 'United Kingdom',
    description: 'Not related to ASL, even though both countries speak English. BSL uses a two-handed alphabet.',
  },
  {
    name: 'French Sign Language',
    short: 'LSF',
    region: 'France and French-speaking regions',
    description: 'One of the oldest documented sign languages. ASL grew partly out of LSF, so they share some signs.',
  },
  {
    name: 'International Sign',
    short: 'IS',
    region: 'International events',
    description: 'A contact variety used when Deaf people from different countries meet, for example at international conferences and sports events.',
  },
];

export const LEARNING_TIPS: { title: string; body: string }[] = [
  { title: 'Practise a little every day', body: 'Five minutes a day works better than one long session a week. Mark signs as learned and come back to the quiz.' },
  { title: 'Use your face', body: 'Facial expressions are grammar in sign language: raised eyebrows for yes/no questions, lowered for what/where/why questions.' },
  { title: 'Learn the alphabet first', body: 'Fingerspelling lets you spell names and any word you don’t know the sign for yet.' },
  { title: 'Watch the movement, not just the hand shape', body: 'Where the hand is, how it moves and which way the palm faces all change the meaning.' },
  { title: 'Learn from Deaf people', body: 'Signs vary between countries and regions. Deaf signers are the best teachers of the local signs.' },
];

export const DEAF_AWARENESS_TIPS: { title: string; body: string }[] = [
  { title: 'Get attention kindly', body: 'Wave within their view, or tap the shoulder gently. Don’t grab or shout.' },
  { title: 'Face the person', body: 'Keep your face and mouth visible, stand in good light and don’t cover your mouth.' },
  { title: 'Speak naturally', body: 'If you speak, use a normal pace. Shouting or over-exaggerating makes lip-reading harder.' },
  { title: 'Ask how they prefer to communicate', body: 'Sign, writing, typing on a phone or Am Able’s Text to Sign — let the Deaf person choose.' },
  { title: 'Talk to the person, not the interpreter', body: 'Look at and address the Deaf person directly when an interpreter is present.' },
  { title: 'Be patient and rephrase', body: 'If something isn’t understood, say it a different way or write it down instead of repeating louder.' },
];
