import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

/**
 * useAuth Hook
 * Custom hook for accessing authentication context
 * Simplifies auth logic usage across components
 *
 * @returns {AuthContextType} Authentication context with user, token, and auth methods
 * @throws {Error} If used outside AuthProvider
 *
 * @example
 * const { user, token, login, logout, isAuthenticated } = useAuth();
 */
export const useAuth = (): any => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider. " +
      "Make sure your component is wrapped with <AuthProvider>"
    );
  }

  return context;
};

/**
 * Convenience hook to check if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};

/**
 * Convenience hook to get current user
 */
export const useUser = () => {
  const { user } = useAuth();
  return user;
};

/**
 * Convenience hook to get current user role
 */
export const useUserRole = () => {
  const { user } = useAuth();
  return user?.role;
};

/**
 * Convenience hook to check if user has a specific role
 */
export const useHasRole = (requiredRole: string | string[]) => {
  const { user } = useAuth();
  if (!user) return false;

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }

  return user.role === requiredRole;
};

/**
 * Convenience hook to get auth token
 */
export const useToken = () => {
  const { token } = useAuth();
  return token;
};

/**
 * Convenience hook to check loading state
 */
export const useAuthLoading = () => {
  const { loading } = useAuth();
  return loading;
};

/**
 * Convenience hook to check error state
 */
export const useAuthError = () => {
  const { error } = useAuth();
  return error;
};
