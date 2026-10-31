export function RengeraMark({
  size = 34,
  className = '',
  label = '',
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <img
      src="/rengera-logo.jpg"
      alt={label}
      width={size}
      height={size}
      className={`shrink-0 rounded-[2px] object-cover ${className}`}
      style={{ width: size, height: size }}
      decoding="async"
    />
  );
}
