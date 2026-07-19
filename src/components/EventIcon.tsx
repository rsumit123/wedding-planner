import { Flower2, HeartHandshake, PartyPopper, Sun, UtensilsCrossed } from 'lucide-react';

export type EventIconKind = 'tilak' | 'haldi' | 'wedding' | 'vidai' | 'reception' | 'generic';

const icons = {
  tilak: HeartHandshake,
  haldi: Sun,
  wedding: Flower2,
  vidai: UtensilsCrossed,
  reception: PartyPopper,
  generic: Flower2,
};

export function EventIcon({ kind, label, size = 23 }: { kind: EventIconKind; label: string; size?: number }) {
  const Icon = icons[kind];
  return <Icon aria-label={label} role="img" size={size} strokeWidth={1.75} />;
}
