import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchSubreddits, fetchStats } from '../utils/api';
import { formatNumber } from '../utils/format';
import { useApi } from '../hooks/useApi';
import { EmptyState, SectionTitle, Loading } from '../components/UI';

export default function IndexPage({ filterQuery }) {
  const navigate = useNavigate();
  const { data: subreddits, loading, error } = useApi((s) => fetchSubreddits(s), []);
  const { data: stats } = useApi((s) => fetchStats(s), []);

  const filtered = useMemo(() => {
    if (!subreddits) return [];
    if (!filterQuery) return subreddits;
    const q = filterQuery.toLowerCase();
    return subreddits.filter((s) => s.name.toLowerCase().includes(q));
  }, [subreddits, filterQuery]);

  if (loading) return <Loading />;
  if (error) return <EmptyState icon={Search} title="Failed to load" description={error.message} />;

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { value: stats?.subreddits, label: 'Subreddits' },
          { value: stats?.submissions, label: 'Submissions' },
          { value: stats?.comments, label: 'Comments' },
          { value: stats?.total_records, label: 'Total Records' },
        ].map(({ value, label }) => (
          <div key={label} className="p-4 bg-bg-secondary border border-border-subtle rounded-xl">
            <div className="text-2xl font-bold text-text-primary tracking-tight mb-0.5">
              {value != null ? formatNumber(value) : '—'}
            </div>
            <div className="text-[11px] text-text-tertiary uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      <SectionTitle count={filtered.length}>Archived Subreddits</SectionTitle>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No subreddits found" description="Try a different search term" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((sub) => (
            <button
              key={sub.name}
              onClick={() => navigate(`/r/${sub.name}`)}
              className="bg-bg-secondary border border-border-subtle rounded-xl p-4 flex items-center gap-3.5 text-left hover:bg-bg-tertiary hover:border-border hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-all"
            >
              <div className="w-[42px] h-[42px] rounded-[10px] bg-accent-muted flex items-center justify-center text-base font-bold text-accent flex-shrink-0 tracking-tight">
                {sub.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text-primary">r/{sub.name}</div>
                <div className="flex gap-3 text-[11px] text-text-tertiary">
                  <span>{formatNumber(sub.num_submissions)} posts</span>
                  <span>{formatNumber(sub.num_comments)} comments</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
