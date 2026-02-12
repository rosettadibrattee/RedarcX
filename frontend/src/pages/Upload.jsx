import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload as UploadIcon, File, X, Check, Link2 } from 'lucide-react';
import { uploadFile, fetchUploadStatus, submitUrl } from '../utils/api';
import { formatFileSize } from '../utils/format';
import { Toast } from '../components/UI';

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [dataType, setDataType] = useState('auto');
  const [password, setPassword] = useState('');
  const [target, setTarget] = useState('both');
  const [autoIndex, setAutoIndex] = useState(true);
  const [onConflict, setOnConflict] = useState('skip');
  const [jobs, setJobs] = useState({});
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // URL submission state
  const [urlValue, setUrlValue] = useState('');
  const [urlPassword, setUrlPassword] = useState('');
  const [urlMessage, setUrlMessage] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => /\.(json|ndjson|zst|zstd)$/i.test(f.name)
    );
    if (dropped.length === 0) {
      showToast('error', 'Only .json, .ndjson, .zst, and .zstd files are supported');
      return;
    }
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = '';
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setJobs((prev) => { const n = { ...prev }; delete n[idx]; return n; });
  };

  // Poll job status
  useEffect(() => {
    const activeJobs = Object.entries(jobs).filter(
      ([, j]) => j.job_id && j.status !== 'complete' && j.status !== 'failed'
    );
    if (activeJobs.length === 0) return;

    const interval = setInterval(async () => {
      for (const [idx, job] of activeJobs) {
        try {
          const status = await fetchUploadStatus(job.job_id);
          setJobs((prev) => ({ ...prev, [idx]: status }));
          if (status.status === 'complete') {
            showToast('success', `${files[idx]?.name}: ${status.inserted} records imported`);
          } else if (status.status === 'failed') {
            showToast('error', `${files[idx]?.name}: ${status.error || 'Import failed'}`);
          }
        } catch { /* poll again */ }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobs, files]);

  const startUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (jobs[i]?.status === 'complete') continue; // Skip already done
      try {
        setJobs((prev) => ({ ...prev, [i]: { status: 'uploading' } }));
        const result = await uploadFile(files[i], {
          type: dataType,
          password,
          target,
          autoIndex,
          onConflict,
        });
        setJobs((prev) => ({
          ...prev,
          [i]: { ...result, status: 'processing', job_id: result.job_id },
        }));
      } catch (err) {
        setJobs((prev) => ({ ...prev, [i]: { status: 'failed', error: err.message } }));
        showToast('error', `${files[i].name}: ${err.message}`);
      }
    }
    setUploading(false);
  };

  const handleSubmitUrl = async () => {
    if (!urlValue.trim()) return;
    setUrlMessage(null);
    try {
      const result = await submitUrl(urlValue.trim(), urlPassword);
      setUrlMessage({ type: 'success', text: `Submitted! Job ID: ${result.id}, Queue position: ${result.position}` });
      setUrlValue('');
    } catch (err) {
      setUrlMessage({ type: 'error', text: err.message });
    }
  };

  const getJobProgress = (idx) => {
    const job = jobs[idx];
    if (!job) return null;
    if (job.status === 'uploading') return { pct: null, label: 'Uploading...' };
    if (job.status === 'processing') {
      const pct = job.lines_processed ? Math.min(99, Math.round((job.inserted / Math.max(job.lines_processed, 1)) * 100)) : null;
      return { pct, label: `${job.inserted || 0} inserted, ${job.errors || 0} errors` };
    }
    if (job.status === 'complete') return { pct: 100, label: `Done — ${job.inserted} records` };
    if (job.status === 'failed') return { pct: 0, label: job.error || 'Failed' };
    return null;
  };

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="font-serif text-[28px] font-semibold text-text-primary text-center mb-2">
        Upload Data
      </div>
      <p className="text-center text-[13px] text-text-tertiary mb-6">
        Import Pushshift dumps or Reddit data exports into your archive
      </p>

      {/* Drop zone */}
      <div
        className={`upload-zone border-2 border-dashed rounded-xl p-12 text-center cursor-pointer bg-bg-secondary ${dragActive ? 'drag-active' : 'border-border'}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-12 h-12 mx-auto mb-4 bg-accent-muted rounded-xl flex items-center justify-center text-accent">
          <UploadIcon size={24} />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {dragActive ? 'Drop files here' : 'Drop files or click to browse'}
        </div>
        <div className="text-xs text-text-tertiary mb-4">
          Upload Pushshift NDJSON dumps for submissions or comments
        </div>
        <div className="flex gap-1.5 justify-center">
          {['.json', '.ndjson', '.zst', '.zstd'].map((ext) => (
            <span key={ext} className="text-[10px] font-semibold tracking-wider px-2 py-1 rounded uppercase text-text-tertiary bg-bg-tertiary border border-border">
              {ext}
            </span>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json,.ndjson,.zst,.zstd"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          {files.map((file, idx) => {
            const progress = getJobProgress(idx);
            return (
              <div key={idx} className="flex items-center gap-3 p-3 bg-bg-secondary border border-border-subtle rounded-lg">
                <div className="text-text-tertiary flex-shrink-0"><File size={18} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-text-primary truncate">{file.name}</div>
                  <div className="text-[11px] text-text-tertiary">
                    {formatFileSize(file.size)}
                    {progress && <span className="ml-2">{progress.label}</span>}
                  </div>
                  {progress && progress.pct != null && (
                    <div className="w-full h-1 bg-bg-tertiary rounded mt-1.5 overflow-hidden">
                      <div className="h-full bg-accent rounded progress-bar" style={{ width: `${progress.pct}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {jobs[idx]?.status === 'complete' ? (
                    <Check size={16} className="text-green-500" />
                  ) : jobs[idx]?.status === 'failed' ? (
                    <X size={16} className="text-red-500" />
                  ) : jobs[idx]?.status ? (
                    <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="p-1 hover:bg-bg-hover rounded transition-colors">
                      <X size={14} className="text-text-tertiary" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import configuration */}
      <div className="mt-5 p-5 bg-bg-secondary border border-border-subtle rounded-xl">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-text-secondary mb-4">
          Import Configuration
        </h3>

        <div className="flex gap-1 mb-4">
          {['submissions', 'comments', 'auto'].map((t) => (
            <button
              key={t}
              onClick={() => setDataType(t)}
              className={`px-3.5 py-1.5 rounded-md text-[11px] font-semibold border transition-all ${
                dataType === t
                  ? 'bg-accent-muted text-accent border-accent'
                  : 'bg-bg-tertiary text-text-secondary border-border'
              }`}
            >
              {t === 'auto' ? 'Auto-detect' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Ingest Password</label>
            <input
              type="password"
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              placeholder="Leave blank if not set"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Target Database</label>
            <select
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="both">Both (recommended)</option>
              <option value="main">Main only (postgres:5432)</option>
              <option value="fts">FTS only (postgres_fts:5433)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">On Conflict</label>
            <select
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              value={onConflict}
              onChange={(e) => setOnConflict(e.target.value)}
            >
              <option value="skip">Skip duplicates (DO NOTHING)</option>
              <option value="update">Update existing</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Auto-index after import</label>
            <select
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              value={autoIndex ? 'yes' : 'no'}
              onChange={(e) => setAutoIndex(e.target.value === 'yes')}
            >
              <option value="yes">Yes — update subreddit counts</option>
              <option value="no">No — manual indexing later</option>
            </select>
          </div>
        </div>

        <button
          onClick={startUpload}
          disabled={files.length === 0 || uploading}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider bg-accent text-white shadow-[0_2px_8px_rgba(255,69,0,0.3)] hover:bg-accent-hover hover:shadow-[0_4px_16px_rgba(255,69,0,0.4)] hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
        >
          {uploading ? (
            <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
          ) : (
            <><UploadIcon size={14} /> Start Import ({files.length} file{files.length !== 1 ? 's' : ''})</>
          )}
        </button>
      </div>

      {/* Submit URL section */}
      <div className="mt-4 p-5 bg-bg-secondary border border-border-subtle rounded-xl">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
          Submit Reddit URL
        </h3>
        <p className="text-xs text-text-tertiary mb-4">
          Submit a Reddit thread URL to be fetched and archived by the ingest worker
        </p>

        <div className="mb-3">
          <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Reddit URL</label>
          <input
            className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
            placeholder="https://reddit.com/r/programming/comments/abc123/..."
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitUrl()}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              className="w-full p-2.5 rounded-lg text-[13px] bg-bg-tertiary border border-border text-text-primary outline-none focus:border-accent transition-colors"
              placeholder="Leave blank if not set"
              value={urlPassword}
              onChange={(e) => setUrlPassword(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSubmitUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-accent text-white hover:bg-accent-hover transition-all"
            >
              <Link2 size={14} /> Submit
            </button>
          </div>
        </div>

        {urlMessage && (
          <div className={`mt-3 p-3 rounded-lg text-xs ${urlMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {urlMessage.text}
          </div>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}
