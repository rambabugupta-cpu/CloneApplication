import { QueryClient } from "@tanstack/react-query";
import { apiClient } from "./apiClient";

// Centralized API request utility using the same ApiClient (ensures same base URL & credentials)
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body as any | undefined;

  if (method === 'GET') return apiClient.get(url, { headers: options.headers as any });
  if (method === 'POST') return apiClient.post(url, body ? JSON.parse(String(body)) : undefined, { headers: options.headers as any });
  if (method === 'PUT') return apiClient.put(url, body ? JSON.parse(String(body)) : undefined, { headers: options.headers as any });
  if (method === 'DELETE') return apiClient.delete(url, { headers: options.headers as any });
  // Fallback to generic request
  return apiClient.request(url, options as any);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
        if (typeof url !== 'string') {
          throw new Error('Invalid query key: must be a string');
        }
  return apiRequest(url);
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
  },
});