import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, Label } from '../board/types';

interface Props {
  card: Card;
  labels: Label[];
  columnId: string;
  dragDisabled: boolean;
  onOpen: (cardId: string) => void;
}

export function dueStatus(
  due: string | null,
  today = new Date(),
): 'overdue' | 'soon' | 'later' | null {
  if (!due) return null;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dueTime = new Date(`${due}T00:00:00`).getTime();
  const days = Math.round((dueTime - startOfToday) / 86_400_000);
  if (days < 0) return 'overdue';
  if (days <= 2) return 'soon';
  return 'later';
}

const formatDue = (due: string) =>
  new Date(`${due}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function CardContent({ card, labels }: Pick<Props, 'card' | 'labels'>) {
  const status = dueStatus(card.due);
  const cardLabels = labels.filter((l) => card.labelIds.includes(l.id));
  return (
    <>
      {cardLabels.length > 0 && (
        <ul className="card-labels" aria-label="Labels">
          {cardLabels.map((l) => (
            <li key={l.id} className="label-chip">
              <span className={`swatch swatch-${l.color}`} aria-hidden="true" />
              {l.name}
            </li>
          ))}
        </ul>
      )}
      <p className="card-title">{card.title}</p>
      <div className="card-meta">
        {card.due && (
          <span className={`due due-${status}`}>
            <span aria-hidden="true">{status === 'overdue' ? '⚠' : '◷'}</span>{' '}
            {status === 'overdue' ? 'Overdue · ' : ''}
            {formatDue(card.due)}
          </span>
        )}
        {card.description && (
          <span className="has-description" title="Has description" aria-label="Has description">
            ≡
          </span>
        )}
      </div>
    </>
  );
}

export function CardView({ card, labels, columnId, dragDisabled, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId },
    disabled: dragDisabled,
  });

  return (
    <li
      ref={setNodeRef}
      className={`card ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable card"
      onClick={() => onOpen(card.id)}
      onKeyDown={(event) => {
        // Space is reserved by dnd-kit for picking up the card; Enter opens it.
        if (event.key === 'Enter') onOpen(card.id);
        listeners?.onKeyDown?.(event);
      }}
    >
      <CardContent card={card} labels={labels} />
    </li>
  );
}
