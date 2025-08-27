import { useState, useEffect } from "react";
import { useUser } from "./use-user";
import { queryClient } from "../../../client/src/lib/queryClient";
// import { getGCloudAuthService } from "../lib/gcloudAuth";
import { apiClient } from "../lib/apiClient";

// Temporary fallback for build issues
const getGCloudAuthService = () => null;

export function useAuth() {
  const { user, isLoading: loading, refetch } = useUser();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [gcloudAuthInitialized, setGcloudAuthInitialized] = useState(false);

  // Initialize Google Cloud authentication on mount
  useEffect(() => {
    const initGCloudAuth = async () => {
      try {
        const gcloudAuth: any = getGCloudAuthService();
        if (gcloudAuth && typeof gcloudAuth.initialize === 'function') {
          await gcloudAuth.initialize();
          setGcloudAuthInitialized(true);
          console.log('Google Cloud authentication initialized');
        }
      } catch (error) {
        console.warn('Google Cloud authentication initialization failed:', error);
      }
    };

    initGCloudAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsSigningIn(true);
    try {
      // Try using the enhanced API client that handles both auth methods
      const response = await apiClient.post("/api/auth/signin", { email, password });

      // Refetch user data and invalidate queries
      await refetch();
      await queryClient.invalidateQueries();
      
      // Navigate to dashboard after successful login
      window.location.href = "/";
      
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || "Failed to sign in" } };
    } finally {
      setIsSigningIn(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      await apiClient.post("/api/auth/signup", { email, password, name });
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || "Failed to sign up" } };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.post("/api/auth/signout");
      
      // Clear Google Cloud auth token
      const gcloudAuth: any = getGCloudAuthService();
      if (gcloudAuth && typeof gcloudAuth.clearToken === 'function') {
        gcloudAuth.clearToken();
      }
      
      // Clear all queries and redirect to auth page
      queryClient.clear();
      window.location.href = "/auth";
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return {
    user,
    loading: loading || isSigningIn,
    signIn,
    signUp,
    signOut,
    gcloudAuthInitialized,
  };
}