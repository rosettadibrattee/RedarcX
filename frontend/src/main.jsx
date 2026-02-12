import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useLocation,
} from 'react-router-dom';
import './index.css';

import Header from './components/Header';
import Footer from './components/Footer';
import IndexPage from './pages/Index';
import SubredditPage from './pages/Subreddit';
import ThreadPage from './pages/Thread';
import SearchPage from './pages/Search';
import UploadPage from './pages/Upload';
import AdminPage from './pages/Admin';
import NotFoundPage from './pages/NotFound';

function Layout() {
  const [filterQuery, setFilterQuery] = useState('');
  const location = useLocation();
  const isIndex = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        showFilter={isIndex}
        filterValue={filterQuery}
        onFilterChange={setFilterQuery}
      />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        {isIndex ? (
          <IndexPage filterQuery={filterQuery} />
        ) : (
          <Outlet />
        )}
      </main>
      <Footer />
    </div>
  );
}

function ErrorBoundary() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header showFilter={false} />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="text-center py-20">
          <h1 className="text-2xl font-serif font-semibold text-text-primary mb-2">Something went wrong</h1>
          <p className="text-sm text-text-tertiary mb-6">An unexpected error occurred. Please try refreshing the page.</p>
          <a href="/" className="px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-accent text-white hover:bg-accent-hover transition-all inline-block">
            Back to Index
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: 'r/:subreddit',
        element: <SubredditPage />,
      },
      {
        path: 'r/:subreddit/comments/:threadID',
        element: <ThreadPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'upload',
        element: <UploadPage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
      {
        // Legacy route compatibility
        path: 'submit',
        element: <UploadPage />,
      },
      {
        path: 'progress',
        element: <AdminPage />,
      },
      {
        path: 'query',
        element: <SearchPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
