import { useState, useEffect } from "react";
import { useUser } from "./use-user";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { user, isLoading: loading, refetch } = useUser();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signIn = async (email: string, password: string) => {
    setIsSigningIn(true);
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || "Failed to sign in" } };
      }

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
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || "Failed to sign up" } };
      }

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || "Failed to sign up" } };
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
      
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
  };
}