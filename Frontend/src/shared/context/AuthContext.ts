// Re-export AuthContext dari lokasi asli (src/context/AuthContext.tsx)
// Dibutuhkan oleh shared/hooks/useAuth.ts yang import dari '../context/AuthContext'
export { AuthContext, AuthProvider } from '../../context/AuthContext';