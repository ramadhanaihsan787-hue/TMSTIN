// src/features/routes/hooks/useRouteOptimization.ts
import { useState } from "react";
import { toast } from 'sonner';
import { api } from "../../../shared/services/apiClient";

export const useRouteOptimization = () => {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationPhase, setOptimizationPhase] = useState<'idle' | 'zoning' | 'preview_zone' | 'balancing' | 'routing' | 'matching' | 'validating' | 'done'>('idle');
    const [zoningData, setZoningData] = useState<any>(null); 
    const [previewData, setPreviewData] = useState<any>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);

    const generateSpatialZones = async (preview = false) => {
        setIsOptimizing(true);
        setLoadingProgress(5);
        setOptimizationPhase('zoning'); 

        try {
            const zoneRes = await api.post(`/api/routes/spatial-preview?preview=${preview}`);
            setZoningData(zoneRes.data.data);
            setLoadingProgress(100); 
            
            setTimeout(() => {
                setOptimizationPhase('preview_zone');
                setIsOptimizing(false); 
            }, 1500);
        } catch (error) {
            console.error("Gagal buat zona spasial:", error);
            toast.error("Gagal memetakan zona distribusi.");
            setIsOptimizing(false);
            setOptimizationPhase('idle');
        }
    };

    const runAIOptimization = async (preview = false) => {
        setIsOptimizing(true);
        setOptimizationPhase('balancing');
        setLoadingProgress(25);
        
        let simTick = 0;
        const progressInterval = setInterval(() => {
            simTick++;
            setLoadingProgress((old) => {
                const next = old + 2;
                if (next >= 40 && next < 60) setOptimizationPhase('routing');
                if (next >= 60 && next < 80) setOptimizationPhase('matching');
                return next >= 80 ? 80 : next; 
            });
        }, 800); 

        try {
            const startRes = await api.post(`/api/routes/optimize/start?preview=${preview}`);
            const jobId = startRes.data.job_id;

            // --- FASE 1: NUNGGU VRP SELESAI ---
            const checkVrpStatus = async () => {
                try {
                    const statusRes = await api.get(`/api/routes/optimize/status/${jobId}`);
                    const jobInfo = statusRes.data;

                    if (jobInfo.status === 'completed') {
                        clearInterval(progressInterval);
                        setOptimizationPhase('validating');
                        setLoadingProgress(85); 
                        
                        // --- FASE 2: TRAFFIC VALIDATION (LOGIC TEMEN LU) ---
                        let retryCount = 0;
                        const MAX_RETRY = 40;
                        const trafficInterval = setInterval(() => {
                            setLoadingProgress((old) => (old >= 95 ? 95 : old + 2));
                        }, 500);

                        const checkTrafficStatus = async () => {
                            retryCount++;
                            if (retryCount >= MAX_RETRY) {
                                clearInterval(trafficInterval);
                                toast.error("Traffic validation timeout. Menampilkan hasil tanpa validasi macet.");
                                setPreviewData(jobInfo.data);
                                setIsOptimizing(false);
                                setOptimizationPhase('done');
                                setLoadingProgress(0);
                                return;
                            }

                            try {
                                const tRes = await api.get(`/api/routes/validate-traffic/${jobId}/status`);
                                const tInfo = tRes.data;

                                if (tInfo.status === 'completed') {
                                    clearInterval(trafficInterval);
                                    setLoadingProgress(100);
                                    const finalData = { ...jobInfo.data, traffic_warnings: tInfo.warnings };

                                    if (tInfo.critical_count > 0) {
                                        toast.warning(`🚨 AI mendeteksi ${tInfo.critical_count} toko berpotensi terlambat akibat macet!`);
                                    }

                                    setTimeout(() => {
                                        setPreviewData(finalData);
                                        setIsOptimizing(false);
                                        setOptimizationPhase('done');
                                        setLoadingProgress(0);
                                        setZoningData(null);
                                    }, 800);

                                } else if (tInfo.status === 'failed') {
                                    clearInterval(trafficInterval);
                                    toast.error(tInfo.message || "Traffic validation gagal.");
                                    setPreviewData(jobInfo.data);
                                    setIsOptimizing(false);
                                    setOptimizationPhase('done');
                                    setLoadingProgress(0);
                                } else {
                                    setTimeout(checkTrafficStatus, 1500);
                                }
                            } catch (err) {
                                clearInterval(trafficInterval);
                                toast.error("Gagal mengecek status traffic validation.");
                                setPreviewData(jobInfo.data);
                                setIsOptimizing(false);
                                setOptimizationPhase('done');
                                setLoadingProgress(0);
                            }
                        };

                        await api.post(`/api/routes/validate-traffic/${jobId}`);
                        setTimeout(checkTrafficStatus, 1500);

                    } else if (jobInfo.status === 'failed') {
                        clearInterval(progressInterval);
                        setIsOptimizing(false);
                        setOptimizationPhase('idle');
                        setZoningData(null);
                        setLoadingProgress(0);
                        toast.error(jobInfo.message || "AI gagal menghitung rute.");
                    } else {
                        setTimeout(checkVrpStatus, 2000);
                    }
                } catch (error) {
                    clearInterval(progressInterval);
                    setIsOptimizing(false);
                    setOptimizationPhase('idle');
                    setZoningData(null);
                    setLoadingProgress(0);
                    toast.error("Terjadi kesalahan saat mengecek status AI.");
                }
            };
            setTimeout(checkVrpStatus, 2000);

        } catch (err) {
            clearInterval(progressInterval);
            setIsOptimizing(false);
            setOptimizationPhase('idle');
            setZoningData(null);
            setLoadingProgress(0);
            toast.error("Gagal memulai AI.");
        }
    };

    const resequenceRoute = async (draftData: any) => {
        try {
            setIsOptimizing(true);
            setOptimizationPhase('routing'); 
            const response = await api.post('/api/routes/resequence', draftData, { timeout: 120000 });
            setPreviewData(response.data); 
            toast.success("Urutan berhasil dihitung ulang!");
            return response.data;
        } catch (error) {
            console.error("Gagal menghitung ulang urutan:", error);
            toast.error("Gagal menghitung ulang urutan!");
            throw error;
        } finally {
            setIsOptimizing(false);
            setOptimizationPhase('idle');
        }
    };

    const confirm = async (modifiedData?: any) => {
        try {
            const dataToSave = modifiedData || previewData;
            await api.post('/api/routes/confirm', dataToSave); 
            setPreviewData(null); 
            setOptimizationPhase('idle');
            return true;
        } catch (error) {
            console.error("Gagal konfirmasi rute:", error);
            throw error;
        }
    };

    return {
        isOptimizing,
        optimizationPhase, 
        zoningData,          
        previewData,
        setPreviewData,
        loadingProgress,
        generateSpatialZones,
        runAIOptimization,   
        resequenceRoute, 
        confirm,
        setOptimizationPhase 
    };
};