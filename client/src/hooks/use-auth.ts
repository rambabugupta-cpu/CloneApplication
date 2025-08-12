
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useMemo } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<{ user: User }>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/auth/signout', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/auth';
    },
    onError: (error) => {
      console.error('Logout error:', error);
    },
  });

  const logout = () => logoutMutation.mutate();

  // Memoize computed values to prevent unnecessary re-renders
  const authData = useMemo(() => ({
    user: user?.user,
    isLoading,
    logout,
    isAuthenticated: !!user?.user,
    error,
  }), [user?.user, isLoading, error]);

  return authData;
};
