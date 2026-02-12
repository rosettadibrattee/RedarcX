import { useState } from 'react';
import { timeAgo } from '../utils/format';

const DEPTH_COLORS = [
  'border-l-accent',
  'border-l-blue-500',
  'border-l-green-500',
  'border-l-yellow-400',
  'border-l-purple-500',
  'border-l-pink-500',
];

export default function CommentNode({ comment, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const colorClass = DEPTH_COLORS[depth % DEPTH_COLORS.length];
  const replyCount = comment.replies?.length || 0;

  return (
    <div>
      <div
        className={`pl-4 py-3 border-l-2 transition-colors ${
          collapsed ? 'border-l-border opacity-60' : colorClass
        }`}
      >
        {/* Header */}
        <div
          className="flex gap-2.5 items-center text-[11px] mb-1.5 cursor-pointer flex-wrap"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="text-accent font-semibold">
            {comment.author || 'anonymous'}
          </span>
          <span className="text-text-tertiary">
            <span className="text-accent">▲</span> {comment.score ?? 0}
          </span>
          {comment.gilded > 0 && (
            <span className="text-yellow-400">★ {comment.gilded}</span>
          )}
          <span className="text-text-tertiary">
            {timeAgo(comment.created_utc)}
          </span>
          {replyCount > 0 && (
            <span className="text-text-tertiary">
              [{collapsed ? '+' : '−'} {replyCount}]
            </span>
          )}
        </div>

        {/* Body */}
        {!collapsed && (
          <div className="font-serif text-sm leading-relaxed text-text-secondary break-words whitespace-pre-wrap">
            {comment.body}
          </div>
        )}
      </div>

      {/* Replies */}
      {!collapsed && replyCount > 0 && (
        <div className="ml-5 mt-1">
          {comment.replies.map((reply) => (
            <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
