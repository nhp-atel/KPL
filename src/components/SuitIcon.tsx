import { Suit } from "@/lib/types";

const SUIT_DISPLAY: Record<Suit, { symbol: string; color: string }> = {
  spades: { symbol: "\u2660", color: "text-gray-900 dark:text-gray-100" },
  clubs: { symbol: "\u2663", color: "text-gray-900 dark:text-gray-100" },
  diamonds: { symbol: "\u2666", color: "text-red-600" },
  hearts: { symbol: "\u2665", color: "text-red-600" },
};

const SIZES = {
  sm: "text-lg",
  md: "text-3xl",
  lg: "text-5xl",
  xl: "text-7xl",
};

interface SuitIconProps {
  suit: Suit;
  size?: keyof typeof SIZES;
  showLabel?: boolean;
}

export default function SuitIcon({ suit, size = "md", showLabel = false }: SuitIconProps) {
  const { symbol, color } = SUIT_DISPLAY[suit];
  return (
    <span className={`${color} ${SIZES[size]} inline-flex items-center gap-1`}>
      {symbol}
      {showLabel && (
        <span className="text-sm font-medium capitalize">{suit}</span>
      )}
    </span>
  );
}
