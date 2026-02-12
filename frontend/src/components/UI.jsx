import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ---- Breadcrumb ---- */
export function Breadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1 text-xs text-text-tertiary mb-5 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-40 mx-1">/</span>}
          {item.to ? (
            <a href={item.to} className="hover:text-accent transition-colors">
              {item.label}
            </a>
          ) : item.onClick ? (
            <button onClick={item.onClick} className="hover:text-accent transition-colors">
              {item.label}
            </button>
          ) : (
            <span className="text-text-secondary">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ---- EmptyState ---- */
export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="text-center py-16 text-text-tertiary">
      <div className="w-14 h-14 mx-auto mb-4 bg-bg-tertiary rounded-[14px] flex items-center justify-center">
        <Icon size={24} />
      </div>
      <h3 className="text-base text-text-secondary mb-1.5">{title}</h3>
      <p className="text-[13px] max-w-[380px] mx-auto">{description}</p>
    </div>
  );
}

/* ---- Loading spinner ---- */
export function Loading() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
    </div>
  );
}

/* ---- Loading skeleton ---- */
export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-bg-tertiary rounded animate-pulse-subtle ${className}`} />
  );
}

/* ---- Pagination ---- */
export function Pagination({ onPrev, onNext, hasPrev = true, hasNext = true }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-6 py-4">
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft size={14} /> Prev
      </button>
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Next <ChevronRight size={14} />
      </button>
    </div>
  );
}

/* ---- Toast ---- */
export function Toast({ type, message, onClose }) {
  if (!message) return null;
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };
  return (
    <div className={`fixed bottom-6 right-6 z-[1000] px-5 py-3 rounded-lg text-[13px] font-medium text-white shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-slide-in ${colors[type] || colors.info}`}>
      {message}
    </div>
  );
}

/* ---- SectionTitle ---- */
export function SectionTitle({ children, count }) {
  return (
    <div className="font-serif text-[22px] font-semibold text-text-primary mb-5 flex items-center gap-2.5">
      {children}
      {count != null && (
        <span className="font-mono text-xs font-normal text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded-xl">
          {count}
        </span>
      )}
    </div>
  );
}

/* ---- Badge ---- */
export function Badge({ variant = 'default', children }) {
  const styles = {
    self: 'text-blue-400 bg-blue-500/10',
    link: 'text-green-400 bg-green-500/10',
    error: 'text-red-400 bg-red-500/10',
    success: 'text-green-400 bg-green-500/10',
    default: 'text-text-tertiary bg-bg-tertiary',
  };
  return (
    <span className={`text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded uppercase ${styles[variant] || styles.default}`}>
      {children}
    </span>
  );
}
