export type LabelColor = 'blue' | 'orange' | 'aqua' | 'violet' | 'magenta' | 'green';

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  labelIds: string[];
  /** ISO date (YYYY-MM-DD) or null. */
  due: string | null;
  createdAt: string;
}

export interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

export interface Board {
  version: 1;
  title: string;
  columns: Column[];
  cards: Record<string, Card>;
  labels: Label[];
}

export type BoardAction =
  | { type: 'board/rename'; title: string }
  | { type: 'board/replace'; board: Board }
  | { type: 'column/add'; id: string; title: string }
  | { type: 'column/rename'; columnId: string; title: string }
  | { type: 'column/delete'; columnId: string }
  | { type: 'column/move'; fromIndex: number; toIndex: number }
  | { type: 'card/add'; columnId: string; card: Card }
  | { type: 'card/update'; cardId: string; patch: Partial<Omit<Card, 'id' | 'createdAt'>> }
  | { type: 'card/delete'; cardId: string }
  | { type: 'card/move'; cardId: string; toColumnId: string; toIndex: number };
