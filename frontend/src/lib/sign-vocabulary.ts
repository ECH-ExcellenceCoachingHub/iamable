/** Maps MediaPipe's built-in gesture labels to the Kinyarwanda word they represent. */
export const GESTURE_LABELS: Record<string, string> = {
  'None':          '',
  'Closed_Fist':   'oya (no)',
  'Open_Palm':     'muraho (hello)',
  'Pointing_Up':   'yego (yes)',
  'Thumb_Down':    'bibi (bad)',
  'Thumb_Up':      'byiza (good)',
  'Victory':       'urakoze (thank you)',
  'ILoveYou':      'gukunda (love)',
};

/** Reference guide of recognisable gestures, shown in the Sign to Text studio. */
export const GESTURE_GUIDE: { gesture: string; emoji: string; word: string }[] = [
  { gesture: 'Open palm', emoji: '✋', word: 'muraho (hello)' },
  { gesture: 'Thumb up', emoji: '👍', word: 'byiza (good)' },
  { gesture: 'Thumb down', emoji: '👎', word: 'bibi (bad)' },
  { gesture: 'Pointing up', emoji: '☝️', word: 'yego (yes)' },
  { gesture: 'Closed fist', emoji: '✊', word: 'oya (no)' },
  { gesture: 'Victory', emoji: '✌️', word: 'urakoze (thank you)' },
  { gesture: 'I love you', emoji: '🤟', word: 'gukunda (love)' },
];
