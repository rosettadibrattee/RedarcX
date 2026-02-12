import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Upload, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Browse', end: true },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/upload', icon: Upload, label: 'Upload' },
  { to: '/admin', icon: Settings, label: 'Admin' },
];

export default function Header({ filterValue, onFilterChange, showFilter }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-bg-primary/85 backdrop-blur-xl border-b border-border-subtle">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-text-primary hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center text-sm font-bold text-white shadow-[0_0_20px_rgba(255,69,0,0.3)]">
            RA
          </div>
          <span>
            Red<span className="text-accent">Arc</span>
          </span>
        </button>

        {/* Center filter (shown on index) */}
        {showFilter && (
          <div className="flex-1 max-w-sm hidden sm:block">
            <input
              className="w-full py-2 px-3.5 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
              placeholder="Filter subreddits..."
              value={filterValue || ''}
              onChange={(e) => onFilterChange?.(e.target.value)}
            />
          </div>
        )}
        {!showFilter && <div className="flex-1" />}

        {/* Navigation */}
        <nav className="flex gap-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium uppercase tracking-wider transition-all ${
                  isActive
                    ? 'text-accent bg-accent-muted'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`
              }
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
