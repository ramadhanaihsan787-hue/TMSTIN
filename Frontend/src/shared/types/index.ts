/**
 * Shared types - consolidates types used across all features
 */

export * from './common';
export * from './api';

// Re-export auth types (will be moved here later)
// export * from './auth';

// ============= AUTH CONTEXT TYPE =============
export type { AuthContextType } from '../../context/AuthContext';