import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Filter, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { search as searchApi, fetchSubreddits } from '../utils/api';
import { formatDate, formatNumber, toUnixTimestamp } from '../utils/format';
import { useApi } from '../hooks/useApi';
import { EmptyState, Loading } from '../components/UI';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('submission');
  const [subreddit, setSubreddit] = useState('');
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [author, setAuthor] = useState('');
  const [keywords, setKeywords] = useState('');
  const [scoreMin, setScoreMin] = useState('');
  const [scoreMax, setScoreMax] = useState('');
  const [commentsMin, setCommentsMin] = useState('');
  const [commentsMax, setCommentsMax] = useState('');
  const [domain, setDomain] = useState('');
  const [isSelf, setIsSelf] = useState('any');
  const [matchMode, setMatchMode] = useState('partial');
  const [sortBy, setSortBy] = useState('new');
  const [pageSize, setPageSize] = useState('20');
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: subreddits } = useApi((s) => fetchSubreddits(s), []);

  useEffect(() => {
    if (searchType === 'comment' && (sortBy === 'num_comments_desc' || sortBy === 'num_comments_asc')) {
      setSortBy('new');
    }
  }, [searchType, sortBy]);

  const runSearch = useCallback(async (nextOffset = 0, sortOverride = null, pageSizeOverride = null) => {
    const q = query.trim();
    if (!q) { setErrorMsg('Enter a search term'); return; }
    setErrorMsg('');
    setSearching(true);

    try {
      const data = await searchApi({
        type: searchType,
        subreddit: subreddit || undefined,
        query: q,
        before: toUnixTimestamp(before)?.toString(),
        after: toUnixTimestamp(after)?.toString(),
        author: author.trim() || undefined,
        keywords: keywords.trim() || undefined,
        score_min: scoreMin || undefined,
        score_max: scoreMax || undefined,
        num_comments_min: commentsMin || undefined,
        num_comments_max: commentsMax || undefined,
        domain: domain.trim() || undefined,
        is_self: isSelf === 'any' ? undefined : (isSelf === 'yes' ? 'true' : 'false'),
        sort_by: sortOverride || sortBy,
        match: matchMode,
        limit: pageSizeOverride || pageSize || undefined,
        offset: nextOffset.toString(),
      });
      setOffset(nextOffset);
      setResults(data);
    } catch (err) {
      setErrorMsg(err.message || 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, searchType, subreddit, before, after, author, keywords, scoreMin, scoreMax, commentsMin, commentsMax, domain, isSelf, sortBy, matchMode, pageSize]);

  const handleSearch = useCallback(async () => {
    await runSearch(0);
  }, [runSearch]);

  const handleSortChange = useCallback(async (value) => {
    setSortBy(value);
    if (query.trim()) {
      await runSearch(0, value);
    }
  }, [query, runSearch]);

  const handlePageSizeChange = useCallback(async (value) => {
    setPageSize(value);
    if (query.trim()) {
      await runSearch(0, null, value);
    }
  }, [query, runSearch]);

  const handlePaginate = useCallback(async (direction) => {
    const step = Number(pageSize) || 20;
    const nextOffset = direction === 'next'
      ? offset + step
      : Math.max(0, offset - step);
    await runSearch(nextOffset);
  }, [offset, pageSize, runSearch]);

  const pageSizeNum = Number(pageSize) || 20;
  const hasPrev = offset > 0;
  const hasNext = Array.isArray(results) && results.length === pageSizeNum;

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
                  <option value="">All subreddits</option>
                  {subreddits?.map((s) => (
                    <option key={s.name} value={s.name}>r/{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Author</label>
                <input
                  className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
                  placeholder="Filter by author..."
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Keywords</label>
                <input
                  className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
                  placeholder="Extra required terms..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">After Date</label>
                <input type="date" className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors" value={after} onChange={(e) => setAfter(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Before Date</label>
                <input type="date" className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors" value={before} onChange={(e) => setBefore(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Score Min</label>
                <input
                  type="number"
                  className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
                  placeholder="e.g. 10"
                  value={scoreMin}
                  onChange={(e) => setScoreMin(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Score Max</label>
                <input
                  type="number"
                  className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
                  placeholder="e.g. 500"
                  value={scoreMax}
                  onChange={(e) => setScoreMax(e.target.value)}
                />
              </div>
              {searchType === 'submission' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Comments Min</label>
                    <input
                      type="number"
                      className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
                      placeholder="e.g. 20"
                      value={commentsMin}
                      onChange={(e) => setCommentsMin(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Comments Max</label>
                    <input
                      type="number"
                      className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
                      placeholder="e.g. 200"
                      value={commentsMax}
                      onChange={(e) => setCommentsMax(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Domain Contains</label>
                    <input
                      className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
                      placeholder="e.g. github.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Self Posts</label>
                    <select
                      className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
                      value={isSelf}
                      onChange={(e) => setIsSelf(e.target.value)}
                    >
                      <option value="any">Any</option>
                      <option value="yes">Only self posts</option>
                      <option value="no">Exclude self posts</option>
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Match Mode</label>
                <select
                  className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
                  value={matchMode}
                  onChange={(e) => setMatchMode(e.target.value)}
                >
                  <option value="partial">Partial words (prefix)</option>
                  <option value="phrase">Exact phrase</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {!showFilters && (
          <div className="mt-2">
            <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Subreddit (optional)</label>
            <select
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-secondary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
            >
              <option value="">All subreddits</option>
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
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Sort Results</span>
            <select
              className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-bg-tertiary border border-border text-text-secondary outline-none focus:border-accent transition-colors"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="new">Newest first</option>
              <option value="old">Oldest first</option>
              <option value="relevance">Most relevant</option>
              <option value="score_desc">Top score</option>
              <option value="score_asc">Lowest score</option>
              <option value="gilded_desc">Most gilded</option>
              <option value="gilded_asc">Least gilded</option>
              {searchType === 'submission' && <option value="num_comments_desc">Most comments</option>}
              {searchType === 'submission' && <option value="num_comments_asc">Fewest comments</option>}
            </select>
          </div>

          <div className="text-xs text-text-tertiary mb-4">
            {results.length} results for "<span className="text-accent">{query}</span>" {subreddit ? `in r/${subreddit}` : 'across all subreddits'} (page {(Math.floor(offset / pageSizeNum) + 1)})
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
                      const targetSub = subreddit || r.subreddit;
                      if (searchType === 'submission') {
                        navigate(`/r/${targetSub}/comments/${r.id}`);
                      } else {
                        navigate(`/r/${targetSub}/comments/${r.link_id}`);
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
                        {r.subreddit && !subreddit && <span>r/{r.subreddit}</span>}
                        {r.num_comments != null && <span>💬 {r.num_comments}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 mt-6 py-4 flex-wrap">
                <select
                  className="px-3 py-2.5 rounded-lg text-xs font-semibold uppercase bg-bg-tertiary text-text-secondary border border-border outline-none focus:border-accent transition-colors"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                >
                  <option value="20">20 / page</option>
                  <option value="50">50 / page</option>
                  <option value="100">100 / page</option>
                  <option value="200">200 / page</option>
                </select>
                <button
                  onClick={() => handlePaginate('prev')}
                  disabled={!hasPrev || searching}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  onClick={() => handlePaginate('next')}
                  disabled={!hasNext || searching}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
