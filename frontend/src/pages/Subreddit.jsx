import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronUp, ChevronDown, FileText } from 'lucide-react';
import { fetchSubmissions, getPaginationCursors } from '../utils/api';
import { formatDate, formatNumber } from '../utils/format';
import { useApi } from '../hooks/useApi';
import { Breadcrumb, EmptyState, Loading, Pagination, SectionTitle, Badge } from '../components/UI';

export default function SubredditPage() {
  const { subreddit } = useParams();
  const navigate = useNavigate();
  const [sortDesc, setSortDesc] = useState(true);
  const [cursor, setCursor] = useState({ before: null, after: null });
  const [history, setHistory] = useState([]);

  const { data: submissions, loading, error } = useApi(
    (signal) =>
      fetchSubmissions({
        subreddit,
        before: cursor.before,
        after: cursor.after,
        sort: sortDesc ? 'DESC' : 'ASC',
      }, signal),
    [subreddit, cursor.before, cursor.after, sortDesc]
  );

  const sorted = submissions || [];
  const { first, last } = getPaginationCursors(sorted);

  const goNext = useCallback(() => {
    if (!last) return;
    setHistory((h) => [...h, cursor]);
    if (sortDesc) {
      setCursor({ before: last, after: null });
    } else {
      setCursor({ before: null, after: last });
    }
  }, [last, cursor, sortDesc]);

  const goPrev = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCursor(prev);
  }, [history]);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Index', onClick: () => navigate('/') },
          { label: `r/${subreddit}` },
        ]}
      />

      <div className="flex items-center justify-between mb-5">
        <SectionTitle count={sorted.length + ' loaded'}>r/{subreddit}</SectionTitle>
        <button
          onClick={() => { setSortDesc(!sortDesc); setCursor({ before: null, after: null }); setHistory([]); }}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all"
        >
          {sortDesc ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {sortDesc ? 'Newest' : 'Oldest'}
        </button>
      </div>

      {loading && <Loading />}
      {error && <EmptyState icon={FileText} title="Failed to load" description={error.message} />}

      {!loading && !error && sorted.length === 0 && (
        <EmptyState icon={FileText} title="No submissions" description="This subreddit has no archived submissions yet" />
      )}

      {!loading && !error && sorted.length > 0 && (
        <>
          <div className="flex flex-col gap-0.5">
            {sorted.map((sub) => (
              <button
                key={sub.id}
                onClick={() => navigate(`/r/${subreddit}/comments/${sub.id}`)}
                className="grid grid-cols-[60px_1fr_auto] gap-4 items-center p-3.5 rounded-lg text-left hover:bg-bg-tertiary transition-all"
              >
                <div className="text-center text-[13px] font-semibold text-accent">
                  <ChevronUp size={12} className="mx-auto mb-0.5" />
                  {formatNumber(sub.score)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary mb-1 leading-snug line-clamp-2">
                    {sub.title}
                  </div>
                  <div className="flex gap-3 text-[11px] text-text-tertiary flex-wrap items-center">
                    <Badge variant={sub.is_self ? 'self' : 'link'}>
                      {sub.is_self ? 'self' : 'link'}
                    </Badge>
                    <span>{formatDate(sub.created_utc)}</span>
                    <span>by {sub.author}</span>
                    {sub.gilded > 0 && <span className="text-yellow-400">★ {sub.gilded}</span>}
                    <span>💬 {sub.num_comments}</span>
                  </div>
                </div>
                <div className="hidden sm:block text-text-tertiary">
                  <ChevronRight size={16} />
                </div>
              </button>
            ))}
          </div>

          <Pagination
            onPrev={goPrev}
            onNext={goNext}
            hasPrev={history.length > 0}
            hasNext={sorted.length >= 100}
          />
        </>
      )}
    </div>
  );
}
