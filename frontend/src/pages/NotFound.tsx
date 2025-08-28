import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white text-black">
      <div className="text-center p-8 max-w-lg w-full border border-gray-200 rounded-lg shadow-sm">
        <h1 className="text-7xl font-extrabold text-black">404</h1>
        <h2 className="mt-4 text-3xl font-semibold text-gray-900">
          Oops — Page not found
        </h2>
        <p className="mt-4 text-base text-gray-700">
          The page you are trying to reach doesn't exist or has been moved.
        </p>
        <p className="mt-3 text-sm text-gray-600 break-words">
          Attempted path: <code className="p-1 bg-gray-100 rounded">{location.pathname}</code>
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Return to Home
          </Link>
          <a
            href="mailto:support@example.com"
            className="inline-flex items-center px-6 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
