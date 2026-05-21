import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import type { AuthContextType } from "../types";

/**
 * useAuth Hook — akses authentication context
 * AuthContextType asli: { role, user, token, login, logout }
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider. " +
      "Make sure your component is wrapped with <AuthProvider>"
    );
  }

  return context;
};

export const useIsAuthenticated = (): boolean => {
  const { token } = useAuth();
  return token !== null; // isAuthenticated = ada token
};

export const useUser = () => {
  const { user } = useAuth();
  return user;
};

export const useUserRole = () => {
  const { role } = useAuth();
  return role;
};

export const useHasRole = (requiredRole: string | string[]) => {
  const { role } = useAuth();
  if (!role) return false;

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(role);
  }

  return role === requiredRole;
};

export const useToken = () => {
  const { token } = useAuth();
  return token ?? ''; // token bisa null, return string kosong kalau null
};

// loading dan error tidak ada di AuthContextType asli — return default value
export const useAuthLoading = (): boolean => {
  return false; // AuthContext tidak punya loading state
};

export const useAuthError = (): string | null => {
  return null; // AuthContext tidak punya error state
};