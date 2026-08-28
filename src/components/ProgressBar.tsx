export function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-3.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${v}%`,
          background: "linear-gradient(90deg, oklch(0.55 0.16 142), oklch(0.82 0.16 85))",
        }}
      />
    </div>
  );
}
