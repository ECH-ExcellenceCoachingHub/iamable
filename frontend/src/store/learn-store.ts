import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LearnState {
  /** English glosses the learner has marked as learned. */
  learned: string[];
  quizBest: number;
  toggleLearned: (gloss: string) => void;
  recordQuizScore: (score: number) => void;
  reset: () => void;
}

export const useLearnStore = create<LearnState>()(
  persist(
    (set) => ({
      learned: [],
      quizBest: 0,
      toggleLearned: (gloss) =>
        set((state) => ({
          learned: state.learned.includes(gloss) ? state.learned.filter((g) => g !== gloss) : [...state.learned, gloss],
        })),
      recordQuizScore: (score) => set((state) => ({ quizBest: Math.max(state.quizBest, score) })),
      reset: () => set({ learned: [], quizBest: 0 }),
    }),
    { name: 'learn-progress' }
  )
);
