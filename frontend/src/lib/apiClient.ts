// Enhanced API Client with Google Cloud Authentication Support
import { browserGoogleAuth } from './browserGoogleAuth';

// Temporary fallback for build issues - replaced with browser auth
const getGCloudAuthService = () => browserGoogleAuth;

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE || 
  import.meta.env.VITE_API_URL || 
  'https://tally-backend-ka4xatti3a-em.a.run.app';

export interface ApiRequestOptions extends RequestInit {
  useGCloudAuth?: boolean;
  timeout?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  private async makeRequest(url: string, options: ApiRequestOptions = {}): Promise<Response> {
    const { useGCloudAuth = false, timeout = 10000, ...fetchOptions } = options;
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let response: Response;

      if (useGCloudAuth) {
        // Use Google Cloud authentication
        const gcloudAuth = getGCloudAuthService();
        if (!gcloudAuth || typeof gcloudAuth.makeAuthenticatedRequest !== 'function') {
          throw new Error('Google Cloud authentication not available');
        }
        
        response = await gcloudAuth.makeAuthenticatedRequest(fullUrl, {
          ...fetchOptions,
          signal: controller.signal,
        });
      } else {
        // Use regular authentication (cookies/sessions)
        response = await fetch(fullUrl, {
          ...fetchOptions,
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        });
      }

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async request<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
    try {
      // First, try with regular authentication
      let response = await this.makeRequest(url, { ...options, useGCloudAuth: false });
      
      // If we get 401/403, try with Google Cloud authentication
      if ((response.status === 401 || response.status === 403) && !options.useGCloudAuth) {
        console.log('Regular auth failed, trying Google Cloud auth...');
        response = await this.makeRequest(url, { ...options, useGCloudAuth: true });
      }

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
