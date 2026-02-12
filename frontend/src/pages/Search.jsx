import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Filter, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { search as searchApi, fetchSubreddits } from '../utils/api';
import { formatDate, formatNumber, toUnixTimestamp } from '../utils/format';
import { useApi } from '../hooks/useApi';
import { EmptyState, Loading, Badge } from '../components/UI';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('submission');
  const [subreddit, setSubreddit] = useState('');
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: subreddits } = useApi((s) => fetchSubreddits(s), []);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) { setErrorMsg('Enter a search term'); return; }
    if (!subreddit) { setErrorMsg('Select a subreddit'); return; }
    setErrorMsg('');
    setSearching(true);

    try {
      const data = await searchApi({
        type: searchType,
        subreddit,
        query: q,
        before: toUnixTimestamp(before)?.toString(),
        after: toUnixTimestamp(after)?.toString(),
      });
      setResults(data);
    } catch (err) {
      setErrorMsg(err.message || 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, searchType, subreddit, before, after]);

  const handlePaginate = useCallback(async (direction) => {
    if (!results || results.length === 0) return;
    const ts = direction === 'next'
      ? results[results.length - 1].created_utc
      : results[0].created_utc;

    setSearching(true);
    try {
      const data = await searchApi({
        type: searchType,
        subreddit,
        query: query.trim(),
        before: direction === 'next' ? ts.toString() : undefined,
        after: direction === 'prev' ? ts.toString() : undefined,
        sort: direction === 'prev' ? 'asc' : 'desc',
      });
      if (direction === 'prev') data.reverse();
      setResults(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSearching(false);
    }
  }, [results, searchType, subreddit, query]);

  return (
    <div>
      <div className="font-serif text-[28px] font-semibold text-text-primary text-center mb-2">
        Search the Archive
      </div>
      <p className="text-center text-[13px] text-text-tertiary mb-6">
        Full-text search across all archived submissions and comments
      </p>

      {/* Search bar */}
      <div className="max-w-[680px] mx-auto mb-8">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            className="w-full py-3.5 px-12 bg-bg-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent search-glow transition-all"
            placeholder="Search submissions, comments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Controls row */}
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <div className="flex gap-1">
            {['submission', 'comment'].map((t) => (
              <button
                key={t}
                onClick={() => setSearchType(t)}
                className={`px-3.5 py-1.5 rounded-md text-[11px] font-semibold border transition-all ${
                  searchType === t
                    ? 'bg-accent-muted text-accent border-accent'
                    : 'bg-bg-tertiary text-text-secondary border-border hover:border-text-tertiary'
                }`}
              >
                {t === 'submission' ? 'Submissions' : 'Comments'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium text-text-secondary bg-bg-tertiary border border-border hover:border-text-tertiary transition-all"
          >
            <Filter size={12} /> Filters {showFilters ? '▲' : '▼'}
          </button>

          <button
            onClick={handleSearch}
            className="ml-auto px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider bg-accent text-white shadow-[0_2px_8px_rgba(255,69,0,0.3)] hover:bg-accent-hover hover:shadow-[0_4px_16px_rgba(255,69,0,0.4)] hover:-translate-y-px transition-all"
          >
            Search
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-3 p-5 bg-bg-secondary border border-border-subtle rounded-xl animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Subreddit</label>
                <select
                  className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                >
                  <option value="">Select subreddit...</option>
                  {subreddits?.map((s) => (
                    <option key={s.name} value={s.name}>r/{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Author</label>
                <input className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors" placeholder="Filter by author..." />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">After Date</label>
                <input type="date" className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors" value={after} onChange={(e) => setAfter(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Before Date</label>
                <input type="date" className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors" value={before} onChange={(e) => setBefore(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {!showFilters && (
          <div className="mt-2">
            <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Subreddit (required)</label>
            <select
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-secondary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
            >
              <option value="">Select subreddit...</option>
              {subreddits?.map((s) => (
                <option key={s.name} value={s.name}>r/{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Results */}
      {searching && <Loading />}

      {results && !searching && (
        <div className="max-w-[800px] mx-auto">
          <div className="text-xs text-text-tertiary mb-4">
            {results.length} results for "<span className="text-accent">{query}</span>" in r/{subreddit}
          </div>

          {results.length === 0 ? (
            <EmptyState icon={SearchIcon} title="No results" description="Try different search terms or filters" />
          ) : (
            <>
              <div className="flex flex-col gap-0.5">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (searchType === 'submission') {
                        navigate(`/r/${subreddit}/comments/${r.id}`);
                      } else {
                        navigate(`/r/${subreddit}/comments/${r.link_id}`);
                      }
                    }}
                    className="grid grid-cols-[50px_1fr] gap-4 items-center p-3.5 rounded-lg text-left hover:bg-bg-tertiary transition-all"
                  >
                    <div className="text-center text-[13px] font-semibold text-accent">
                      <ChevronUp size={12} className="mx-auto mb-0.5" />
                      {formatNumber(r.score)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary mb-1 leading-snug line-clamp-2">
                        {searchType === 'submission' ? r.title : r.body}
                      </div>
                      <div className="flex gap-3 text-[11px] text-text-tertiary flex-wrap">
                        <span>{formatDate(r.created_utc)}</span>
                        {r.num_comments != null && <span>💬 {r.num_comments}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 mt-6 py-4">
                <button
                  onClick={() => handlePaginate('prev')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover transition-all"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  onClick={() => handlePaginate('next')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover transition-all"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!results && !searching && (
        <EmptyState icon={SearchIcon} title="Start searching" description="Enter a search term and select a subreddit to find archived content" />
      )}
    </div>
  );
}
