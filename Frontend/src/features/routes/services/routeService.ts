// src/features/routes/services/routeService.ts
import { api } from "../../../shared/services/apiClient"; 

export const routeService = {
  // 1. GET ROUTES
  fetchRoutes: async (date: string) => {
    const res = await api.get(`/api/routes?date=${date}`);
    return res.data;
  },

  // 2. UPLOAD EXCEL
  uploadExcel: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post(`/api/orders/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },

  // 3. UPDATE TIME
  updateTimeWindow: async (orderId: string, newTime: string) => {
    const res = await api.put(`/api/orders/${orderId}/time`, {
      jam_maksimal: newTime,
    });

    return res.data;
  },

  // 4. SAVE COORDINATE
  saveCoordinate: async (
    idx: number,
    customerCode: string,
    storeName: string,
    lat: number,
    lon: number
  ) => {
    const payload = {
      latitude: lat,
      longitude: lon,
      kode_customer: customerCode,
      nama_customer: storeName,
    };
    const res = await api.put(`/api/orders/DRAFT-${idx}/coordinate`, payload);
    return res.data;
  },

  // 5. OPTIMIZE ROUTE (VRP START)
  optimizeRoute: async (preview: boolean = true) => {
    const res = await api.post(`/api/routes/optimize/start?preview=${preview}`);
    return res.data;
  },
  
  // 5b. GET VRP STATUS
  getOptimizationStatus: async (jobId: string) => {
      const res = await api.get(`/api/routes/optimize/status/${jobId}`);
      return res.data;
  },

  // 6. CONFIRM ROUTE
  confirmRoute: async (previewData: any) => {
    const res = await api.post(`/api/routes/confirm`, previewData);
    return res.data;
  },

  // 7. SPRINT 3: SPATIAL PREVIEW (ZONING)
  getSpatialPreview: async (preview: boolean = true) => {
      const res = await api.post(`/api/routes/spatial-preview?preview=${preview}`);
      return res.data;
  },

  // 8. SPRINT 4: TRAFFIC VALIDATION (START & STATUS)
  validateTraffic: async (jobId: string) => {
      const res = await api.post(`/api/routes/validate-traffic/${jobId}`);
      return res.data;
  },

  getTrafficValidationStatus: async (jobId: string) => {
      const res = await api.get(`/api/routes/validate-traffic/${jobId}/status`);
      return res.data;
  },

  // 9. RESEQUENCE (TSP MANUAL OVERRIDE)
  resequenceRoute: async (draftData: any) => {
      const res = await api.post('/api/routes/resequence', draftData, { timeout: 120000 });
      return res.data;
  },

  // 🌟 FIX CTO: Tambahin /api/ biar ngga error 404
  updateWeight: async (orderId: string, weight: number) => {
    const response = await api.put(`/api/orders/${orderId}/weight`, { weight });
    return response.data;
  },
  
  updateOrderCoordinate: async (orderId: string, data: { latitude: number, longitude: number, kode_customer: string, nama_customer: string }) => {
    const response = await api.put(`/api/orders/${orderId}/coordinate`, data);
    return response.data;
  },
};