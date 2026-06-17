const now = Math.floor(Date.now() / 1000);

const seedSubmissions = [
  {
    id: 'd3mo001',
    subreddit: 'python',
    title: 'Asyncio debugging tips 🚀',
    author: 'alice',
    permalink: '/r/python/comments/d3mo001/asyncio_debugging_tips/',
    thumbnail: 'self',
    num_comments: 0,
    url: 'https://reddit.com/r/python/comments/d3mo001/asyncio_debugging_tips/',
    score: 421,
    gilded: 2,
    created_utc: now - 3700,
    self_text: 'A practical checklist for deadlocks, task leaks, and event-loop profiling. Includes emoji tests 😅',
    is_self: true,
  },
  {
    id: 'd3mo002',
    subreddit: 'programming',
    title: 'Rust parser benchmark: partial-token matching at scale',
    author: 'bob',
    permalink: '/r/programming/comments/d3mo002/rust_parser_benchmark/',
    thumbnail: 'default',
    num_comments: 0,
    url: 'https://github.com/example/redarc-demo',
    score: 312,
    gilded: 1,
    created_utc: now - 7200,
    self_text: '',
    is_self: false,
  },
  {
    id: 'd3mo003',
    subreddit: 'dataisbeautiful',
    title: 'Heatmap of archive growth month-by-month',
    author: 'chartcat',
    permalink: '/r/dataisbeautiful/comments/d3mo003/archive_growth_heatmap/',
    thumbnail: 'default',
    num_comments: 0,
    url: 'https://example.org/visuals/archive-growth',
    score: 188,
    gilded: 0,
    created_utc: now - 10800,
    self_text: '',
    is_self: false,
  },
  {
    id: 'd3mo004',
    subreddit: 'learnmachinelearning',
    title: 'Fine-tuning notes: token windows and retrieval',
    author: 'mlmentor',
    permalink: '/r/learnmachinelearning/comments/d3mo004/fine_tuning_notes/',
    thumbnail: 'self',
    num_comments: 0,
    url: 'https://reddit.com/r/learnmachinelearning/comments/d3mo004/fine_tuning_notes/',
    score: 95,
    gilded: 0,
    created_utc: now - 14400,
    self_text: 'Prompt chunking, reranking, and eval harness notes.',
    is_self: true,
  },
  {
    id: 'd3mo005',
    subreddit: 'python',
    title: 'Unicode and emoji normalization in search 🚀🔥',
    author: 'unicode_wizard',
    permalink: '/r/python/comments/d3mo005/unicode_emoji_normalization/',
    thumbnail: 'self',
    num_comments: 0,
    url: 'https://reddit.com/r/python/comments/d3mo005/unicode_emoji_normalization/',
    score: 267,
    gilded: 3,
    created_utc: now - 9600,
    self_text: 'Searching emojis and partial words should feel natural in demo mode.',
    is_self: true,
  },
  {
    id: 'd3mo006',
    subreddit: 'programming',
    title: 'Building a local-first moderation toolbox',
    author: 'opsgeek',
    permalink: '/r/programming/comments/d3mo006/local_first_moderation_toolbox/',
    thumbnail: 'default',
    num_comments: 0,
    url: 'https://news.ycombinator.com/item?id=42000000',
    score: 143,
    gilded: 0,
    created_utc: now - 18000,
    self_text: '',
    is_self: false,
  },
];

const subreddits = [
  'python',
  'programming',
  'dataisbeautiful',
  'learnmachinelearning',
  'technology',
  'compsci',
  'devops',
  'datascience',
];

const topics = [
  'emoji-aware search',
  'partial-word indexing',
  'moderation filters',
  'thread unflattening',
  'upload job telemetry',
  'query relevance tuning',
  'dataset backfill strategy',
  'render deployment fixes',
  'FTS fallback behavior',
  'admin danger-zone review',
];

const authors = [
  'alice',
  'bob',
  'chartcat',
  'mlmentor',
  'unicode_wizard',
  'opsgeek',
  'bytequeen',
  'traceback_tom',
  'clangfan',
  'llm_student',
  'emoji_bot',
  'site_reliability',
];

const syntheticSubmissions = Array.from({ length: 36 }, (_, idx) => {
  const id = `d3x${String(idx + 1).padStart(4, '0')}`;
  const subreddit = subreddits[idx % subreddits.length];
  const topic = topics[idx % topics.length];
  const isSelf = idx % 3 !== 0;
  const emoji = idx % 9 === 0 ? ' 🚀' : idx % 11 === 0 ? ' 🔥' : '';

  return {
    id,
    subreddit,
    title: `Demo note: ${topic}${emoji}`,
    author: authors[idx % authors.length],
    permalink: `/r/${subreddit}/comments/${id}/demo_post_${idx + 1}/`,
    thumbnail: isSelf ? 'self' : 'default',
    num_comments: 0,
    url: isSelf
      ? `https://reddit.com/r/${subreddit}/comments/${id}/demo_post_${idx + 1}/`
      : `https://example.org/${subreddit}/demo/${idx + 1}`,
    score: 25 + ((idx * 17) % 520),
    gilded: idx % 14 === 0 ? 1 : 0,
    created_utc: now - 21600 - idx * 900,
    self_text: isSelf
      ? `Long-form notes about ${topic}. Covers partial matching, keywords, and emoji handling for realistic demo search.`
      : '',
    is_self: isSelf,
  };
});

const submissions = [...seedSubmissions, ...syntheticSubmissions];

const seedComments = [
  {
    id: 'c3mo001',
    subreddit: 'python',
    body: 'Great checklist, the deadlock section saved me 🚀',
    author: 'bytequeen',
    score: 42,
    gilded: 0,
    created_utc: now - 3500,
    parent_id: 'd3mo001',
    link_id: 'd3mo001',
  },
  {
    id: 'c3mo002',
    subreddit: 'python',
    body: 'Same here. Partial token search also works with async now.',
    author: 'traceback_tom',
    score: 18,
    gilded: 0,
    created_utc: now - 3300,
    parent_id: 'c3mo001',
    link_id: 'd3mo001',
  },
  {
    id: 'c3mo003',
    subreddit: 'programming',
    body: 'Rust bench numbers look solid. Any CI reproducibility notes?',
    author: 'clangfan',
    score: 31,
    gilded: 1,
    created_utc: now - 7000,
    parent_id: 'd3mo002',
    link_id: 'd3mo002',
  },
  {
    id: 'c3mo004',
    subreddit: 'learnmachinelearning',
    body: 'Could you share your eval rubric for retrieval quality?',
    author: 'llm_student',
    score: 21,
    gilded: 0,
    created_utc: now - 14000,
    parent_id: 'd3mo004',
    link_id: 'd3mo004',
  },
  {
    id: 'c3mo005',
    subreddit: 'python',
    body: 'Emoji query tests are finally readable 🔥🚀',
    author: 'emoji_bot',
    score: 57,
    gilded: 2,
    created_utc: now - 9200,
    parent_id: 'd3mo005',
    link_id: 'd3mo005',
  },
  {
    id: 'c3mo006',
    subreddit: 'programming',
    body: 'Local-first tooling makes incident response much faster.',
    author: 'site_reliability',
    score: 9,
    gilded: 0,
    created_utc: now - 17000,
    parent_id: 'd3mo006',
    link_id: 'd3mo006',
  },
];

const syntheticComments = syntheticSubmissions.flatMap((submission, idx) => {
  const rootId = `c3x${String(idx + 1).padStart(4, '0')}01`;
  return [
    {
      id: rootId,
      subreddit: submission.subreddit,
      body: `Nice write-up. Test case ${idx + 1}.1 for ${topics[idx % topics.length]} with partial tokens and emojis 🚀.`,
      author: authors[(idx + 3) % authors.length],
      score: 3 + ((idx * 5) % 90),
      gilded: idx % 17 === 0 ? 1 : 0,
      created_utc: submission.created_utc + 110,
      parent_id: submission.id,
      link_id: submission.id,
    },
    {
      id: `c3x${String(idx + 1).padStart(4, '0')}02`,
      subreddit: submission.subreddit,
      body: `This is useful for demo environments and GitHub Pages previews.`,
      author: authors[(idx + 5) % authors.length],
      score: 4 + ((idx * 7) % 70),
      gilded: 0,
      created_utc: submission.created_utc + 240,
      parent_id: rootId,
      link_id: submission.id,
    },
  ];
});

const comments = [...seedComments, ...syntheticComments];

function withCommentCounts(records = submissions) {
  const counts = comments.reduce((acc, comment) => {
    acc[comment.link_id] = (acc[comment.link_id] || 0) + 1;
    return acc;
  }, {});

  return records.map((submission) => ({
    ...submission,
    num_comments: counts[submission.id] || 0,
  }));
}

const submissionsWithCounts = withCommentCounts();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toInt(value) {
  if (value == null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function matchesText(record, type, query, matchMode = 'partial') {
  const text = type === 'submission'
    ? `${record.title || ''} ${record.self_text || ''} ${record.url || ''}`
    : record.body || '';
  const normalizedText = text.toLowerCase();
  const normalizedQuery = String(query || '').trim().toLowerCase();

  if (!normalizedQuery) return false;
  if (matchMode === 'phrase') return normalizedText.includes(normalizedQuery);

  return normalizedQuery.split(/\s+/).every((term) => normalizedText.includes(term));
}

function sortRecords(records, sortBy = 'new', type = 'submission', query = '') {
  const list = [...records];
  const relevance = (record) => {
    const text = type === 'submission' ? `${record.title} ${record.self_text}` : record.body;
    return String(query || '').toLowerCase().split(/\s+/).filter(Boolean)
      .reduce((score, term) => score + (text.toLowerCase().includes(term) ? 1 : 0), 0);
  };

  const sorters = {
    old: (a, b) => a.created_utc - b.created_utc,
    relevance: (a, b) => relevance(b) - relevance(a),
    score_desc: (a, b) => b.score - a.score,
    score_asc: (a, b) => a.score - b.score,
    gilded_desc: (a, b) => b.gilded - a.gilded,
    gilded_asc: (a, b) => a.gilded - b.gilded,
    num_comments_desc: (a, b) => (b.num_comments || 0) - (a.num_comments || 0),
    num_comments_asc: (a, b) => (a.num_comments || 0) - (b.num_comments || 0),
    ASC: (a, b) => a.created_utc - b.created_utc,
  };

  return list.sort(sorters[sortBy] || ((a, b) => b.created_utc - a.created_utc));
}

function unflattenComments(flatComments, rootLinkId) {
  const byId = new Map(flatComments.map((comment) => [comment.id, { ...comment, replies: [] }]));
  const tree = [];

  for (const item of byId.values()) {
    if (item.parent_id === rootLinkId) {
      tree.push(item);
      continue;
    }

    const parent = byId.get(item.parent_id);
    if (parent) {
      parent.replies.push(item);
    } else {
      tree.push(item);
    }
  }

  return tree.sort((a, b) => b.created_utc - a.created_utc);
}

function progressHistory() {
  return Array.from({ length: 8 }, (_, idx) => ({
    job_id: idx === 0 ? 'demo-seed' : `demo-ingest-${String(idx).padStart(3, '0')}`,
    url: submissionsWithCounts[idx]?.url || 'demo://seed',
    start_utc: now - (idx + 1) * 1800,
    finish_utc: idx === 3 ? null : now - (idx + 1) * 1800 + 60,
    error: idx === 5 ? 'Rate limited by upstream API, retry queued' : null,
  }));
}

export function getDemoSubreddits() {
  const submissionCounts = {};
  const commentCounts = {};

  for (const submission of submissionsWithCounts) {
    submissionCounts[submission.subreddit] = (submissionCounts[submission.subreddit] || 0) + 1;
  }

  for (const comment of comments) {
    commentCounts[comment.subreddit] = (commentCounts[comment.subreddit] || 0) + 1;
  }

  return Object.keys({ ...submissionCounts, ...commentCounts }).sort().map((name) => ({
    name,
    unlisted: false,
    num_submissions: submissionCounts[name] || 0,
    num_comments: commentCounts[name] || 0,
  }));
}

export function getDemoStats() {
  const demoSubreddits = getDemoSubreddits();
  const totalSubmissions = demoSubreddits.reduce((sum, item) => sum + item.num_submissions, 0);
  const totalComments = demoSubreddits.reduce((sum, item) => sum + item.num_comments, 0);

  return {
    subreddits: demoSubreddits.length,
    submissions: totalSubmissions,
    comments: totalComments,
    total_records: totalSubmissions + totalComments,
  };
}

export function getDemoSubmissions({ subreddit, before, after, sort = 'DESC', id } = {}) {
  let records = submissionsWithCounts;

  if (id) records = records.filter((submission) => submission.id === id);
  if (subreddit) records = records.filter((submission) => submission.subreddit === subreddit);

  const beforeTs = toInt(before);
  const afterTs = toInt(after);
  if (beforeTs != null) records = records.filter((submission) => submission.created_utc < beforeTs);
  if (afterTs != null) records = records.filter((submission) => submission.created_utc > afterTs);

  return clone(sortRecords(records, sort).slice(0, 100));
}

export function getDemoComments({ link_id, subreddit, parent_id, unflatten = true, before, after, sort } = {}) {
  let records = comments;

  if (link_id) records = records.filter((comment) => comment.link_id === link_id);
  if (subreddit) records = records.filter((comment) => comment.subreddit === subreddit);
  if (parent_id) records = records.filter((comment) => comment.parent_id === parent_id);

  const beforeTs = toInt(before);
  const afterTs = toInt(after);
  if (beforeTs != null) records = records.filter((comment) => comment.created_utc < beforeTs);
  if (afterTs != null) records = records.filter((comment) => comment.created_utc > afterTs);

  records = sortRecords(records, sort);
  return clone(unflatten ? unflattenComments(records, link_id) : records);
}

export function searchDemo({
  type,
  subreddit,
  query,
  before,
  after,
  sort_by,
  author,
  keywords,
  score_min,
  score_max,
  num_comments_min,
  num_comments_max,
  domain,
  is_self,
  match,
  limit,
  offset,
} = {}) {
  const searchType = type === 'comment' ? 'comment' : 'submission';
  let records = searchType === 'submission' ? submissionsWithCounts : comments;

  if (subreddit) records = records.filter((record) => record.subreddit === subreddit);
  if (author) records = records.filter((record) => record.author?.toLowerCase() === author.toLowerCase());
  if (query) records = records.filter((record) => matchesText(record, searchType, query, match));
  if (keywords) records = records.filter((record) => matchesText(record, searchType, keywords, 'partial'));

  const beforeTs = toInt(before);
  const afterTs = toInt(after);
  if (beforeTs != null) records = records.filter((record) => record.created_utc < beforeTs);
  if (afterTs != null) records = records.filter((record) => record.created_utc > afterTs);

  const scoreMin = toInt(score_min);
  const scoreMax = toInt(score_max);
  if (scoreMin != null) records = records.filter((record) => record.score >= scoreMin);
  if (scoreMax != null) records = records.filter((record) => record.score <= scoreMax);

  if (searchType === 'submission') {
    const commentsMin = toInt(num_comments_min);
    const commentsMax = toInt(num_comments_max);
    if (commentsMin != null) records = records.filter((record) => record.num_comments >= commentsMin);
    if (commentsMax != null) records = records.filter((record) => record.num_comments <= commentsMax);
    if (domain) records = records.filter((record) => record.url?.toLowerCase().includes(domain.toLowerCase()));
    if (is_self === 'true') records = records.filter((record) => record.is_self);
    if (is_self === 'false') records = records.filter((record) => !record.is_self);
  }

  const start = toInt(offset) || 0;
  const size = toInt(limit) || 20;
  return clone(sortRecords(records, sort_by, searchType, query).slice(start, start + size));
}

export function getDemoProgress() {
  return clone(progressHistory());
}

export function createDemoUpload(file) {
  return {
    id: `demo-upload-${Date.now()}`,
    job_id: `demo-upload-${Date.now()}`,
    filename: file?.name || 'demo-upload.ndjson',
    file_size: file?.size || 0,
    status: 'complete',
    lines_processed: 1200,
    inserted: 1184,
    skipped: 16,
    errors: 0,
    subreddits: ['python', 'programming'],
  };
}

export function getDemoUploadStatus(jobId) {
  return {
    id: jobId || 'demo-upload',
    job_id: jobId || 'demo-upload',
    filename: 'demo-upload.ndjson',
    status: 'complete',
    lines_processed: 1200,
    inserted: 1184,
    skipped: 16,
    errors: 0,
    subreddits: ['python', 'programming'],
  };
}

export function submitDemoUrl(url) {
  return {
    status: 'queued',
    id: `demo-submit-${Date.now()}`,
    position: 1,
    url,
  };
}

export function previewDemoDelete(payload = {}) {
  const target = payload.target === 'comments' ? comments : submissionsWithCounts;
  const subreddit = String(payload.subreddit || '').toLowerCase();
  const matched = subreddit
    ? target.filter((record) => record.subreddit === subreddit).length
    : 0;

  return {
    dry_run: true,
    filters: payload,
    counts: {
      main: matched,
      fts: matched,
    },
    fts_enabled: true,
  };
}

export function mutateDemoWatch(subreddit, action) {
  return {
    status: 'ok',
    subreddit,
    action,
  };
}

export function mutateDemoUnlist(subreddit, unlist) {
  return {
    status: 'ok',
    subreddit,
    unlist,
  };
}
