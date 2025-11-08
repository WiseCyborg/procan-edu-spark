interface ProgressBarProps {
  progress: number; // 0-100
}

export const ProgressBar = ({ progress }: ProgressBarProps) => {
  return (
    <div className="h-1 bg-muted">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
};
