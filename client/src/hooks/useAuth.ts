import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthData {
  user: User;
  profile?: any;
  role?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data: AuthData = await apiRequest('/api/auth/me');
        setUser(data.user);
        setProfile(data.profile);
        setRole(data.role || null);
      } catch (error) {
        // Not authenticated, which is fine
        setUser(null);
        setProfile(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data: AuthData = await apiRequest('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      
      // Fetch full user data after signin
      const fullData: AuthData = await apiRequest('/api/auth/me');
      setProfile(fullData.profile);
      setRole(fullData.role || null);
      
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signOut = async () => {
    try {
      await apiRequest('/api/auth/signout', {
        method: 'POST',
      });
      setUser(null);
      setProfile(null);
      setRole(null);
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  return {
    user,
    profile,
    role,
    session: user ? { user } : null, // Maintain compatibility
    loading,
    signUp,
    signIn,
    signOut
  };
};