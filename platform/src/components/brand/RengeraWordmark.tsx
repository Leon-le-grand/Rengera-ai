import { RengeraMark } from './RengeraMark';

export function RengeraWordmark({
  size = 34,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      <RengeraMark size={size} />
      <span className="font-brand truncate text-xl leading-none tracking-[0.08em] text-[var(--app-text)]">
        RENGERA
      </span>
    </span>
  );
}
