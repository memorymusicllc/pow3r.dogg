import { useEffect } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/auth-store';

export default function AuthBanner() {
  const { authError, pow3rPassUrl, checkAuth, setAuthError } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!authError) {
    return null;
  }

  return (
    <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-6">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-400 mb-1">
            Authentication Required
          </h3>
          <p className="text-sm text-yellow-300 mb-2">
            {authError}
          </p>
          <div className="mt-2">
            <a
              href={pow3rPassUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-yellow-400 hover:text-yellow-300 underline"
            >
              Authenticate via Pow3r Pass →
            </a>
          </div>
          <p className="text-xs text-yellow-400/80 mt-2">
            After authenticating, refresh this page or set your token in localStorage as <code className="bg-yellow-900/30 px-1 rounded">pow3r-auth-token</code>
          </p>
        </div>
        <button
          onClick={() => setAuthError(null)}
          className="ml-4 text-yellow-400 hover:text-yellow-300"
          aria-label="Dismiss"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

