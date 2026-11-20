import { useState } from 'react';
import type { Card, Label } from '../board/types';
import { Dialog } from './Dialog';

interface Props {
  card: Card;
  labels: Label[];
  columnTitle: string;
  onSave: (patch: Partial<Omit<Card, 'id' | 'createdAt'>>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function CardEditor({ card, labels, columnTitle, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [labelIds, setLabelIds] = useState(card.labelIds);
  const [due, setDue] = useState(card.due ?? '');

  const save = () => {
    onSave({ title: title.trim() || card.title, description, labelIds, due: due || null });
    onClose();
  };

  return (
    <Dialog title="Edit card" onClose={onClose}>
      <form
        className="editor"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <p className="muted">in {columnTitle}</p>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
        </label>
        <fieldset>
          <legend>Labels</legend>
          <div className="label-options">
            {labels.map((l) => (
              <label key={l.id} className="label-option">
                <input
                  type="checkbox"
                  checked={labelIds.includes(l.id)}
                  onChange={(e) =>
                    setLabelIds((ids) =>
                      e.target.checked ? [...ids, l.id] : ids.filter((id) => id !== l.id),
                    )
                  }
                />
                <span className={`swatch swatch-${l.color}`} aria-hidden="true" />
                {l.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Due date
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <div className="editor-actions">
          <button
            type="button"
            className="danger"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            Delete card
          </button>
          <span className="spacer" />
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}
