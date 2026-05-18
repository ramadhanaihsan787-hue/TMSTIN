import { renderHook, act } from '@testing-library/react';
import { useRouteOptimization } from '../hooks/useRouteOptimization';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock("shared/services/apiClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from "shared/services/apiClient";

describe('VRP API Failures (Server / Jaringan Down)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('🚨 1. Harus handle Error 500 (Internal Server Error)', async () => {
        // Mocking error nembak API
        (api.post as any).mockRejectedValue(new Error('Terjadi kesalahan internal pada server'));

        const { result } = renderHook(() => useRouteOptimization());
        let errorCatched: any;

        await act(async () => {
            try {
                // FIX: Panggil TANPA argumen
                await result.current.runAIOptimization();
            } catch (err) {
                errorCatched = err;
            }
        });

        // FIX: Cek state isOptimizing lu yang asli
        expect(result.current.isOptimizing).toBe(false);
        expect(errorCatched).toBeDefined();
        expect(errorCatched.message).toContain('Terjadi kesalahan internal'); 
    });

    it('🚨 2. Harus handle Network Error (Internet Mati)', async () => {
        (api.post as any).mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useRouteOptimization());
        let errorCatched: any;

        await act(async () => {
            try {
                await result.current.runAIOptimization();
            } catch (err) {
                errorCatched = err;
            }
        });

        expect(result.current.isOptimizing).toBe(false);
        expect(errorCatched).toBeDefined();
        expect(errorCatched.message).toBe('Network Error');
    });
});