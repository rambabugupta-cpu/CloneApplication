import { useAuth } from './useAuth';

export const useUserRole = () => {
  const { role, loading } = useAuth();

  return { 
    role, 
    loading, 
    isAdmin: role === 'admin', 
    isEmployee: role === 'employee' 
  };
};