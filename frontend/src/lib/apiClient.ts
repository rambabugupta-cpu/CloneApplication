// Enhanced API Client with Session-based Authentication
// Simplified version without Google Cloud Auth dependencies

// API configuration
function resolveBaseUrl(): string {
  // Prefer relative requests on Firebase Hosting to avoid third‑party cookies
  if (typeof window !== 'undefined') {
    const host = window.location.host || '';
    const isFirebaseHosting = host.endsWith('.web.app') || host.endsWith('.firebaseapp.com');
    const forceAbsolute = (import.meta as any)?.env?.VITE_API_FORCE_ABSOLUTE === 'true';
    if (isFirebaseHosting && !forceAbsolute) {
      return '';
    }
  }
  // Fall back to env-provided absolute URL (useful for local dev or non-hosted usage)
  return (import.meta as any).env.VITE_API_BASE || (import.meta as any).env.VITE_API_URL || '';
}

const API_BASE_URL = resolveBaseUrl();

export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  private async makeRequest(url: string, options: ApiRequestOptions = {}): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;
  const fullUrl = `${this.baseUrl}${url}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
  // Use session-based authentication with cookies
      const response = await fetch(fullUrl, {
        ...fetchOptions,
        credentials: 'include', // Include cookies for session authentication
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  async request<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
    try {
      const response = await this.makeRequest(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP ${response.status}: ${response.statusText}` 
        }));
        throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as T;
      }
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  // Convenience methods
  async get<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  async post<T = any>(url: string, data?: any, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(url: string, data?: any, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      return await this.get('/api/health');
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Legacy function for backward compatibility
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  return apiClient.request(url, options);
};

export default ApiClient;
