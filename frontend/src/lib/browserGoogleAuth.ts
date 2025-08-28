// Browser-compatible Google Authentication Service
// Uses modern Google Identity Services

export class BrowserGoogleAuth {
  private static instance: BrowserGoogleAuth | null = null;
  private initializationPromise: Promise<void> | null = null;
  private google: any = null;
  private codeClient: any = null;
  private onSignInSuccess: (() => void) | null = null;
  private onSignInFailure: ((error: Error) => void) | null = null;

  private constructor() {}

  static getInstance(): BrowserGoogleAuth {
    if (!BrowserGoogleAuth.instance) {
      BrowserGoogleAuth.instance = new BrowserGoogleAuth();
    }
    return BrowserGoogleAuth.instance;
  }

  initialize(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this._initialize();
    }
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      await this.loadGoogleAPI();

      this.codeClient = this.google.accounts.oauth2.initCodeClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/cloud-platform openid email profile',
        ux_mode: 'popup',
        callback: this.handleAuthCode.bind(this),
      });

      console.log('Browser Google auth initialized with code flow.');
    } catch (error) {
      console.warn('Failed to initialize browser Google auth:', error);
      this.initializationPromise = null; // Allow retry
      throw error;
    }
  }

  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google) {
        this.google = window.google;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.google = window.google;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  private async handleAuthCode(response: any) {
    if (response.error) {
      const error = new Error(response.error_description || 'Authorization failed');
      console.error('Auth code error:', response.error);
      if (this.onSignInFailure) {
        this.onSignInFailure(error);
      }
      return;
    }

    try {
      const authCode = response.code;

      // Send the authorization code to your backend
      const backendResponse = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ authCode }), // Sending authCode instead of idToken
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.error || 'Backend authentication failed');
      }

      const data = await backendResponse.json();
      console.log('Backend authentication successful:', data);
      if (this.onSignInSuccess) {
        this.onSignInSuccess();
      }
    } catch (error: any) {
      console.error('Backend authentication failed:', error);
      if (this.onSignInFailure) {
        this.onSignInFailure(error);
      }
    }
  }

  async signIn(): Promise<void> {
    await this.initialize();
    return new Promise<void>((resolve, reject) => {
      this.onSignInSuccess = () => {
        this.onSignInSuccess = null;
        this.onSignInFailure = null;
        resolve();
      };
      this.onSignInFailure = (error: Error) => {
        this.onSignInSuccess = null;
        this.onSignInFailure = null;
        reject(error);
      };
      this.codeClient.requestCode();
    });
  }

  signOut(): void {
    // With the code flow, sign-out is primarily managed on the backend by invalidating the session.
    // We can also call `google.accounts.id.disableAutoSelect();` to prevent one-tap from showing up automatically.
    if (this.google) {
      this.google.accounts.id.disableAutoSelect();
    }
    console.log('Client-side sign out initiated. Session invalidation should be handled by the backend.');
  }

  isSignedIn(): boolean {
    // The source of truth for signed-in state is the backend session.
    // This method is not reliable on the client-side with the code flow.
    // The application should rely on a session check with the backend (e.g., a /api/me endpoint).
    return false;
  }
}

// Global type declarations
declare global {
  interface Window {
    google: any;
  }
}

export const browserGoogleAuth = BrowserGoogleAuth.getInstance();

