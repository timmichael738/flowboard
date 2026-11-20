import { describe, expect, it } from 'vitest';
import { boardReducer, HISTORY_LIMIT, withHistory, type History } from './reducer';
import { createSeedBoard } from './seed';
import { parseBoard } from './storage';
import type { Board } from './types';

const column = (board: Board, id: string) => board.columns.find((c) => c.id === id)!;

describe('boardReducer', () => {
  it('reorders a card within a column', () => {
    const board = createSeedBoard(); // todo: [c1, c7]
    const next = boardReducer(board, {
      type: 'card/move',
      cardId: 'c1',
      toColumnId: 'todo',
      toIndex: 1,
    });
    expect(column(next, 'todo').cardIds).toEqual(['c7', 'c1']);
  });

  it('moves a card to another column at a position', () => {
    const board = createSeedBoard();
    const next = boardReducer(board, {
      type: 'card/move',
      cardId: 'c1',
      toColumnId: 'doing',
      toIndex: 1,
    });
    expect(column(next, 'todo').cardIds).toEqual(['c7']);
    expect(column(next, 'doing').cardIds).toEqual(['c2', 'c1', 'c5']);
  });

  it('returns the same reference for no-op moves', () => {
    const board = createSeedBoard();
    expect(
      boardReducer(board, { type: 'card/move', cardId: 'c1', toColumnId: 'todo', toIndex: 0 }),
    ).toBe(board);
  });

  it('never mutates the previous state', () => {
    const board = createSeedBoard();
    const snapshot = structuredClone(board);
    boardReducer(board, { type: 'card/move', cardId: 'c1', toColumnId: 'done', toIndex: 0 });
    boardReducer(board, { type: 'card/delete', cardId: 'c2' });
    expect(board).toEqual(snapshot);
  });

  it('deletes a column together with its cards', () => {
    const next = boardReducer(createSeedBoard(), { type: 'column/delete', columnId: 'doing' });
    expect(next.columns.map((c) => c.id)).toEqual(['backlog', 'todo', 'done']);
    expect(next.cards.c2).toBeUndefined();
    expect(next.cards.c5).toBeUndefined();
  });

  it('reorders columns', () => {
    const next = boardReducer(createSeedBoard(), { type: 'column/move', fromIndex: 3, toIndex: 0 });
    expect(next.columns.map((c) => c.id)).toEqual(['done', 'backlog', 'todo', 'doing']);
  });

  it('ignores blank renames', () => {
    const board = createSeedBoard();
    expect(
      boardReducer(board, { type: 'column/rename', columnId: 'todo', title: '   ' }).columns[1]!
        .title,
    ).toBe('To do');
  });
});

describe('withHistory', () => {
  const reducer = withHistory(boardReducer);
  const start = (): History<Board> => ({ past: [], present: createSeedBoard(), future: [] });

  it('undoes and redoes changes', () => {
    let h = start();
    const original = h.present;
    h = reducer(h, { type: 'card/delete', cardId: 'c1' });
    expect(h.present.cards.c1).toBeUndefined();

    h = reducer(h, { type: 'history/undo' });
    expect(h.present).toBe(original);

    h = reducer(h, { type: 'history/redo' });
    expect(h.present.cards.c1).toBeUndefined();
  });

  it('clears the redo stack on a new change', () => {
    let h = start();
    h = reducer(h, { type: 'card/delete', cardId: 'c1' });
    h = reducer(h, { type: 'history/undo' });
    h = reducer(h, { type: 'board/rename', title: 'New name' });
    expect(h.future).toHaveLength(0);
  });

  it('does not record no-op actions', () => {
    const h = start();
    expect(reducer(h, { type: 'card/delete', cardId: 'missing' })).toBe(h);
  });

  it('caps the history length', () => {
    let h = start();
    for (let i = 0; i < HISTORY_LIMIT + 20; i++)
      h = reducer(h, { type: 'board/rename', title: `Board ${i}` });
    expect(h.past).toHaveLength(HISTORY_LIMIT);
  });
});

describe('parseBoard', () => {
  it('round-trips a valid board', () => {
    const board = createSeedBoard();
    expect(parseBoard(JSON.parse(JSON.stringify(board)))).toEqual(board);
  });

  it('rejects files that are not boards', () => {
    expect(() => parseBoard({ hello: 'world' })).toThrow(/Not a Flowboard export/);
  });

  it('rejects dangling card references', () => {
    const board = createSeedBoard();
    board.columns[0]!.cardIds.push('ghost');
    expect(() => parseBoard(board)).toThrow(/missing card/);
  });

  it('rejects cards duplicated across columns', () => {
    const board = createSeedBoard();
    board.columns[1]!.cardIds.push('c3');
    expect(() => parseBoard(board)).toThrow(/more than one column/);
  });
});
