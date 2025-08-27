// Google Cloud Authentication Service
// This is a frontend-safe version that checks for environment availability

let GoogleAuth: any;

// Dynamically import google-auth-library only if available
try {
  if (typeof window === 'undefined') {
    // Server-side or Node.js environment
    GoogleAuth = require('google-auth-library').GoogleAuth;
  } else {
    // Browser environment - Google Cloud auth not available
    console.warn('Google Cloud authentication not available in browser environment');
  }
} catch (error) {
  console.warn('google-auth-library not available:', error);
}

export interface GCloudAuthConfig {
  projectId: string;
  clientEmail?: string;
  privateKey?: string;
  keyFile?: string;
}

export class GCloudAuthService {
  private googleAuth: any = null;
  private cachedToken: string | null = null;
  private tokenExpiry: number | null = null;
  private static instance: GCloudAuthService | null = null;

  private constructor() {}

  static getInstance(): GCloudAuthService {
    if (!GCloudAuthService.instance) {
      GCloudAuthService.instance = new GCloudAuthService();
    }
    return GCloudAuthService.instance;
  }

  async initialize(): Promise<void> {
    if (this.googleAuth) {
      return; // Already initialized
    }

    if (!GoogleAuth) {
      throw new Error('Google Cloud authentication not available in this environment');
    }

    try {
      this.googleAuth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      
      // Test the authentication by getting a token
      await this.getToken();
      console.log('Google Cloud authentication initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Cloud authentication:', error);
      throw error;
    }
  }

  private async getToken(): Promise<string> {
    // Return cached token if it's still valid
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    if (!this.googleAuth) {
      throw new Error('Google Auth not initialized');
    }

    try {
      const client = await this.googleAuth.getClient();
      const tokenResponse = await client.getAccessToken();
      
      if (!tokenResponse.token) {
        throw new Error('Failed to get access token');
      }

      this.cachedToken = tokenResponse.token;
      // Set expiry to 50 minutes from now (tokens usually last 1 hour)
      this.tokenExpiry = Date.now() + (50 * 60 * 1000);
      
      return tokenResponse.token;
    } catch (error) {
      console.error('Error getting Google Cloud token:', error);
      throw error;
    }
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    
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

  clearToken(): void {
    this.cachedToken = null;
    this.tokenExpiry = null;
  }
}

// Singleton access
let authService: GCloudAuthService | null = null;

export function getGCloudAuthService(): GCloudAuthService | null {
  if (!authService) {
    authService = GCloudAuthService.getInstance();
  }
  return authService;
}

export default GCloudAuthService;
