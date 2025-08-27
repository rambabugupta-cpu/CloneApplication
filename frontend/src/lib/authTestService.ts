// Authentication service for testing both regular and Google Cloud auth
import { apiClient } from './apiClient';
// import { getGCloudAuthService } from './gcloudAuth';

// Temporary fallback for build issues
const getGCloudAuthService = () => null;

export interface AuthTestResult {
  method: 'regular' | 'gcloud';
  success: boolean;
  error?: string;
  response?: any;
}

export class AuthTestService {
  /**
   * Test authentication methods to determine which one works
   */
  static async testAuthentication(): Promise<AuthTestResult[]> {
    const results: AuthTestResult[] = [];

    // Test 1: Regular authentication (cookies/sessions)
    console.log('Testing regular authentication...');
    try {
      const response = await apiClient.get('/api/health', { useGCloudAuth: false });
      results.push({
        method: 'regular',
        success: true,
        response,
      });
    } catch (error) {
      results.push({
        method: 'regular',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 2: Google Cloud authentication
    console.log('Testing Google Cloud authentication...');
    try {
      const gcloudAuth: any = getGCloudAuthService();
      if (!gcloudAuth || typeof gcloudAuth.initialize !== 'function') {
        throw new Error('Google Cloud authentication service not available');
      }

      await gcloudAuth.initialize();
      const response = await apiClient.get('/api/health', { useGCloudAuth: true });
      
      results.push({
        method: 'gcloud',
        success: true,
        response,
      });
    } catch (error) {
      results.push({
        method: 'gcloud',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return results;
  }

  /**
   * Get the recommended authentication method based on test results
   */
  static getRecommendedAuthMethod(results: AuthTestResult[]): 'regular' | 'gcloud' | 'none' {
    const regularAuth = results.find(r => r.method === 'regular');
    const gcloudAuth = results.find(r => r.method === 'gcloud');

    if (regularAuth?.success) {
      return 'regular';
    } else if (gcloudAuth?.success) {
      return 'gcloud';
    } else {
      return 'none';
    }
  }

  /**
   * Initialize the authentication system
   */
  static async initialize(): Promise<{
    method: 'regular' | 'gcloud' | 'none';
    error?: string;
  }> {
    try {
      const results = await this.testAuthentication();
      const recommendedMethod = this.getRecommendedAuthMethod(results);
      
      console.log('Authentication test results:', results);
      console.log('Recommended authentication method:', recommendedMethod);

      if (recommendedMethod === 'gcloud') {
        // Initialize Google Cloud auth for future use
        const gcloudAuth: any = getGCloudAuthService();
        if (gcloudAuth && typeof gcloudAuth.initialize === 'function') {
          await gcloudAuth.initialize();
        }
      }

      return { method: recommendedMethod };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication initialization failed';
      console.error('Authentication initialization error:', errorMessage);
      return { method: 'none', error: errorMessage };
    }
  }
}

export default AuthTestService;
