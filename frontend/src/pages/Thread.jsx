import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { fetchSubmissions, fetchComments } from '../utils/api';
import { formatDate, formatNumber } from '../utils/format';
import { useApi } from '../hooks/useApi';
import { Breadcrumb, EmptyState, Loading, SectionTitle, Badge } from '../components/UI';
import CommentNode from '../components/CommentTree';

export default function ThreadPage() {
  const { subreddit, threadID } = useParams();
  const navigate = useNavigate();

  const { data: submissions, loading: loadingPost } = useApi(
    (signal) => fetchSubmissions({ id: threadID }, signal),
    [threadID]
  );
  const post = submissions?.[0] || {};

  const { data: comments, loading: loadingComments } = useApi(
    (signal) => fetchComments({ link_id: threadID, unflatten: true }, signal),
    [threadID]
  );

  const loading = loadingPost || loadingComments;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Index', onClick: () => navigate('/') },
          { label: `r/${subreddit}`, onClick: () => navigate(`/r/${subreddit}`) },
          { label: post.title ? (post.title.length > 50 ? post.title.slice(0, 50) + '...' : post.title) : 'Thread' },
        ]}
      />

      {loading && <Loading />}

      {!loading && (
        <>
          {/* Post header */}
          <div className="p-6 bg-bg-secondary border border-border-subtle rounded-xl mb-6">
            <div className="flex gap-3 text-[11px] text-text-tertiary flex-wrap items-center mb-2">
              <Badge variant={post.is_self ? 'self' : 'link'}>
                {post.is_self ? 'self' : 'link'}
              </Badge>
              <span>{formatDate(post.created_utc)}</span>
              <span>by {post.author}</span>
              <span>▲ {formatNumber(post.score)}</span>
              {post.gilded > 0 && <span className="text-yellow-400">★ {post.gilded}</span>}
              <span>💬 {post.num_comments}</span>
            </div>

            <h1 className="font-serif text-2xl font-semibold leading-snug mb-0 text-text-primary">
              <a
                href={`https://reddit.com${post.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                {post.title}
              </a>
            </h1>

            {post.is_self && post.self_text && (
              <div className="font-serif text-[15px] leading-relaxed text-text-secondary p-4 bg-bg-tertiary rounded-lg mt-4 whitespace-pre-wrap break-words">
                {post.self_text}
              </div>
            )}

            {!post.is_self && post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-400 bg-blue-500/10 p-3 rounded-lg mt-4 break-all hover:bg-blue-500/20 transition-colors"
              >
                {post.url}
              </a>
            )}
          </div>

          {/* Comments */}
          <SectionTitle count={comments?.length || 0}>Comments</SectionTitle>

          <div className="mt-2">
            {(!comments || comments.length === 0) ? (
              <EmptyState
                icon={MessageSquare}
                title="No comments archived"
                description="This thread has no archived comments"
              />
            ) : (
              comments.map((comment) => (
                <CommentNode key={comment.id} comment={comment} depth={0} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
