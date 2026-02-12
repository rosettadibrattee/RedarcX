import { useState } from 'react';
import { watchSubreddit, unlistSubreddit, fetchProgress } from '../utils/api';
import { useApi } from '../hooks/useApi';
import { Loading, Badge, Toast } from '../components/UI';

export default function AdminPage() {
  const [toast, setToast] = useState(null);

  // Watch subreddits
  const [watchSub, setWatchSub] = useState('');
  const [watchPw, setWatchPw] = useState('');

  // Unlist
  const [unlistSub, setUnlistSub] = useState('');
  const [unlistPw, setUnlistPw] = useState('');

  // Progress
  const [progressPw, setProgressPw] = useState('');
  const { data: progress, loading: loadingProgress, refetch: refetchProgress } = useApi(
    () => fetchProgress(progressPw),
    [progressPw]
  );

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleWatch = async (action) => {
    if (!watchSub.trim()) return;
    try {
      await watchSubreddit(watchSub.trim().toLowerCase(), action, watchPw);
      showToast('success', `${action === 'add' ? 'Watching' : 'Unwatched'} r/${watchSub}`);
      setWatchSub('');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleUnlist = async (unlist) => {
    if (!unlistSub.trim()) return;
    try {
      await unlistSubreddit(unlistSub.trim().toLowerCase(), unlist, unlistPw);
      showToast('success', `${unlist ? 'Unlisted' : 'Relisted'} r/${unlistSub}`);
      setUnlistSub('');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="font-serif text-[28px] font-semibold text-text-primary text-center mb-2">
        Admin
      </div>
      <p className="text-center text-[13px] text-text-tertiary mb-6">
        Manage subreddits, watch lists, and ingest jobs
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Watch subreddits */}
        <div className="p-5 bg-bg-secondary border border-border-subtle rounded-xl">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
            Watch Subreddits
          </h3>
          <p className="text-xs text-text-tertiary mb-3">
            Add subreddits for periodic fetching of new/hot/rising threads
          </p>
          <div className="space-y-2">
            <input
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              placeholder="subreddit name"
              value={watchSub}
              onChange={(e) => setWatchSub(e.target.value)}
            />
            <input
              type="password"
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              placeholder="Admin password"
              value={watchPw}
              onChange={(e) => setWatchPw(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleWatch('add')}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase bg-accent text-white hover:bg-accent-hover transition-all"
              >
                Watch
              </button>
              <button
                onClick={() => handleWatch('remove')}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover transition-all"
              >
                Unwatch
              </button>
            </div>
          </div>
        </div>

        {/* Unlist */}
        <div className="p-5 bg-bg-secondary border border-border-subtle rounded-xl">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
            Unlist Subreddit
          </h3>
          <p className="text-xs text-text-tertiary mb-3">
            Hide subreddits from the public index without deleting data
          </p>
          <div className="space-y-2">
            <input
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              placeholder="subreddit name"
              value={unlistSub}
              onChange={(e) => setUnlistSub(e.target.value)}
            />
            <input
              type="password"
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              placeholder="Admin password"
              value={unlistPw}
              onChange={(e) => setUnlistPw(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleUnlist(true)}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover transition-all"
              >
                Unlist
              </button>
              <button
                onClick={() => handleUnlist(false)}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase bg-accent text-white hover:bg-accent-hover transition-all"
              >
                Relist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Job history */}
      <div className="p-5 bg-bg-secondary border border-border-subtle rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-text-secondary">
            Ingest Job History
          </h3>
          <div className="flex gap-2 items-center">
            <input
              type="password"
              className="p-1.5 rounded text-[11px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent w-32"
              placeholder="Admin pw (optional)"
              value={progressPw}
              onChange={(e) => setProgressPw(e.target.value)}
            />
            <button
              onClick={refetchProgress}
              className="px-3 py-1.5 rounded text-[11px] font-semibold uppercase bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-hover transition-all"
            >
              Refresh
            </button>
          </div>
        </div>

        {loadingProgress && <Loading />}

        {!loadingProgress && progress && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-text-tertiary font-medium">Job ID</th>
                  <th className="text-left p-2 text-text-tertiary font-medium">URL</th>
                  <th className="text-left p-2 text-text-tertiary font-medium">Started</th>
                  <th className="text-left p-2 text-text-tertiary font-medium">Finished</th>
                  <th className="text-left p-2 text-text-tertiary font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {progress.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-text-tertiary">No jobs found</td>
                  </tr>
                ) : (
                  progress.map((p) => (
                    <tr key={p.job_id} className="border-b border-border-subtle">
                      <td className="p-2.5 text-text-secondary font-mono">{p.job_id}</td>
                      <td className="p-2.5 text-text-tertiary truncate max-w-[200px]">{p.url || '—'}</td>
                      <td className="p-2.5 text-text-tertiary">
                        {p.start_utc ? new Date(p.start_utc * 1000).toLocaleString() : '—'}
                      </td>
                      <td className="p-2.5 text-text-tertiary">
                        {p.finish_utc ? new Date(p.finish_utc * 1000).toLocaleString() : '—'}
                      </td>
                      <td className="p-2.5">
                        <Badge variant={p.error ? 'error' : 'success'}>
                          {p.error ? 'error' : 'success'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}
