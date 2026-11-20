import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, type FormEvent } from 'react';
import type { Card, Column, Label } from '../board/types';
import { CardView } from './CardView';

interface Props {
  column: Column;
  cards: Card[];
  labels: Label[];
  dragDisabled: boolean;
  composerOpen: boolean;
  onComposerChange: (open: boolean) => void;
  onAddCard: (columnId: string, title: string) => void;
  onRename: (columnId: string, title: string) => void;
  onDelete: (columnId: string) => void;
  onOpenCard: (cardId: string) => void;
}

export function ColumnView(props: Props) {
  const { column, cards, labels, dragDisabled, composerOpen, onComposerChange } = props;
  const [draft, setDraft] = useState('');
  const [renaming, setRenaming] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({
      id: `column:${column.id}`,
      data: { type: 'column', columnId: column.id },
      disabled: dragDisabled,
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    props.onAddCard(column.id, draft.trim());
    setDraft('');
  };

  return (
    <section
      ref={setNodeRef}
      className={`column ${isDragging ? 'is-dragging' : ''} ${isOver ? 'is-over' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-label={`${column.title} column, ${cards.length} cards`}
    >
      <header className="column-header">
        {renaming ? (
          <input
            className="column-title-input"
            defaultValue={column.title}
            aria-label="Column title"
            autoFocus
            onBlur={(e) => {
              props.onRename(column.id, e.target.value);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <h2
            className="column-title"
            {...attributes}
            {...listeners}
            aria-roledescription="draggable column"
            onDoubleClick={() => setRenaming(true)}
            title="Drag to reorder · double-click to rename"
          >
            {column.title}
          </h2>
        )}
        <span className="count" aria-hidden="true">
          {cards.length}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label={`Delete column ${column.title}`}
          onClick={() => {
            if (
              cards.length === 0 ||
              confirm(`Delete "${column.title}" and its ${cards.length} cards?`)
            ) {
              props.onDelete(column.id);
            }
          }}
        >
          ×
        </button>
      </header>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul className="card-list">
          {cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              labels={labels}
              columnId={column.id}
              dragDisabled={dragDisabled}
              onOpen={props.onOpenCard}
            />
          ))}
          {cards.length === 0 && <li className="empty-column">Drop cards here</li>}
        </ul>
      </SortableContext>

      {composerOpen ? (
        <form className="composer" onSubmit={submit}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Card title…"
            aria-label={`New card in ${column.title}`}
            autoFocus
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit(e);
              if (e.key === 'Escape') onComposerChange(false);
            }}
          />
          <div className="composer-actions">
            <button type="submit" className="primary">
              Add card
            </button>
            <button type="button" onClick={() => onComposerChange(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="add-card" onClick={() => onComposerChange(true)}>
          + Add card
        </button>
      )}
    </section>
  );
}
