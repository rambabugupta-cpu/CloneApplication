// Browser-compatible Google Authentication Service
// This replaces the server-side Google Cloud authentication

export class BrowserGoogleAuth {
  private static instance: BrowserGoogleAuth | null = null;
  private isInitialized = false;
  private gapi: any = null;
  private accessToken: string | null = null;

  private constructor() {}

  static getInstance(): BrowserGoogleAuth {
    if (!BrowserGoogleAuth.instance) {
      BrowserGoogleAuth.instance = new BrowserGoogleAuth();
    }
    return BrowserGoogleAuth.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load Google API
      await this.loadGoogleAPI();
      
      // Initialize gapi
      await new Promise((resolve, reject) => {
        this.gapi.load('auth2', {
          callback: () => {
            this.gapi.auth2.init({
              client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-client-id.googleusercontent.com',
              scope: 'https://www.googleapis.com/auth/cloud-platform'
            }).then(resolve, reject);
          },
          onerror: reject
        });
      });

      this.isInitialized = true;
      console.log('Browser Google auth initialized');
    } catch (error) {
      console.warn('Failed to initialize browser Google auth:', error);
      throw error;
    }
  }

  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        this.gapi = window.gapi;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        this.gapi = window.gapi;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      const authResponse = user.getAuthResponse();
      
      this.accessToken = authResponse.access_token;
      const idToken = authResponse.id_token;
      
      // Send the ID token to your backend for verification and session creation
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for session cookies
        body: JSON.stringify({ idToken }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Backend authentication failed');
      }
      
      const data = await response.json();
      console.log('Backend authentication successful:', data);
      
      return this.accessToken!;
    } catch (error) {
      console.error('Sign-in failed:', error);
      throw error;
    }
  }

  async getAccessToken(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const authInstance = this.gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
      return await this.signIn();
    }

    const user = authInstance.currentUser.get();
    const authResponse = user.getAuthResponse();
    
    // Check if token is expired
    if (authResponse.expires_at < Date.now()) {
      await user.reloadAuthResponse();
      const newAuthResponse = user.getAuthResponse();
      this.accessToken = newAuthResponse.access_token;
    } else {
      this.accessToken = authResponse.access_token;
    }

    return this.accessToken!;
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    
    const authenticatedOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    return fetch(url, authenticatedOptions);
  }

  signOut(): void {
    if (this.isInitialized && this.gapi?.auth2) {
      const authInstance = this.gapi.auth2.getAuthInstance();
      authInstance.signOut();
    }
    this.accessToken = null;
  }

  isSignedIn(): boolean {
    if (!this.isInitialized || !this.gapi?.auth2) {
      return false;
    }
    const authInstance = this.gapi.auth2.getAuthInstance();
    return authInstance.isSignedIn.get();
  }
}

// Global type declarations
declare global {
  interface Window {
    gapi: any;
  }
}

export const browserGoogleAuth = BrowserGoogleAuth.getInstance();
