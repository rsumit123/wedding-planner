import { render, screen } from '@testing-library/react';
import { EventIcon } from '../src/components/EventIcon';

it('labels the haldi icon for assistive technology', () => {
  render(<EventIcon kind="haldi" label="Haldi and Matkor" />);
  expect(screen.getByLabelText('Haldi and Matkor')).toBeVisible();
});

it('uses a distinct icon for each ceremony', () => {
  const { container, rerender } = render(<EventIcon kind="tilak" label="Lagan and Tilak" />);
  const tilak = container.innerHTML;
  rerender(<EventIcon kind="reception" label="Reception party" />);
  expect(container.innerHTML).not.toEqual(tilak);
});
