
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useMemo } from 'react';

interface User {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  role?: string;
}

export const useAuth = () => {
  const queryClient = useQueryClient();

  // /api/auth/me returns the user object directly (flattened)
  const { data: currentUser, isLoading, error } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
    user: currentUser ? {
      ...currentUser,
      name: currentUser.fullName || currentUser.name
    } : null,
    isLoading,
    logout,
    isAuthenticated: !!currentUser,
    error,
  }), [currentUser, isLoading, error]);

  return authData;
};
