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
        '#7f1d1d', '#1e3a5f', '#14532d', '#78350f', '#4c1d95', '#134e4a', '#7c2d12'
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
                <div className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex flex-col p-4 md:p-8">
                    <div className="bg-white dark:bg-[#111] flex-1 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-[#333] flex justify-between items-center bg-slate-50 dark:bg-[#1A1A1A]">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">map</span> PREVIEW ZONA TERITORI JAPFA
                                </h2>
                                <p className="text-xs font-bold text-slate-500 mt-1">Peta Dasar Operasional JAPFA. Pin toko akan menyesuaikan rute di dalam batas zona ini.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setOptimizationPhase('idle')} className="px-4 py-2 border-2 border-slate-200 dark:border-[#444] text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-[#333] transition-colors">Batal</button>
                                <button onClick={() => runAIOptimization()} className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-xl hover:brightness-110 flex items-center gap-2 shadow-lg shadow-teal-500/30 transition-all hover:scale-105">
                                    LANJUT HITUNG RUTE <span className="material-symbols-outlined">smart_toy</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 relative bg-slate-100 dark:bg-[#0a0a0a]">

                            {/* ── Warning banner toko tanpa koordinat ── */}
                            {storesNoCoord.length > 0 && (
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-amber-500/95 backdrop-blur text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-bold max-w-md">
                                    <span className="material-symbols-outlined text-[18px]">location_off</span>
                                    <span>
                                        {storesNoCoord.length} toko belum punya koordinat — klik marker
                                        <span className="inline-block w-3 h-3 rounded-full bg-red-400 border border-white mx-1 animate-pulse align-middle"></span>
                                        untuk pin lokasi
                                    </span>
                                </div>
                            )}

                            {/* ── Popup set koordinat ── */}
                            {coordEditTarget && (
                                <div className="absolute top-3 right-3 z-20 bg-[#1a1c1e]/95 backdrop-blur border border-amber-500/60 rounded-xl p-4 shadow-xl max-w-xs">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div>
                                            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Set Koordinat</p>
                                            <p className="text-sm font-bold text-white mt-0.5">{coordEditTarget.store_name}</p>
                                            <p className="text-xs text-slate-400">{coordEditTarget.kode_customer}</p>
                                        </div>
                                        <button onClick={() => { setCoordEditTarget(null); setCoordPopupPos(null); }}
                                            className="text-slate-400 hover:text-white p-0.5">
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-300 bg-slate-800/60 rounded-lg p-2 mb-3">
                                        <span className="material-symbols-outlined text-[14px] align-middle mr-1 text-amber-400">touch_app</span>
                                        Klik pada peta untuk menetapkan lokasi toko ini
                                    </p>
                                    {coordPopupPos && (
                                        <div className="text-xs text-slate-300 font-mono bg-slate-800/40 rounded p-2 mb-3">
                                            {coordPopupPos.y.toFixed(6)}, {coordPopupPos.x.toFixed(6)}
                                        </div>
                                    )}
                                    {coordPopupPos && (
                                        <button
                                            onClick={() => handleSaveCoordinate(coordPopupPos.y, coordPopupPos.x)}
                                            disabled={savingCoord}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            {savingCoord ? '⏳ Menyimpan...' : '📍 Simpan Koordinat'}
                                        </button>
                                    )}
                                </div>
                            )}

                            <Map
                                initialViewState={{
                                    longitude: 106.86,
                                    latitude: -6.33,
                                    zoom: 8.9,
                                    pitch: 0,
                                    bearing: 0
                                }}
                                style={{ width: '100%', height: '100%' }}
                                mapStyle="mapbox://styles/mapbox/navigation-night-v1"
                                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                                cursor={coordEditTarget ? 'crosshair' : 'grab'}
                                onClick={(e) => {
                                    if (coordEditTarget) {
                                        setCoordPopupPos({ x: e.lngLat.lng, y: e.lngLat.lat });
                                    }
                                }}
                            >
                                {/* Zona warna per area */}
                                <Source id="static-zones" type="geojson" data={{
                                    type: 'FeatureCollection',
                                    features: zoningData?.map((zone: any, i: number) => ({
                                        type: 'Feature',
                                        properties: { zone_id: zone.zone_id, color: truckColors[i % truckColors.length] },
                                        geometry: {
                                            type: 'Polygon',
                                            coordinates: ensureValidPolygonCoords(zone.bounding_polygon || zone.coordinates)
                                        }
                                    }))
                                } as any}>
                                    <Layer id="static-zones-fill" type="fill"
                                        paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.13 }} />
                                    <Layer id="static-zones-line" type="line"
                                        paint={{ 'line-color': ['get', 'color'], 'line-width': 1.8,
                                                 'line-opacity': 0.45, 'line-dasharray': [2, 3] }} />
                                </Source>

                                {/* Marker toko valid (dari zoning) */}
                                {zoningData?.map((zone: any, i: number) => {
                                    const color = truckColors[i % truckColors.length];
                                    return zone.stores?.map((store: any, j: number) => (
                                        <Marker key={`z${i}-s${j}`} longitude={store.lon || store.lng} latitude={store.lat} anchor="center">
                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/80 shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                                                 style={{ backgroundColor: color }}></div>
                                        </Marker>
                                    ));
                                })}

                                {/* Marker toko TANPA koordinat — merah berkedip, bisa di-klik */}
                                {storesNoCoord.map((store: any, i: number) => {
                                    // Tampilkan di posisi depot sebagai placeholder visual
                                    // (koordinat sebenarnya belum ada, pakai posisi kota sebagai fallback)
                                    return (
                                        <Marker key={`nocoord-${i}`} longitude={106.65} latitude={-6.21 - i * 0.03} anchor="center">
                                            <div
                                                className="relative cursor-pointer group"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCoordEditTarget(store);
                                                    setCoordPopupPos(null);
                                                }}
                                                title={`${store.store_name} — klik untuk set koordinat`}
                                            >
                                                {/* Pulse ring */}
                                                <div className="absolute -inset-2 rounded-full bg-red-500/30 animate-ping"></div>
                                                {/* Ikon */}
                                                <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-lg flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[12px] text-white">question_mark</span>
                                                </div>
                                                {/* Tooltip nama toko */}
                                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    {store.store_name}
                                                </div>
                                            </div>
                                        </Marker>
                                    );
                                })}
                            </Map>

                            {/* ── Fleet Status Panel (overlay kanan bawah) ── */}
                            <div className="absolute bottom-4 right-4 z-10">
                                <div className={`bg-[#1a1c1e]/92 backdrop-blur border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isFleetPanelOpen ? 'w-72' : 'w-12'}`}>

                                    {/* Header panel */}
                                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
                                        {isFleetPanelOpen && (
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary text-[16px]">local_shipping</span>
                                                <span className="text-xs font-bold text-white uppercase tracking-wider">Armada Hari Ini</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setIsFleetPanelOpen(p => !p)}
                                            className="ml-auto text-slate-400 hover:text-white p-0.5 rounded"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {isFleetPanelOpen ? 'chevron_right' : 'local_shipping'}
                                            </span>
                                        </button>
                                    </div>

                                    {/* List armada */}
                                    {isFleetPanelOpen && (
                                        <div className="max-h-64 overflow-y-auto">
                                            {fleetForPanel.length === 0 ? (
                                                <p className="text-xs text-slate-500 text-center py-4">Memuat armada...</p>
                                            ) : fleetForPanel.map((truck: any) => {
                                                const vid    = truck.id || truck.vehicle_id;
                                                const plate  = truck.licensePlate || truck.license_plate || truck.plate || '-';
                                                const driver = truck.driverName || truck.driver_name || '—';
                                                const isActive = truck.status === 'Available';
                                                return (
                                                    <div key={vid} className={`flex items-center gap-2 px-3 py-2 border-b border-white/5 last:border-0 ${!isActive ? 'opacity-50' : ''}`}>
                                                        {/* Status dot */}
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}`}></div>
                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-white truncate">{plate}</p>
                                                            <p className="text-[10px] text-slate-400 truncate">{driver}</p>
                                                        </div>
                                                        {/* Toggle button */}
                                                        <button
                                                            onClick={() => handleToggleFleetStatus(vid, truck.status)}
                                                            className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors ${
                                                                isActive
                                                                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400'
                                                                    : 'bg-slate-700 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400'
                                                            }`}
                                                            title={isActive ? 'Set Maintenance' : 'Aktifkan'}
                                                        >
                                                            {isActive ? 'Aktif' : 'Maint.'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
                                            <td className="py-3 font-bold dark:text-white">{route.kendaraan || '-'}</td>
                                            <td className="py-3 text-slate-600 dark:text-slate-300">{route.driver_name || '-'}</td>
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