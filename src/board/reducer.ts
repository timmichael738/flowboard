import type { Board, BoardAction, Column } from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function updateColumn(board: Board, columnId: string, fn: (c: Column) => Column): Board {
  return { ...board, columns: board.columns.map((c) => (c.id === columnId ? fn(c) : c)) };
}

/** Pure board reducer: every change is an immutable transition, which makes undo/redo trivial. */
export function boardReducer(board: Board, action: BoardAction): Board {
  switch (action.type) {
    case 'board/rename':
      return { ...board, title: action.title.trim() || board.title };

    case 'board/replace':
      return action.board;

    case 'column/add':
      return {
        ...board,
        columns: [...board.columns, { id: action.id, title: action.title.trim(), cardIds: [] }],
      };

    case 'column/rename':
      return updateColumn(board, action.columnId, (c) => ({
        ...c,
        title: action.title.trim() || c.title,
      }));

    case 'column/delete': {
      const column = board.columns.find((c) => c.id === action.columnId);
      if (!column) return board;
      const cards = { ...board.cards };
      for (const id of column.cardIds) delete cards[id];
      return { ...board, cards, columns: board.columns.filter((c) => c.id !== action.columnId) };
    }

    case 'column/move': {
      const columns = [...board.columns];
      const [moved] = columns.splice(action.fromIndex, 1);
      if (!moved) return board;
      columns.splice(clamp(action.toIndex, 0, columns.length), 0, moved);
      return { ...board, columns };
    }

    case 'card/add':
      return {
        ...updateColumn(board, action.columnId, (c) => ({
          ...c,
          cardIds: [...c.cardIds, action.card.id],
        })),
        cards: { ...board.cards, [action.card.id]: action.card },
      };

    case 'card/update': {
      const card = board.cards[action.cardId];
      if (!card) return board;
      return { ...board, cards: { ...board.cards, [card.id]: { ...card, ...action.patch } } };
    }

    case 'card/delete': {
      if (!board.cards[action.cardId]) return board;
      const cards = { ...board.cards };
      delete cards[action.cardId];
      return {
        ...board,
        cards,
        columns: board.columns.map((c) => ({
          ...c,
          cardIds: c.cardIds.filter((id) => id !== action.cardId),
        })),
      };
    }

    case 'card/move': {
      const source = board.columns.find((c) => c.cardIds.includes(action.cardId));
      const target = board.columns.find((c) => c.id === action.toColumnId);
      if (!source || !target) return board;

      const fromIndex = source.cardIds.indexOf(action.cardId);
      if (source.id === target.id && fromIndex === action.toIndex) return board;

      const columns = board.columns.map((c) => ({
        ...c,
        cardIds: c.cardIds.filter((id) => id !== action.cardId),
      }));
      const dest = columns.find((c) => c.id === target.id)!;
      dest.cardIds.splice(clamp(action.toIndex, 0, dest.cardIds.length), 0, action.cardId);
      return { ...board, columns };
    }
  }
}

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export type HistoryAction<A> = A | { type: 'history/undo' } | { type: 'history/redo' };

export const HISTORY_LIMIT = 100;

/**
 * Wraps any reducer with undo/redo. No-op actions (same state reference) don't create
 * history entries, and the past is capped so memory stays bounded.
 */
export function withHistory<T, A extends { type: string }>(reducer: (state: T, action: A) => T) {
  return (history: History<T>, action: HistoryAction<A>): History<T> => {
    if (action.type === 'history/undo') {
      const previous = history.past.at(-1);
      if (previous === undefined) return history;
      return {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
      };
    }
    if (action.type === 'history/redo') {
      const [next, ...future] = history.future;
      if (next === undefined) return history;
      return { past: [...history.past, history.present], present: next, future };
    }
    const present = reducer(history.present, action as A);
    if (present === history.present) return history;
    return {
      past: [...history.past, history.present].slice(-HISTORY_LIMIT),
      present,
      future: [],
    };
  };
}
