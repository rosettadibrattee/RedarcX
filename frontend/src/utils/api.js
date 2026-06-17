/**
 * api.js — Centralized API client for RedArc frontend.
 *
 * Replaces all inline fetch() calls scattered across components.
 * Provides: error handling, response typing, pagination helpers, abort support.
 */

import {
  createDemoUpload,
  getDemoComments,
  getDemoProgress,
  getDemoStats,
  getDemoSubmissions,
  getDemoSubreddits,
  getDemoUploadStatus,
  mutateDemoUnlist,
  mutateDemoWatch,
  previewDemoDelete,
  searchDemo,
  submitDemoUrl,
} from './demoData';

const API_BASE = (import.meta.env.VITE_API_DOMAIN || '/api').replace(/\/+$/, '');
const FORCE_STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === 'true';

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function shouldUseDemoFallback(err) {
  if (FORCE_STATIC_DEMO) return true;
  if (!(err instanceof ApiError)) return false;
  return err.status === 0 || err.status === 404;
}

async function withDemoFallback(liveRequest, demoRequest) {
  if (FORCE_STATIC_DEMO) return demoRequest();

  try {
    return await liveRequest();
  } catch (err) {
    if (shouldUseDemoFallback(err)) {
      return demoRequest();
    }
    throw err;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const { signal, ...fetchOptions } = options;

  try {
    const resp = await fetch(url, {
      ...fetchOptions,
      signal,
      headers: {
        'Accept': 'application/json',
        ...fetchOptions.headers,
      },
    });

    if (!resp.ok) {
      let body = null;
      try { body = await resp.json(); } catch {}
      throw new ApiError(
        body?.error || `HTTP ${resp.status}`,
        resp.status,
        body
      );
    }

    return await resp.json();
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error', 0, null);
  }
}

// ---- Subreddits ----

export async function fetchSubreddits(signal) {
  return withDemoFallback(
    () => request('/search/subreddits', { signal }),
    () => getDemoSubreddits()
  );
}

export async function fetchStats(signal) {
  return withDemoFallback(
    () => request('/stats', { signal }),
    () => getDemoStats()
  );
}

// ---- Submissions ----

export async function fetchSubmissions({ subreddit, before, after, sort = 'DESC', id }, signal) {
  const params = new URLSearchParams();
  if (subreddit) params.set('subreddit', subreddit);
  if (before) params.set('before', before);
  if (after) params.set('after', after);
  if (sort) params.set('sort', sort);
  if (id) params.set('id', id);
  return withDemoFallback(
    () => request(`/search/submissions?${params}`, { signal }),
    () => getDemoSubmissions({ subreddit, before, after, sort, id })
  );
}

// ---- Comments ----

export async function fetchComments({ link_id, subreddit, parent_id, unflatten = true, before, after, sort }, signal) {
  const params = new URLSearchParams();
  if (link_id) params.set('link_id', link_id);
  if (subreddit) params.set('subreddit', subreddit);
  if (parent_id) params.set('parent_id', parent_id);
  if (unflatten) params.set('unflatten', 'true');
  if (before) params.set('before', before);
  if (after) params.set('after', after);
  if (sort) params.set('sort', sort);
  return withDemoFallback(
    () => request(`/search/comments?${params}`, { signal }),
    () => getDemoComments({ link_id, subreddit, parent_id, unflatten, before, after, sort })
  );
}

// ---- Full-Text Search ----

export async function search({
  type,
  subreddit,
  query,
  before,
  after,
  sort,
  sort_by,
  author,
  keywords,
  score_min,
  score_max,
  gilded_min,
  gilded_max,
  num_comments_min,
  num_comments_max,
  domain,
  is_self,
  match,
  limit,
  offset,
}, signal) {
  const params = new URLSearchParams();
  params.set('type', type);
  params.set('search', query);
  if (subreddit) params.set('subreddit', subreddit);
  if (before) params.set('before', before);
  if (after) params.set('after', after);
  if (sort) params.set('sort', sort);
  if (sort_by) params.set('sort_by', sort_by);
  if (author) params.set('author', author);
  if (keywords) params.set('keywords', keywords);
  if (score_min != null && score_min !== '') params.set('score_min', score_min);
  if (score_max != null && score_max !== '') params.set('score_max', score_max);
  if (gilded_min != null && gilded_min !== '') params.set('gilded_min', gilded_min);
  if (gilded_max != null && gilded_max !== '') params.set('gilded_max', gilded_max);
  if (num_comments_min != null && num_comments_min !== '') params.set('num_comments_min', num_comments_min);
  if (num_comments_max != null && num_comments_max !== '') params.set('num_comments_max', num_comments_max);
  if (domain) params.set('domain', domain);
  if (is_self != null && is_self !== '') params.set('is_self', is_self);
  if (match) params.set('match', match);
  if (limit) params.set('limit', limit);
  if (offset != null && offset !== '') params.set('offset', offset);
  return withDemoFallback(
    () => request(`/search?${params}`, { signal }),
    () => searchDemo({
      type,
      subreddit,
      query,
      before,
      after,
      sort,
      sort_by,
      author,
      keywords,
      score_min,
      score_max,
      gilded_min,
      gilded_max,
      num_comments_min,
      num_comments_max,
      domain,
      is_self,
      match,
      limit,
      offset,
    })
  );
}

// ---- Submit URL ----

export async function submitUrl(url, password = '') {
  return withDemoFallback(
    () => request('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, password }),
    }),
    () => submitDemoUrl(url)
  );
}

// ---- Upload File ----

export async function uploadFile(file, { type = 'auto', password = '', target = 'both', autoIndex = true, onConflict = 'skip' } = {}) {
  const formData = new FormData();
  formData.append('password', password);
  formData.append('type', type);
  formData.append('target', target);
  formData.append('auto_index', autoIndex ? 'true' : 'false');
  formData.append('on_conflict', onConflict);
  // Append file last to preserve compatibility with streaming multipart parsers.
  formData.append('file', file);

  return withDemoFallback(
    () => request('/upload', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type — browser sets it with boundary for multipart
    }),
    () => createDemoUpload(file)
  );
}

export async function fetchUploadStatus(jobId) {
  const endpoint = jobId ? `/upload/status?job_id=${jobId}` : '/upload/status';
  return withDemoFallback(
    () => request(endpoint),
    () => getDemoUploadStatus(jobId)
  );
}

// ---- Watch ----

export async function watchSubreddit(subreddit, action, password) {
  return withDemoFallback(
    () => request('/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subreddit, action, password }),
    }),
    () => mutateDemoWatch(subreddit, action)
  );
}

// ---- Unlist ----

export async function unlistSubreddit(subreddit, unlist, password) {
  return withDemoFallback(
    () => request('/unlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subreddit, unlist, password }),
    }),
    () => mutateDemoUnlist(subreddit, unlist)
  );
}

// ---- Progress ----

export async function fetchProgress(password = '') {
  return withDemoFallback(
    () => request('/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }),
    () => getDemoProgress()
  );
}

// ---- Admin Danger Zone ----

export async function adminDeleteByFilter(payload) {
  return withDemoFallback(
    () => request('/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    () => previewDemoDelete(payload)
  );
}

// ---- Hooks helper ----

/**
 * Pagination helper for cursor-based pagination.
 * Extracts the first/last created_utc from results for prev/next navigation.
 */
export function getPaginationCursors(results) {
  if (!results || results.length === 0) return { first: null, last: null };
  return {
    first: results[0].created_utc,
    last: results[results.length - 1].created_utc,
  };
}
