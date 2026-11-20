import { useEffect, useRef } from 'react';

type Handlers = Record<string, () => void>;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** Normalises an event to "mod+shift+z" style, where mod is Ctrl on Windows/Linux and ⌘ on macOS. */
export function shortcutKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('mod');
  if (event.shiftKey && event.key.length === 1 && /[a-z]/i.test(event.key)) parts.push('shift');
  parts.push(event.key.toLowerCase());
  return parts.join('+');
}

/** Global shortcuts that stay out of the way while the user types in a field or a dialog is open. */
export function useShortcuts(handlers: Handlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || document.querySelector('dialog[open]')) return;
      const handler = ref.current[shortcutKey(event)];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
