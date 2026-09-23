import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LetterSamples } from '@/lib/fingerspelling';

/** Examples kept per letter; older ones are dropped first. */
const MAX_PER_LETTER = 40;

interface FingerspellState {
  /** The user's recorded handshapes, as hand-coordinate vectors, keyed by letter. */
  samples: LetterSamples;
  addSample: (letter: string, vector: number[]) => void;
  clearLetter: (letter: string) => void;
  clearAll: () => void;
}

export const useFingerspellStore = create<FingerspellState>()(
  persist(
    (set) => ({
      samples: {},
      addSample: (letter, vector) =>
        set((state) => ({
          samples: {
            ...state.samples,
            // Rounded to keep localStorage small; millimetre precision is plenty.
            [letter]: [...(state.samples[letter] ?? []), vector.map((v) => Math.round(v * 1000) / 1000)].slice(-MAX_PER_LETTER),
          },
        })),
      clearLetter: (letter) =>
        set((state) => ({ samples: Object.fromEntries(Object.entries(state.samples).filter(([l]) => l !== letter)) })),
      clearAll: () => set({ samples: {} }),
    }),
    { name: 'fingerspell-samples' }
  )
);
