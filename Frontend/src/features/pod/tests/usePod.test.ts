import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { usePod } from "../hooks/usePod"; 
import { podService } from "../services/podService";

// 🌟 MOCK POD SERVICE
vi.mock("../services/podService", () => ({
  podService: {
    getPodVerifications: vi.fn(),
  },
}));

describe("🔥 FEATURE: POD MANAGEMENT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("1. list render - initial state is correct", async () => {
    // Kita mock API gantung biar useEffect ga bikin error duluan
    (podService.getPodVerifications as any).mockReturnValue(new Promise(() => {})); 
    
    const { result } = renderHook(() => usePod());
    
    expect(result.current.orders).toEqual([]);
    expect(result.current.isLoading).toBe(true); // Pas awal render langsung loading karena useEffect
    expect(result.current.error).toBe(null);
    expect(result.current.isFilterOpen).toBe(false);
  });

  test("2. fetch data - get POD list success", async () => {
    const mockData = { data: [{ order_id: "DO-123", customer_name: "Toko A" }] };
    (podService.getPodVerifications as any).mockResolvedValue(mockData);
    
    let resultHook: any;
    await act(async () => {
      const { result } = renderHook(() => usePod());
      resultHook = result;
    });

    expect(podService.getPodVerifications).toHaveBeenCalled();
    expect(resultHook.current.orders.length).toBe(1);
    expect(resultHook.current.orders[0].order_id).toBe("DO-123");
    expect(resultHook.current.isLoading).toBe(false);
  });

  test("3. error handling - API down", async () => {
    (podService.getPodVerifications as any).mockRejectedValue(new Error("Network Error"));
    
    let resultHook: any;
    await act(async () => {
      const { result } = renderHook(() => usePod());
      resultHook = result;
    });

    expect(resultHook.current.error).toBe('Gagal terhubung ke server. Silakan coba lagi.');
    expect(resultHook.current.orders).toEqual([]);
    expect(resultHook.current.isLoading).toBe(false);
  });

  test("4. status update - UI state updates correctly", async () => {
    (podService.getPodVerifications as any).mockResolvedValue({ data: [] });
    
    let resultHook: any;
    await act(async () => {
      const { result } = renderHook(() => usePod());
      resultHook = result;
    });

    act(() => {
      resultHook.current.setOpenActionId("DO-999");
      resultHook.current.setIsFilterOpen(true);
    });

    expect(resultHook.current.openActionId).toBe("DO-999");
    expect(resultHook.current.isFilterOpen).toBe(true);
  });
});