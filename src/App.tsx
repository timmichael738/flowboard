import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { boardReducer, withHistory, type History } from './board/reducer';
import { createSeedBoard, uid } from './board/seed';
import { exportBoard, loadBoard, parseBoard, saveBoard } from './board/storage';
import type { Board, Card } from './board/types';
import { CardEditor } from './components/CardEditor';
import { CardContent } from './components/CardView';
import { ColumnView } from './components/ColumnView';
import { Dialog } from './components/Dialog';
import { useShortcuts } from './useShortcuts';

const historyReducer = withHistory(boardReducer);
const init = (): History<Board> => ({
  past: [],
  present: loadBoard() ?? createSeedBoard(),
  future: [],
});

export function matchesFilter(card: Card, query: string, labelId: string | null): boolean {
  if (labelId && !card.labelIds.includes(labelId)) return false;
  const q = query.trim().toLowerCase();
  return !q || card.title.toLowerCase().includes(q) || card.description.toLowerCase().includes(q);
}

export default function App() {
  const [history, dispatch] = useReducer(historyReducer, undefined, init);
  const board = history.present;
  const [query, setQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerColumn, setComposerColumn] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => saveBoard(board), 250);
    return () => clearTimeout(timer);
  }, [board]);

  useEffect(() => {
    document.title = `${board.title} · Flowboard`;
  }, [board.title]);

  const filtering = query.trim() !== '' || labelFilter !== null;

  const visibleCards = useMemo(() => {
    const result: Record<string, Card[]> = {};
    for (const column of board.columns) {
      result[column.id] = column.cardIds
        .map((id) => board.cards[id]!)
        .filter((card) => matchesFilter(card, query, labelFilter));
    }
    return result;
  }, [board, query, labelFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const undo = () => dispatch({ type: 'history/undo' });
  const redo = () => dispatch({ type: 'history/redo' });

  useShortcuts({
    n: () => board.columns[0] && setComposerColumn(board.columns[0].id),
    '/': () => searchRef.current?.focus(),
    '?': () => setShowHelp(true),
    'mod+z': undo,
    'mod+shift+z': redo,
    'mod+y': redo,
  });

  const onDragStart = ({ active }: DragStartEvent) => {
    if (active.data.current?.type === 'card') setActiveCardId(String(active.id));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveCardId(null);
    if (!over || active.id === over.id) return;
    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'column') {
      const ids = board.columns.map((c) => `column:${c.id}`);
      const toId = overData?.type === 'card' ? `column:${overData.columnId}` : String(over.id);
      dispatch({
        type: 'column/move',
        fromIndex: ids.indexOf(String(active.id)),
        toIndex: ids.indexOf(toId),
      });
      return;
    }

    if (activeData?.type === 'card') {
      const toColumnId = overData?.columnId as string;
      const target = board.columns.find((c) => c.id === toColumnId);
      if (!target) return;
      // Dropping on a card takes its slot; dropping on a column appends to it.
      const toIndex =
        overData?.type === 'card' ? target.cardIds.indexOf(String(over.id)) : target.cardIds.length;
      dispatch({ type: 'card/move', cardId: String(active.id), toColumnId, toIndex });
    }
  };

  const importFile = async (file: File) => {
    try {
      const imported = parseBoard(JSON.parse(await file.text()));
      dispatch({ type: 'board/replace', board: imported });
      setNotice(`Imported "${imported.title}". Press Ctrl+Z to undo.`);
    } catch (error) {
      setNotice(`Import failed: ${(error as Error).message}`);
    }
  };

  const editingCard = editingId ? board.cards[editingId] : undefined;
  const activeCard = activeCardId ? board.cards[activeCardId] : undefined;

  return (
    <div className="app">
      <header className="toolbar">
        <input
          className="board-title"
          key={board.title}
          defaultValue={board.title}
          aria-label="Board title"
          onBlur={(e) => dispatch({ type: 'board/rename', title: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <div className="toolbar-group">
          <input
            ref={searchRef}
            type="search"
            className="search"
            placeholder="Search cards  ( / )"
            aria-label="Search cards"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), e.currentTarget.blur())}
          />
          <button
            type="button"
            onClick={undo}
            disabled={history.past.length === 0}
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={history.future.length === 0}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷ Redo
          </button>
          <button type="button" onClick={() => exportBoard(board)}>
            Export
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
              e.target.value = '';
            }}
          />
          <button type="button" onClick={() => setShowHelp(true)} aria-label="Keyboard shortcuts">
            ?
          </button>
        </div>
      </header>

      <nav className="filters" aria-label="Filter by label">
        <button
          type="button"
          aria-pressed={labelFilter === null}
          onClick={() => setLabelFilter(null)}
        >
          All
        </button>
        {board.labels.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={labelFilter === l.id}
            onClick={() => setLabelFilter(labelFilter === l.id ? null : l.id)}
          >
            <span className={`swatch swatch-${l.color}`} aria-hidden="true" />
            {l.name}
          </button>
        ))}
        {filtering && (
          <span className="muted filter-note">Drag and drop is paused while filtering</span>
        )}
      </nav>

      {notice && (
        <p className="notice" role="status">
          {notice}
          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss"
            onClick={() => setNotice('')}
          >
            ×
          </button>
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <main className="board">
          <SortableContext
            items={board.columns.map((c) => `column:${c.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {board.columns.map((column) => (
              <ColumnView
                key={column.id}
                column={column}
                cards={visibleCards[column.id] ?? []}
                labels={board.labels}
                dragDisabled={filtering}
                composerOpen={composerColumn === column.id}
                onComposerChange={(open) => setComposerColumn(open ? column.id : null)}
                onAddCard={(columnId, title) =>
                  dispatch({
                    type: 'card/add',
                    columnId,
                    card: {
                      id: uid(),
                      title,
                      description: '',
                      labelIds: [],
                      due: null,
                      createdAt: new Date().toISOString(),
                    },
                  })
                }
                onRename={(columnId, title) => dispatch({ type: 'column/rename', columnId, title })}
                onDelete={(columnId) => dispatch({ type: 'column/delete', columnId })}
                onOpenCard={setEditingId}
              />
            ))}
          </SortableContext>
          <button
            type="button"
            className="add-column"
            onClick={() => {
              const title = prompt('Column name');
              if (title?.trim()) dispatch({ type: 'column/add', id: uid(), title });
            }}
          >
            + Add column
          </button>
        </main>
        <DragOverlay>
          {activeCard && (
            <div className="card overlay">
              <CardContent card={activeCard} labels={board.labels} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {editingCard && (
        <CardEditor
          card={editingCard}
          labels={board.labels}
          columnTitle={board.columns.find((c) => c.cardIds.includes(editingCard.id))?.title ?? ''}
          onSave={(patch) => dispatch({ type: 'card/update', cardId: editingCard.id, patch })}
          onDelete={() => dispatch({ type: 'card/delete', cardId: editingCard.id })}
          onClose={() => setEditingId(null)}
        />
      )}

      {showHelp && (
        <Dialog title="Keyboard shortcuts" onClose={() => setShowHelp(false)}>
          <dl className="shortcuts">
            {[
              ['N', 'New card in the first column'],
              ['/', 'Search'],
              ['Ctrl/⌘ + Z', 'Undo'],
              ['Ctrl/⌘ + Shift + Z', 'Redo'],
              ['Tab, then Space', 'Pick up a card or column; arrow keys move it, Space drops it'],
              ['Enter', 'Open the focused card'],
              ['?', 'Show this help'],
            ].map(([key, action]) => (
              <div key={key}>
                <dt>
                  <kbd>{key}</kbd>
                </dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </Dialog>
      )}
    </div>
  );
}
