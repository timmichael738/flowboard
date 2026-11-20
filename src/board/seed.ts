import type { Board, Card } from './types';

export const uid = () => crypto.randomUUID().slice(0, 8);

const today = new Date();
const inDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function card(
  id: string,
  title: string,
  labelIds: string[],
  due: string | null = null,
  description = '',
): Card {
  return { id, title, description, labelIds, due, createdAt: today.toISOString() };
}

/** A realistic starter board so first-time visitors see every feature in action. */
export function createSeedBoard(): Board {
  const cards = [
    card(
      'c1',
      'Write launch announcement',
      ['marketing'],
      inDays(3),
      'Blog post + social thread. Include the demo GIF.',
    ),
    card('c2', 'Fix flaky checkout test', ['bug', 'backend'], inDays(-1)),
    card('c3', 'Design onboarding empty states', ['design'], inDays(7)),
    card(
      'c4',
      'Add rate limiting to public API',
      ['backend'],
      null,
      'Token bucket, 100 req/min per key.',
    ),
    card('c5', 'Dark mode polish', ['design', 'frontend']),
    card('c6', 'Migrate CI to GitHub Actions', ['infra']),
    card('c7', 'Set up error monitoring', ['infra'], inDays(1)),
    card('c8', 'Keyboard shortcuts for board', ['frontend']),
  ];
  return {
    version: 1,
    title: 'Product launch',
    labels: [
      { id: 'bug', name: 'Bug', color: 'orange' },
      { id: 'frontend', name: 'Frontend', color: 'blue' },
      { id: 'backend', name: 'Backend', color: 'violet' },
      { id: 'design', name: 'Design', color: 'magenta' },
      { id: 'infra', name: 'Infra', color: 'aqua' },
      { id: 'marketing', name: 'Marketing', color: 'green' },
    ],
    cards: Object.fromEntries(cards.map((c) => [c.id, c])),
    columns: [
      { id: 'backlog', title: 'Backlog', cardIds: ['c3', 'c4'] },
      { id: 'todo', title: 'To do', cardIds: ['c1', 'c7'] },
      { id: 'doing', title: 'In progress', cardIds: ['c2', 'c5'] },
      { id: 'done', title: 'Done', cardIds: ['c6', 'c8'] },
    ],
  };
}
