import type { Board, Card, Column, Label } from './types';

const STORAGE_KEY = 'flowboard:board';
const LABEL_COLORS = new Set(['blue', 'orange', 'aqua', 'violet', 'magenta', 'green']);

const isString = (v: unknown): v is string => typeof v === 'string';
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function isLabel(v: unknown): v is Label {
  return isObject(v) && isString(v.id) && isString(v.name) && LABEL_COLORS.has(v.color as string);
}

function isCard(v: unknown): v is Card {
  return (
    isObject(v) &&
    isString(v.id) &&
    isString(v.title) &&
    isString(v.description) &&
    Array.isArray(v.labelIds) &&
    v.labelIds.every(isString) &&
    (v.due === null || (isString(v.due) && /^\d{4}-\d{2}-\d{2}$/.test(v.due))) &&
    isString(v.createdAt)
  );
}

function isColumn(v: unknown): v is Column {
  return (
    isObject(v) &&
    isString(v.id) &&
    isString(v.title) &&
    Array.isArray(v.cardIds) &&
    v.cardIds.every(isString)
  );
}

/**
 * Validates untrusted JSON (imports, old localStorage) and checks referential integrity:
 * every card belongs to exactly one column and every referenced card exists.
 */
export function parseBoard(raw: unknown): Board {
  if (!isObject(raw) || raw.version !== 1 || !isString(raw.title)) {
    throw new Error('Not a Flowboard export (expected version 1)');
  }
  if (!Array.isArray(raw.columns) || !raw.columns.every(isColumn))
    throw new Error('Invalid columns');
  if (!Array.isArray(raw.labels) || !raw.labels.every(isLabel)) throw new Error('Invalid labels');
  if (!isObject(raw.cards) || !Object.values(raw.cards).every(isCard))
    throw new Error('Invalid cards');

  const cards = raw.cards as Record<string, Card>;
  const seen = new Set<string>();
  for (const column of raw.columns) {
    for (const id of column.cardIds) {
      if (!cards[id]) throw new Error(`Column "${column.title}" references a missing card`);
      if (seen.has(id)) throw new Error('A card appears in more than one column');
      seen.add(id);
    }
  }
  return { version: 1, title: raw.title, columns: raw.columns, labels: raw.labels, cards };
}

export function loadBoard(): Board | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseBoard(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

export function saveBoard(board: Board): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
    /* storage full or unavailable: the board still works in memory */
  }
}

export function exportBoard(board: Board): void {
  const blob = new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `${board.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'board'}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
}
