import React, { useState, useEffect } from 'react';
import AuthTestService, { AuthTestResult } from '../lib/authTestService';
import { apiClient } from '../lib/apiClient';

const AuthTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<AuthTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string>('Unknown');
  const [initResult, setInitResult] = useState<any>(null);

  const runAuthTests = async () => {
    setIsLoading(true);
    try {
      const results = await AuthTestService.testAuthentication();
      setTestResults(results);
    } catch (error) {
      console.error('Auth tests failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeAuth = async () => {
    setIsLoading(true);
    try {
      const result = await AuthTestService.initialize();
      setInitResult(result);
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBackendHealth = async () => {
    try {
      const response = await apiClient.healthCheck();
      setBackendStatus('✅ Backend is accessible');
      console.log('Backend health check response:', response);
    } catch (error) {
      setBackendStatus(`❌ Backend error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Backend health check failed:', error);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Dashboard</h1>
      
      {/* Backend Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Backend Status</h2>
        <p className="text-lg">{backendStatus}</p>
        <button 
          onClick={checkBackendHealth}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Backend Status
        </button>
      </div>

      {/* Authentication Tests */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Authentication Tests</h2>
        <div className="space-x-4 mb-4">
          <button 
            onClick={runAuthTests}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Run Auth Tests'}
          </button>
          <button 
            onClick={initializeAuth}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {isLoading ? 'Initializing...' : 'Initialize Authentication'}
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Test Results:</h3>
            {testResults.map((result, index) => (
              <div 
                key={index}
                className={`p-3 rounded border-l-4 ${
                  result.success 
                    ? 'bg-green-50 border-green-500 text-green-800' 
                    : 'bg-red-50 border-red-500 text-red-800'
                }`}
              >
                <div className="font-medium">
                  {result.method === 'regular' ? 'Regular Authentication' : 'Google Cloud Authentication'}
                  {result.success ? ' ✅' : ' ❌'}
                </div>
                {result.error && (
                  <div className="text-sm mt-1">Error: {result.error}</div>
                )}
                {result.response && (
                  <div className="text-sm mt-1">
                    Response: {JSON.stringify(result.response, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Initialization Result */}
        {initResult && (
          <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500">
            <div className="font-medium">Authentication Initialization Result:</div>
            <div className="text-sm mt-1">
              Recommended method: <strong>{initResult.method}</strong>
            </div>
            {initResult.error && (
              <div className="text-sm mt-1 text-red-600">
                Error: {initResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-500">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Instructions:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>1. First, check if the backend is accessible</li>
          <li>2. Run authentication tests to see which method works</li>
          <li>3. Initialize authentication with the recommended method</li>
          <li>4. If Google Cloud auth is needed, ensure you have proper credentials set up</li>
        </ul>
      </div>

      {/* Current Configuration */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="text-lg font-medium mb-2">Current Configuration:</h3>
        <div className="text-sm space-y-1">
          <div><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'https://tally-backend-ka4xatti3a-em.a.run.app'}</div>
          <div><strong>Environment:</strong> {import.meta.env.MODE || 'development'}</div>
          <div><strong>Google Cloud Project:</strong> {import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID || 'Not configured'}</div>
        </div>
      </div>
    </div>
  );
};

export default AuthTestPage;
