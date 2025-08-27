import { QueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../frontend/src/lib/apiClient";

// Export the enhanced API client for backward compatibility
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  return apiClient.request(url, options);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
        if (typeof url !== 'string') {
          throw new Error('Invalid query key: must be a string');
        }
        return apiClient.get(url);
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error instanceof Error && 
            (error.message.includes('401') || error.message.includes('403'))) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});