import { QueryClient } from "@tanstack/react-query";

// API request utility with authentication
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  console.log(`Making API request to ${url}`, { options });
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for session
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  console.log(`Response from ${url}:`, {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    console.error(`Error from ${url}:`, error);
    throw new Error(error.error || 'Request failed');
  }

  const data = await response.json();
  console.log(`Data from ${url}:`, data);
  return data;
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