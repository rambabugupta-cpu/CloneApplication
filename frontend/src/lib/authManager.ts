import { BrowserGoogleAuth } from './browserGoogleAuth';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'admin' | 'staff' | 'customer';
}

export interface AuthResponse {
  user: User;
  message: string;
}

export class AuthManager {
  private static instance: AuthManager | null = null;
  private currentUser: User | null = null;
  private googleAuth: BrowserGoogleAuth;

  private constructor() {
    this.googleAuth = BrowserGoogleAuth.getInstance();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  async loginWithGoogle(): Promise<AuthResponse> {
    try {
      await this.googleAuth.signIn();
      
      // Get current user info from backend
      const userResponse = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/me`, {
        credentials: 'include',
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user info after Google login');
      }
      
      const userData = await userResponse.json();
      this.currentUser = userData;
      
      return {
        user: userData,
        message: 'Google login successful'
      };
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  }

  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      this.currentUser = data.user;
      return data;
    } catch (error) {
      console.error('Email login failed:', error);
      throw error;
    }
  }

  async register(email: string, password: string, fullName: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, fullName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Logout from backend
      await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/signout`, {
        method: 'POST',
        credentials: 'include',
      });

      // Logout from Google if signed in
      try {
        await this.googleAuth.signOut();
      } catch (error) {
        console.warn('Google signout failed:', error);
      }

      this.currentUser = null;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/me`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const userData = await response.json();
      this.currentUser = userData;
      return userData;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, requestOptions);
    
    // If unauthorized, try Google Cloud authentication as fallback
    if (response.status === 401 || response.status === 403) {
      try {
        return await this.googleAuth.makeAuthenticatedRequest(url, options);
      } catch (error) {
        console.warn('Fallback Google Cloud auth failed:', error);
        throw new Error('Authentication required');
      }
    }

    return response;
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  getUserRole(): string | null {
    return this.currentUser?.role || null;
  }
}

export const authManager = AuthManager.getInstance();
