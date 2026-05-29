// src/features/routes/pages/RoutePlanningPage.tsx
import React, { useState, useEffect } from "react";
import { toast } from 'sonner';
import Map, { Source, Layer, Marker } from 'react-map-gl/mapbox';

import { useRoutes } from "../hooks/useRoutes";
import { useUpload } from "../hooks/useUpload";
import { useRouteOptimization } from "../hooks/useRouteOptimization";

import RouteToolbar from "../components/RouteToolbar";
import RouteSummaryCards from "../components/RouteSummaryCards";
import TruckList from "../components/TruckList";
import RouteDetailPanel from "../components/RouteDetailPanel";
import RouteMap from "../components/RouteMap";
import RouteLoadingOverlay from "../components/RouteLoadingOverlay";
import UploadVerificationModal from "../components/UploadVerificationModal";
import RoutePreviewModal from "../components/RoutePreviewModal";
import RouteDispatchModal from "../components/RouteDispatchModal";
import SpilloverBasket from "../components/SpilloverBasket";
import PreviewZoneModal from '../components/PreviewZoneModal';

import { useHeaderStore } from "../../../store/useHeaderStore";
import { api } from '../../../shared/services/apiClient';
import { fleetService } from '../../fleet/services/fleetService';

export default function RoutePlanningPage() {
    const { setTitle } = useHeaderStore();

    useEffect(() => {
        setTitle("Route Planning Dashboard");
    }, [setTitle]);

    const getLocalToday = () => {
        const d = new Date();
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState(() => getLocalToday());
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [showMapView, setShowMapView] = useState(false);
    const [activeModal, setActiveModal] = useState<'cost' | 'distance' | 'fleet' | 'stops' | null>(null);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [isGeneratingOnCall, setIsGeneratingOnCall] = useState(false);

    // State untuk fleet panel dan koordinat
    const [fleetForPanel, setFleetForPanel]       = useState<any[]>([]);
    const [storesNoCoord,  setStoresNoCoord]       = useState<any[]>([]);
    const [coordEditTarget, setCoordEditTarget]    = useState<any | null>(null);
    const [coordPopupPos,   setCoordPopupPos]      = useState<{x:number,y:number} | null>(null);
    const [isFleetPanelOpen, setIsFleetPanelOpen] = useState(true);
    const [savingCoord, setSavingCoord]            = useState(false);

    const truckColors = [
        // Warna terang & vivid — kontras tinggi di basemap navigation-night
        '#ef4444', // merah terang
        '#3b82f6', // biru terang
        '#22c55e', // hijau terang
        '#f59e0b', // oranye/amber
        '#a855f7', // ungu
        '#14b8a6', // teal
        '#ec4899', // pink
    ];

    // 🌟 SINKRONISASI: Ambil zonesData dari useRoutes
    const { routesData, droppedNodes, zonesData, selectedRouteId, setSelectedRouteId, fetchRoutes } = useRoutes();

    const {
        isUploading, uploadReport, setUploadReport, uploadFile,
        updateTime, saveCoord, updateWeight, updateSuccessCoord
    } = useUpload();

    const {
        isOptimizing, previewData, setPreviewData, loadingProgress,
        optimizationPhase, zoningData,
        generateSpatialZones, runAIOptimization,
        confirm, resequenceRoute, setOptimizationPhase
    } = useRouteOptimization();

    useEffect(() => {
        fetchRoutes(selectedDate);
    }, [selectedDate, fetchRoutes]);

    // Load daftar armada untuk fleet panel
    useEffect(() => {
        api.get('/api/fleet').then(r => {
            const raw = r.data?.data || r.data || [];
            setFleetForPanel(Array.isArray(raw) ? raw : []);
        }).catch(() => {});
    }, []);

    // Deteksi toko tanpa koordinat setelah upload
    useEffect(() => {
        const missingList = (uploadReport as any)?.stores_without_coordinates;
        if (Array.isArray(missingList) && missingList.length > 0) {
            setStoresNoCoord(missingList);
            toast.warning(
                `⚠️ ${missingList.length} toko belum punya koordinat — pin lokasi di peta sebelum optimasi.`,
                { duration: 8000 }
            );
        }
    }, [uploadReport]);

    // Toggle status armada (Active ↔ Maintenance)
    const handleToggleFleetStatus = async (vehicleId: string | number, currentStatus: string) => {
        const newStatus = currentStatus === 'Available' ? 'Maintenance' : 'Available';
        try {
            await fleetService.updateStatus(vehicleId, newStatus);
            setFleetForPanel(prev => prev.map(t =>
                (t.id || t.vehicle_id) === vehicleId ? { ...t, status: newStatus } : t
            ));
            toast.success(`Armada ${newStatus === 'Available' ? 'diaktifkan' : 'di-set Maintenance'}`);
        } catch {
            toast.error('Gagal update status armada');
        }
    };

    // Simpan koordinat toko yang di-pin admin
    const handleSaveCoordinate = async (lat: number, lon: number) => {
        if (!coordEditTarget) return;
        setSavingCoord(true);
        try {
            await api.patch(
                `/api/customers/by-code/${coordEditTarget.kode_customer}/coordinate`,
                null, { params: { lat, lon } }
            );
            setStoresNoCoord(prev =>
                prev.filter(s => s.kode_customer !== coordEditTarget.kode_customer)
            );
            toast.success(`📍 Koordinat ${coordEditTarget.store_name} berhasil disimpan!`);
            setCoordEditTarget(null);
            setCoordPopupPos(null);
        } catch {
            toast.error('Gagal menyimpan koordinat');
        } finally {
            setSavingCoord(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const success = await uploadFile(file);
        if (success) setShowVerificationModal(true);
        event.target.value = '';
    };

    const handleStartOptimization = async () => {
        setShowVerificationModal(false);
        try { await generateSpatialZones(); }
        catch (error) { toast.error('Gagal memetakan zona rute!'); }
    };

    const handleGenerateOnCall = async () => {
        setIsGeneratingOnCall(true);
        toast.info("Mengirim data ke AI untuk perhitungan On-Call...");
        setTimeout(() => {
            setIsGeneratingOnCall(false);
            toast.success("Fitur Routing On-Call sedang dalam tahap penyelesaian Backend Bos!");
        }, 2000);
    };

    // Helper untuk auto-fix koordinat polygon mapbox (mencegah crash GeoJSON akibat salah dimensi array)
    const ensureValidPolygonCoords = (coords: any) => {
        if (!Array.isArray(coords)) return [];
        if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && !Array.isArray(coords[0][0][0])) {
            return coords; // Valid 3D Array [[[lon, lat], ...]]
        }
        if (Array.isArray(coords[0]) && !Array.isArray(coords[0][0])) {
            return [coords]; // Bungkus 2D Array jadi 3D Array
        }
        if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])) {
            return coords[0]; // Lepas bungkus 4D Array jadi 3D Array
        }
        return coords;
    };

    const safeRoutesData = Array.isArray(routesData) ? routesData : [];
    const totalFleet = safeRoutesData.length;
    const totalOrders = safeRoutesData.reduce((sum, route: any) => sum + (route.destinationCount || route.destinasi_jumlah || 0), 0);
    const totalCostRaw = safeRoutesData.reduce((sum, route: any) => sum + (route.transportCost || route.transport_cost || 0), 0);
    const totalCost = totalCostRaw.toLocaleString('id-ID');
    const totalRealDistance = safeRoutesData.reduce((sum, route: any) => sum + (route.totalDistanceKm || route.total_distance_km || 0), 0).toFixed(1);
    const selectedRouteData = safeRoutesData.find((r: any) => (r.routeId || r.route_id) === selectedRouteId);

    const [dispatchData, setDispatchData] = useState<any>(null);
    const [isSavingRoute, setIsSavingRoute] = useState(false);

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-[#0A0A0A]">

            <RouteLoadingOverlay
                isUploading={isUploading}
                isOptimizing={isOptimizing}
                loadingProgress={loadingProgress}
                optimizationPhase={optimizationPhase}
                zoningData={zoningData}
                truckColors={truckColors}
            />

            {showVerificationModal && uploadReport && (
                <UploadVerificationModal
                    uploadReport={uploadReport}
                    onClose={() => {
                        setShowVerificationModal(false);
                        setUploadReport(null);
                    }}
                    onSaveCoord={saveCoord}
                    onUpdateTime={updateTime}
                    onUpdateWeight={updateWeight}
                    onUpdateSuccessCoord={updateSuccessCoord}
                    onOptimize={handleStartOptimization}
                />
            )}

            {/* PREVIEW ZONA MODAL */}
            {optimizationPhase === 'preview_zone' && (
                <PreviewZoneModal
                    onCancel={() => setOptimizationPhase('idle')}
                    onProceed={() => runAIOptimization()}
                    storesNoCoord={storesNoCoord}
                    zoningData={zoningData}
                    truckColors={truckColors}
                    fleetForPanel={fleetForPanel}
                    isFleetPanelOpen={isFleetPanelOpen}
                    setIsFleetPanelOpen={setIsFleetPanelOpen}
                    handleToggleFleetStatus={handleToggleFleetStatus}
                    coordEditTarget={coordEditTarget}
                    setCoordEditTarget={setCoordEditTarget}
                    coordPopupPos={coordPopupPos}
                    setCoordPopupPos={setCoordPopupPos}
                    handleSaveCoordinate={handleSaveCoordinate}
                    savingCoord={savingCoord}
                />
            )}

            {/* PREVIEW RUTE MODAL */}
            {previewData && !dispatchData && optimizationPhase === 'done' && (
                <RoutePreviewModal
                    previewData={previewData}
                    truckColors={truckColors}
                    onCancel={() => {
                        setPreviewData(null);
                        setShowVerificationModal(true);
                    }}
                    onProceedDispatch={(draft) => setDispatchData(draft)}
                    onResequence={async (draft) => await resequenceRoute(draft)}
                />
            )}

            {dispatchData && (
                <RouteDispatchModal
                    draftData={dispatchData}
                    isSaving={isSavingRoute}
                    onBack={() => setDispatchData(null)}
                    onConfirmSave={async (finalDataWithKru: any) => {
                        setIsSavingRoute(true);
                        try {
                            await confirm(finalDataWithKru);
                            toast.success('Rute berhasil dikunci & Armada diberangkatkan! 🚀');
                            const todayStr = getLocalToday();
                            setSelectedDate(todayStr);
                            await fetchRoutes(todayStr);
                            setDispatchData(null);
                            setPreviewData(null);
                        } catch (error) {
                            toast.error('Gagal menyimpan rute permanen!');
                        } finally {
                            setIsSavingRoute(false);
                        }
                    }}
                />
            )}

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                <RouteToolbar
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    isUploading={isUploading}
                    onFileUpload={handleFileUpload}
                />

                <RouteSummaryCards
                    totalCost={totalCost}
                    totalDistance={totalRealDistance}
                    totalFleet={totalFleet}
                    totalOrders={totalOrders}
                    onCardClick={setActiveModal}
                />

                <div className="grid grid-cols-12 gap-8 items-start pb-4">
                    {!isFocusMode && (
                        <div className="col-span-3 space-y-4 transition-all duration-300">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">local_shipping</span> Today's Fleet
                            </h3>
                            <TruckList
                                routesData={routesData}
                                selectedRouteId={selectedRouteId}
                                onSelectRoute={setSelectedRouteId}
                            />

                            <SpilloverBasket
                                droppedNodes={droppedNodes}
                                onGenerateOnCall={handleGenerateOnCall}
                                isGenerating={isGeneratingOnCall}
                            />
                        </div>
                    )}

                    <div className={`${isFocusMode ? 'col-span-12' : 'col-span-9'} space-y-4 transition-all duration-300`}>
                        <RouteDetailPanel
                            selectedRoute={selectedRouteData}
                            isFocusMode={isFocusMode}
                            onToggleFocus={() => setIsFocusMode(!isFocusMode)}
                            showMapView={showMapView}
                            onToggleMapView={() => setShowMapView(!showMapView)}
                            mapComponent={
                                <RouteMap
                                    routesData={routesData}
                                    selectedRouteId={selectedRouteId}
                                    truckColors={truckColors}
                                    onSelectRoute={setSelectedRouteId}
                                    zonesData={zonesData}
                                />
                            }
                        />
                    </div>
                </div>

                {/* Live Route Map Section */}
                <div className="w-full mt-8 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#333] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[70vh] min-h-[600px]">
                    <div className="p-5 border-b border-slate-200 dark:border-[#333] shrink-0 flex justify-between items-center bg-slate-50 dark:bg-[#1A1A1A]">
                        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">map</span> Live Route Map
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-[#333] px-2 py-1 rounded">Semua Rute Aktif</span>
                    </div>

                    <div className="flex-1 relative bg-slate-100 dark:bg-[#0a0a0a]">
                        <RouteMap
                            routesData={routesData}
                            selectedRouteId={selectedRouteId}
                            truckColors={truckColors}
                            droppedNodesData={droppedNodes}
                            onSelectRoute={setSelectedRouteId}
                            zonesData={zonesData}
                        />
                    </div>
                </div>
            </div>

            {/* Detailed Stats Modal Popups */}
            {activeModal && (
                <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
                    <div className="bg-white dark:bg-[#1F1F1F] rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-[#333] overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-200 dark:border-[#333] flex justify-between items-center bg-slate-50 dark:bg-[#1A1A1A]">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                {activeModal === 'cost' && <><span className="material-symbols-outlined text-primary">payments</span> Rincian Cost Estimation</>}
                                {activeModal === 'distance' && <><span className="material-symbols-outlined text-primary">route</span> Rincian Total Distance</>}
                                {activeModal === 'fleet' && <><span className="material-symbols-outlined text-primary">local_shipping</span> Rincian Active Fleet</>}
                                {activeModal === 'stops' && <><span className="material-symbols-outlined text-primary">inventory_2</span> Rincian Total Stops</>}
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-[#333] rounded-lg text-slate-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-[#333] text-slate-500 text-sm">
                                        <th className="pb-3 font-semibold">Truk (Nopol)</th>
                                        <th className="pb-3 font-semibold">Driver</th>
                                        {activeModal === 'cost' && <th className="pb-3 font-semibold text-right">Estimasi Biaya</th>}
                                        {activeModal === 'distance' && <th className="pb-3 font-semibold text-right">Jarak Tempuh</th>}
                                        {activeModal === 'fleet' && <th className="pb-3 font-semibold text-right">Tipe Armada</th>}
                                        {activeModal === 'stops' && <th className="pb-3 font-semibold text-right">Jumlah Toko</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeRoutesData.map((route: any, i: number) => (
                                        <tr key={i} className="border-b border-slate-100 dark:border-[#222] last:border-0 hover:bg-slate-50 dark:hover:bg-[#2A2A2A]">
                                            <td className="py-3 font-bold dark:text-white">{route.vehicle || route.kendaraan || route.plateNumber || '-'}</td>
                                            <td className="py-3 text-slate-600 dark:text-slate-300">{route.driverName || route.driver_name || '-'}</td>
                                            {activeModal === 'cost' && <td className="py-3 text-right font-mono text-emerald-600">Rp {((route.transportCost || route.transport_cost || ((route.totalDistanceKm || route.total_distance_km || 0) * 2500))).toLocaleString('id-ID')}</td>}
                                            {activeModal === 'distance' && <td className="py-3 text-right font-mono text-blue-500">{route.totalDistanceKm || route.total_distance_km || '0'} KM</td>}
                                            {activeModal === 'fleet' && <td className="py-3 text-right text-slate-500">{route.jenis || route.truck_type || '-'}</td>}
                                            {activeModal === 'stops' && <td className="py-3 text-right font-bold text-primary">{route.destinationCount || route.destinasi_jumlah || '0'} Toko</td>}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 dark:bg-[#1A1A1A] border-t-2 border-slate-300 dark:border-[#444]">
                                        <td colSpan={2} className="py-3 font-black text-slate-900 dark:text-white uppercase text-sm">TOTAL</td>
                                        {activeModal === 'cost' && <td className="py-3 text-right font-black text-emerald-600 text-lg">Rp {totalCost}</td>}
                                        {activeModal === 'distance' && <td className="py-3 text-right font-black text-blue-500 text-lg">{totalRealDistance} KM</td>}
                                        {activeModal === 'fleet' && <td className="py-3 text-right font-black text-primary text-lg">{totalFleet} Unit</td>}
                                        {activeModal === 'stops' && <td className="py-3 text-right font-black text-primary text-lg">{totalOrders} Toko</td>}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}