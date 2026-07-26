export function ScoreGauge({
  value,
  size = 96,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const strokeWidth = size * 0.09;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="fill-none stroke-[var(--sb-primary)] transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-[var(--sb-text)]" style={{ fontSize: size * 0.24 }}>
          {clamped}
        </span>
        {label && <span className="text-[10px] text-[var(--sb-text-faint)]">{label}</span>}
      </div>
    </div>
  );
}
