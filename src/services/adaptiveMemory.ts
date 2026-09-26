import { LearnedWordEntry, INITIAL_LEARNED_LEXICON } from '../data/learningModelsData';

const STORAGE_KEY = 'voice_ai_learned_lexicon_v1';

export function loadLearnedLexicon(): LearnedWordEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not read from localStorage, using defaults', e);
  }
  return INITIAL_LEARNED_LEXICON;
}

export function saveLearnedLexicon(list: LearnedWordEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

export function learnNewWord(
  existingList: LearnedWordEntry[],
  newWord: string,
  contextTag: string = 'Пользовательский словарь',
  source: 'auto-recognized' | 'manual-addition' | 'error-correction' = 'manual-addition',
  beforeCorrection?: string
): { updatedList: LearnedWordEntry[]; learnedItem: LearnedWordEntry } {
  const trimmed = newWord.trim();
  if (!trimmed) {
    throw new Error('Word cannot be empty');
  }

  const existingIndex = existingList.findIndex(
    item => item.word.toLowerCase() === trimmed.toLowerCase()
  );

  let updatedList = [...existingList];
  let learnedItem: LearnedWordEntry;

  if (existingIndex >= 0) {
    const prev = existingList[existingIndex];
    learnedItem = {
      ...prev,
      frequency: prev.frequency + 1,
      boostDb: Math.min(16.0, prev.boostDb + 1.2),
      lastTrained: 'Только что',
      contextTag: contextTag || prev.contextTag,
      source,
      beforeCorrection: beforeCorrection || prev.beforeCorrection
    };
    updatedList[existingIndex] = learnedItem;
  } else {
    learnedItem = {
      id: Date.now().toString(),
      word: trimmed,
      frequency: 1,
      boostDb: 9.0,
      contextTag: contextTag || 'Пользовательский термин',
      lastTrained: 'Только что',
      source,
      beforeCorrection
    };
    updatedList = [learnedItem, ...updatedList];
  }

  saveLearnedLexicon(updatedList);
  return { updatedList, learnedItem };
}

export function deleteLearnedWord(
  existingList: LearnedWordEntry[],
  id: string
): LearnedWordEntry[] {
  const updated = existingList.filter(item => item.id !== id);
  saveLearnedLexicon(updated);
  return updated;
}

export function generateHotwordsList(lexicon: LearnedWordEntry[]): string {
  return lexicon.map(item => item.word).join(', ');
}

export function exportLexiconAsSherpaHotwords(lexicon: LearnedWordEntry[]): string {
  return lexicon.map(item => `${item.word} : ${item.boostDb.toFixed(1)}`).join('\n');
}

export function exportLexiconAsWhisperPrompt(lexicon: LearnedWordEntry[]): string {
  return lexicon.map(item => item.word).join(', ');
}
