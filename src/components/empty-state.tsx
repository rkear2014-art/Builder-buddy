export function EmptyState({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? "empty-state empty-state-compact" : "empty-state card"}>
      <svg viewBox="0 0 64 64" className="empty-mark" aria-hidden="true">
        <rect x="10" y="16" width="44" height="34" rx="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M10 28h44M22 16v-5M42 16v-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="40" r="5" fill="currentColor" />
      </svg>
      <p>{children}</p>
    </div>
  );
}
