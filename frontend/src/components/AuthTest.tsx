import React, { useState, useEffect } from 'react';
import { authManager, type User } from '../lib/authManager';

export const AuthTest: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<string>('Not initialized');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setAuthStatus('Checking authentication...');
        const user = await authManager.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsSignedIn(true);
          setAuthStatus('Already signed in');
        } else {
          setAuthStatus('Ready to sign in');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setAuthStatus(`Error: ${errorMessage}`);
        console.error('Auth check failed:', error);
      }
    };

    checkAuthStatus();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setAuthStatus('Signing in with Google...');
      const result = await authManager.loginWithGoogle();
      setCurrentUser(result.user);
      setIsSignedIn(true);
      setAuthStatus('Google sign in successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAuthStatus(`Google sign in failed: ${errorMessage}`);
    }
  };

  const handleEmailSignIn = async () => {
    const email = prompt('Enter email:');
    const password = prompt('Enter password:');
    
    if (!email || !password) return;
    
    try {
      setAuthStatus('Signing in with email...');
      const result = await authManager.loginWithEmail(email, password);
      setCurrentUser(result.user);
      setIsSignedIn(true);
      setAuthStatus('Email sign in successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAuthStatus(`Email sign in failed: ${errorMessage}`);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthStatus('Signing out...');
      await authManager.logout();
      setCurrentUser(null);
      setIsSignedIn(false);
      setAuthStatus('Signed out');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAuthStatus(`Sign out failed: ${errorMessage}`);
    }
  };

  const testApiCall = async () => {
    try {
      setAuthStatus('Testing API call...');
      const response = await authManager.makeAuthenticatedRequest(
        `${import.meta.env.VITE_API_BASE}/api/dashboard/stats`
      );
      
      if (response.ok) {
        const result = await response.json();
        setAuthStatus(`API call successful: ${JSON.stringify(result).substring(0, 100)}...`);
      } else {
        setAuthStatus(`API call failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAuthStatus(`API call failed: ${errorMessage}`);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Authentication Test</h2>
      
      <div className="mb-4">
        <strong>Status:</strong> {authStatus}
      </div>
      
      <div className="mb-4">
        <strong>Signed In:</strong> {isSignedIn ? 'Yes' : 'No'}
      </div>
      
      {currentUser && (
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <strong>User:</strong><br />
          Email: {currentUser.email}<br />
          Name: {currentUser.fullName}<br />
          Role: {currentUser.role}
        </div>
      )}
      
      <div className="space-y-2">
        {!isSignedIn ? (
          <>
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Sign In with Google
            </button>
            <button
              onClick={handleEmailSignIn}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Sign In with Email
            </button>
          </>
        ) : (
          <button
            onClick={handleSignOut}
            className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        )}
        
        {isSignedIn && (
          <button
            onClick={testApiCall}
            className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Test API Call
          </button>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Client ID: {import.meta.env.VITE_GOOGLE_CLIENT_ID?.slice(0, 20)}...</p>
        <p>Backend: {import.meta.env.VITE_API_BASE}</p>
      </div>
    </div>
  );
};
