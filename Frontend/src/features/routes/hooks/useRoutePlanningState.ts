// src/features/routes/hooks/useRoutePlanningState.ts
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { api } from '../../../shared/services/apiClient';
import {
    dummyFleet, type TruckTracking, type CustomerDrop
} from '../../dashboard/components/trackingData';

interface RouteProduct { nama_barang: string; qty: string; }
interface RouteDetail { urutan: number; nama_toko: string; latitude: number; longitude: number; berat_kg: number; jam_tiba: string; distance_from_prev_km: number; items: RouteProduct[]; }
interface RouteItem { route_id: string; tanggal: string; driver_name: string; kendaraan: string; jenis: string; destinasi_jumlah: number; total_berat: number; total_distance_km: number; status: string; zone: string; detail_rute: RouteDetail[]; garis_aspal?: [number, number][]; capacity?: number; }
interface UploadResult { order_id?: string; kode_customer?: string; nama_toko: string; berat?: number; kordinat?: string; alasan?: string; items?: RouteProduct[]; jam_maks?: string; }
interface DroppedNode { nama_toko: string; berat_kg: number; alasan: string; lat?: number; lon?: number; }

export const useRoutePlanningState = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'map' | 'live'>('list');
    const [routeMessage, setRouteMessage] = useState('');

    const [isReassignMode, setIsReassignMode] = useState(false);
    const [editedRoutes, setEditedRoutes] = useState<RouteItem[] | null>(null);
    const [transferStop, setTransferStop] = useState<{ routeId: string; stopIdx: number; stop: RouteDetail } | null>(null);
    const [reassignHistory, setReassignHistory] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [routesData, setRoutesData] = useState<RouteItem[]>([]);
    const [droppedNodes, setDroppedNodes] = useState<DroppedNode[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

    const [previewData, setPreviewData] = useState<any>(null);
    const [activePreviewTruck, setActivePreviewTruck] = useState<number | null>(null);
    const [activeModal, setActiveModal] = useState<'cost' | 'distance' | 'fleet' | 'stops' | null>(null);
    const [expandedStopIdx, setExpandedStopIdx] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [uploadReport, setUploadReport] = useState<{ success: UploadResult[], failed: UploadResult[] } | null>(null);
    const [popupInfo, setPopupInfo] = useState<any>(null);
    const [trafficWarnings] = useState<any[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(0);

    const baseRoutes: RouteItem[] = useMemo(() => {
        if (routesData.length > 0) return routesData;
        return dummyFleet.map((truck: TruckTracking, i: number) => ({
            route_id: truck.id,
            tanggal: new Date().toISOString().split('T')[0],
            driver_name: truck.driver,
            kendaraan: truck.plate,
            jenis: 'CDD',
            destinasi_jumlah: truck.customers.length,
            total_berat: truck.loadKg,
            capacity: truck.capacityKg,
            total_distance_km: 15 + i * 5,
            status: truck.status === 'in-transit' ? 'aktif' : truck.status,
            zone: truck.zone,
            detail_rute: truck.customers.map((c: CustomerDrop, j: number) => ({
                urutan: j + 1,
                nama_toko: c.name,
                latitude: c.lat,
                longitude: c.lon,
                berat_kg: c.weightKg,
                jam_tiba: c.timeWindow.split(' - ')[0] + ':00',
                distance_from_prev_km: 3 + j * 1.5,
                items: []
            }))
        }));
    }, [routesData]);

    const displayRoutes = editedRoutes ?? baseRoutes;

    const fetchRoutes = useCallback(async (date: string) => {
        try {
            const res = await api.get(`/api/routes?date=${date}`);
            const data = res.data;
            if (data.routes) {
                setRoutesData(data.routes);
                setDroppedNodes(data.dropped_nodes || []);
                if (data.routes.length > 0) setSelectedRouteId(data.routes[0].route_id);
                else setSelectedRouteId(null);
            } else if (Array.isArray(data)) {
                setRoutesData(data);
                if (data.length > 0) setSelectedRouteId(data[0].route_id);
                else setSelectedRouteId(null);
            }
        } catch (error) { console.error("Gagal fetch routes:", error); }
    }, []);

    useEffect(() => {
        fetchRoutes(selectedDate);
    }, [selectedDate, fetchRoutes]);

    useEffect(() => {
        if (!selectedRouteId && displayRoutes.length > 0) {
            setSelectedRouteId(displayRoutes[0].route_id);
        }
    }, [displayRoutes, selectedRouteId]);

    const selectedRoute = useMemo(() =>
        displayRoutes.find(r => r.route_id === selectedRouteId) || null
        , [displayRoutes, selectedRouteId]);

    const totalCost = useMemo(() =>
        displayRoutes.reduce((sum, r) => sum + (r.total_distance_km * 3500), 0).toLocaleString('id-ID')
        , [displayRoutes]);

    const totalRealDistance = useMemo(() =>
        displayRoutes.reduce((sum, r) => sum + r.total_distance_km, 0).toFixed(1)
        , [displayRoutes]);

    const totalFleet = displayRoutes.length;
    const totalOrders = displayRoutes.reduce((sum, r) => sum + r.destinasi_jumlah, 0);
    const hasDummyData = routesData.length === 0;

    const generateSuratJalanPDF = useCallback((route: RouteItem) => {
        const doc = new (jsPDF as any)();
        doc.setFontSize(18);
        doc.text('SURAT JALAN', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`No. Kendaraan: ${route.kendaraan}`, 14, 30);
        doc.text(`Driver: ${route.driver_name}`, 14, 36);
        doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 42);

        const tableData = route.detail_rute.map((stop, index) => [
            index + 1,
            stop.nama_toko,
            `${stop.berat_kg} KG`,
            stop.jam_tiba || '-'
        ]);

        doc.autoTable({
            startY: 50,
            head: [['No', 'Nama Toko', 'Berat', 'Jam Tiba']],
            body: tableData,
        });

        doc.save(`Surat_Jalan_${route.kendaraan}_${new Date().toISOString().split('T')[0]}.pdf`);
    }, []);

    const enterReassignMode = useCallback(() => {
        const deepCopy: RouteItem[] = JSON.parse(JSON.stringify(baseRoutes));
        setEditedRoutes(deepCopy);
        setIsReassignMode(true);
        setReassignHistory([]);
    }, [baseRoutes]);

    const exitReassignMode = useCallback((save: boolean) => {
        if (save && editedRoutes) {
            setRoutesData(editedRoutes);
            setRouteMessage('✅ Perubahan reassign berhasil disimpan!');
        }
        setEditedRoutes(null);
        setIsReassignMode(false);
        setTransferStop(null);
        setReassignHistory([]);
    }, [editedRoutes]);

    const handleTransferStop = useCallback((toRouteId: string) => {
        if (!editedRoutes || !transferStop) return;
        const newRoutes: RouteItem[] = JSON.parse(JSON.stringify(editedRoutes));
        const fromRoute = newRoutes.find(r => r.route_id === transferStop.routeId);
        const toRoute = newRoutes.find(r => r.route_id === toRouteId);
        if (!fromRoute || !toRoute) return;
        const [movedStop] = fromRoute.detail_rute.splice(transferStop.stopIdx, 1);
        toRoute.detail_rute.push(movedStop);
        fromRoute.detail_rute.forEach((s, i) => { s.urutan = i + 1; s.distance_from_prev_km = 3 + i * 1.5; });
        toRoute.detail_rute.forEach((s, i) => { s.urutan = i + 1; s.distance_from_prev_km = 3 + i * 1.5; });
        fromRoute.total_berat = fromRoute.detail_rute.reduce((s, d) => s + d.berat_kg, 0);
        fromRoute.destinasi_jumlah = fromRoute.detail_rute.length;
        fromRoute.total_distance_km = fromRoute.detail_rute.reduce((s, d) => s + d.distance_from_prev_km, 0);
        toRoute.total_berat = toRoute.detail_rute.reduce((s, d) => s + d.berat_kg, 0);
        toRoute.destinasi_jumlah = toRoute.detail_rute.length;
        toRoute.total_distance_km = toRoute.detail_rute.reduce((s, d) => s + d.distance_from_prev_km, 0);
        setEditedRoutes(newRoutes);
        setReassignHistory(prev => [...prev, `${movedStop.nama_toko} → ${toRoute.kendaraan}`]);
        setTransferStop(null);
        setSelectedRouteId(toRouteId);
    }, [editedRoutes, transferStop]);

    const handleUploadClick = useCallback(() => fileInputRef.current?.click(), []);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        setIsUploading(true);

        try {
            const res = await api.post('/api/orders/upload', formData, {
                headers: { 'Content-Type': undefined }
            });
            const data = res.data;
            setUploadReport({ success: data.success_list || [], failed: data.failed_list || [] });
            setShowVerificationModal(true);
        } catch (error: any) {
            console.error("Upload gagal:", error);
            alert(`Upload gagal: ${error.response?.data?.detail || error.message || 'Server error'}`);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsUploading(false);
        }
    }, []);

    const handleTimeChange = useCallback(async (orderId: string | undefined, newTime: string) => {
        if (!orderId) return;
        try {
            await api.put(`/api/orders/${orderId}/time`, { jam_maksimal: newTime });
        } catch (error) { console.error("Error API Time Update:", error); }
    }, []);

    const handleOptimizeRoute = useCallback(async () => {
        setIsOptimizing(true);
        setLoadingProgress(10);
        setPreviewData(null);
        setActivePreviewTruck(null);

        const progressInterval = setInterval(() => {
            setLoadingProgress((prev) => (prev >= 90 ? 90 : prev + 5));
        }, 1500);

        try {
            const startRes = await api.post('/api/routes/optimize/start?preview=true');
            const jobId = startRes.data.job_id;

            const checkVrpStatus = async () => {
                try {
                    const statusRes = await api.get(`/api/routes/optimize/status/${jobId}`);
                    const jobInfo = statusRes.data;

                    if (jobInfo.status === 'completed') {
                        clearInterval(progressInterval);
                        setLoadingProgress(95);

                        try {
                            await api.post(`/api/routes/validate-traffic/${jobId}`);
                            const checkTraffic = async () => {
                                const tRes = await api.get(`/api/routes/validate-traffic/${jobId}/status`);
                                if (tRes.data.status === 'completed') {
                                    const finalData = { ...jobInfo.data, traffic_warnings: tRes.data.warnings };
                                    setLoadingProgress(100);
                                    setTimeout(() => {
                                        setPreviewData(finalData);
                                        setActivePreviewTruck(null);
                                        setIsOptimizing(false);
                                        setLoadingProgress(0);
                                    }, 800);
                                } else if (tRes.data.status === 'failed') {
                                    throw new Error('Traffic validation failed');
                                } else {
                                    setTimeout(checkTraffic, 1500);
                                }
                            };
                            setTimeout(checkTraffic, 1500);
                        } catch {
                            setLoadingProgress(100);
                            setTimeout(() => {
                                setPreviewData(jobInfo.data);
                                setActivePreviewTruck(null);
                                setIsOptimizing(false);
                                setLoadingProgress(0);
                            }, 800);
                        }
                    } else if (jobInfo.status === 'failed') {
                        clearInterval(progressInterval);
                        setIsOptimizing(false);
                        setLoadingProgress(0);
                        alert(jobInfo.message || 'AI gagal menghitung rute.');
                    } else {
                        setTimeout(checkVrpStatus, 2000);
                    }
                } catch (error) {
                    clearInterval(progressInterval);
                    setIsOptimizing(false);
                    setLoadingProgress(0);
                    alert('Gagal mengecek status optimisasi AI.');
                }
            };

            setTimeout(checkVrpStatus, 2000);
        } catch (error: any) {
            clearInterval(progressInterval);
            setIsOptimizing(false);
            setLoadingProgress(0);
            alert(`Gagal memulai AI: ${error.response?.data?.detail || error.message || 'Server error'}`);
        }
    }, []);

    const handleConfirmSaveRoute = useCallback(async (customData?: any) => {
        try {
            await api.post('/api/routes/confirm', customData || previewData);
            setPreviewData(null);
            setActivePreviewTruck(null);
            setRouteMessage('Rute berhasil dikunci & disimpan ke Database!');
            const todayStr = new Date().toISOString().split('T')[0];
            setSelectedDate(todayStr);
            await fetchRoutes(todayStr);
        } catch (error: any) {
            console.error('Gagal confirm rute:', error);
            alert(`Gagal menyimpan ke database: ${error.response?.data?.detail || error.message || 'Server error'}`);
        }
    }, [previewData, fetchRoutes]);

    return {
        isUploading,
        isOptimizing,
        isFocusMode,
        setIsFocusMode,
        viewMode,
        setViewMode,
        routeMessage,
        setRouteMessage,
        isReassignMode,
        editedRoutes,
        transferStop,
        setTransferStop,
        reassignHistory,
        fileInputRef,
        routesData,
        droppedNodes,
        selectedRouteId,
        setSelectedRouteId,
        previewData,
        setPreviewData,
        activePreviewTruck,
        setActivePreviewTruck,
        activeModal,
        setActiveModal,
        expandedStopIdx,
        setExpandedStopIdx,
        selectedDate,
        setSelectedDate,
        showVerificationModal,
        setShowVerificationModal,
        uploadReport,
        popupInfo,
        setPopupInfo,
        trafficWarnings,
        loadingProgress,
        displayRoutes,
        selectedRoute,
        totalCost,
        totalRealDistance,
        totalFleet,
        totalOrders,
        hasDummyData,
        fetchRoutes,
        generateSuratJalanPDF,
        enterReassignMode,
        exitReassignMode,
        handleTransferStop,
        handleUploadClick,
        handleFileUpload,
        handleTimeChange,
        handleOptimizeRoute,
        handleConfirmSaveRoute
    };
};
