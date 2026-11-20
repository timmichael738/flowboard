import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

const columnNamed = (name: RegExp) => screen.getByRole('region', { name });

describe('<App />', () => {
  beforeEach(() => localStorage.clear());

  it('renders the seed board', () => {
    render(<App />);
    expect(screen.getByLabelText('Board title')).toHaveValue('Product launch');
    expect(
      within(columnNamed(/^To do column/)).getByText('Write launch announcement'),
    ).toBeInTheDocument();
  });

  it('adds a card and undoes it with the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    const backlog = columnNamed(/^Backlog column/);

    await user.click(within(backlog).getByRole('button', { name: '+ Add card' }));
    await user.type(within(backlog).getByLabelText('New card in Backlog'), 'Ship v2{Enter}');
    expect(within(backlog).getByText('Ship v2')).toBeInTheDocument();

    await user.click(document.body);
    await user.keyboard('{Escape}{Control>}z{/Control}');
    expect(within(backlog).queryByText('Ship v2')).not.toBeInTheDocument();

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(within(backlog).getByText('Ship v2')).toBeInTheDocument();
  });

  it('filters cards by search text', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Search cards'), 'rate limiting');
    expect(screen.getByText('Add rate limiting to public API')).toBeInTheDocument();
    expect(screen.queryByText('Dark mode polish')).not.toBeInTheDocument();
    expect(screen.getByText(/Drag and drop is paused/)).toBeInTheDocument();
  });

  it('filters cards by label', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Infra' }));
    expect(screen.getByText('Set up error monitoring')).toBeInTheDocument();
    expect(screen.queryByText('Write launch announcement')).not.toBeInTheDocument();
  });

  it('persists the board to localStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    const title = screen.getByLabelText('Board title');
    await user.clear(title);
    await user.type(title, 'Roadmap{Enter}');
    await new Promise((r) => setTimeout(r, 300));
    unmount();

    render(<App />);
    expect(screen.getByLabelText('Board title')).toHaveValue('Roadmap');
  });
});
