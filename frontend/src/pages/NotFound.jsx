import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { EmptyState } from '../components/UI';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="py-20">
      <EmptyState
        icon={Search}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved"
      />
      <div className="text-center mt-6">
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-accent text-white hover:bg-accent-hover transition-all"
        >
          Back to Index
        </button>
      </div>
    </div>
  );
}
