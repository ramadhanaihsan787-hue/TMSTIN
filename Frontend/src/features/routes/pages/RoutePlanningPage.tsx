import { useState } from "react";
import { useRoutePlanningState } from "../hooks/useRoutePlanningState";
import RouteSummaryCards from "../components/RouteSummaryCards";
import RouteToolbar from "../components/RouteToolbar";
import RouteMap from "../components/RouteMap";
import RouteDetailPanel from "../components/RouteDetailPanel";
import RouteDispatchModal from "../components/RouteDispatchModal";
import RouteLoadingOverlay from "../components/RouteLoadingOverlay";
import RoutePreviewModal from "../components/RoutePreviewModal";
import UploadVerificationModal from "../components/UploadVerificationModal";
import TruckList from "../components/TruckList";

export default function RoutePlanning() {
    const {
        isUploading, isOptimizing, isFocusMode, setIsFocusMode, viewMode, setViewMode,
        routeMessage, isReassignMode,
        reassignHistory, selectedRouteId, setSelectedRouteId,
        previewData, setPreviewData, activeModal, setActiveModal,
        selectedDate, setSelectedDate, showVerificationModal,
        setShowVerificationModal, uploadReport, trafficWarnings, loadingProgress,
        displayRoutes, selectedRoute, totalCost, totalRealDistance, totalFleet, totalOrders, hasDummyData,
        exitReassignMode, handleFileUpload, handleTimeChange,
        handleUpdateWeight, handleUpdateSuccessCoord, handleSaveCoord,
        handleOptimizeRoute, handleConfirmSaveRoute
    } = useRoutePlanningState();

    const [dispatchDraft, setDispatchDraft] = useState<any>(null);
    const truckColors = ['#e11d48', '#0284c7', '#16a34a', '#d97706', '#9333ea', '#0d9488', '#0891b2'];

    return (
        <div className="p-4 md:p-8 space-y-6">
            
            {/* Banner info message */}
            {routeMessage && (
                <div className={`px-5 py-3 rounded-xl text-sm font-bold border flex items-center gap-3 shadow-sm ${String(routeMessage).includes('PERHATIAN') ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'}`}>
                    <span className="material-symbols-outlined text-xl">{String(routeMessage).includes('PERHATIAN') ? 'warning' : 'check_circle'}</span>
                    {String(routeMessage)}
                </div>
            )}

            {/* Header / Date filter / Upload bar */}
            <RouteToolbar 
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                isUploading={isUploading}
                onFileUpload={handleFileUpload}
            />

            {/* Summary Statistics Cards */}
            <RouteSummaryCards 
                totalCost={totalCost}
                totalDistance={totalRealDistance}
                totalFleet={totalFleet}
                totalOrders={totalOrders}
                onCardClick={setActiveModal}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-8 items-start pb-4">
                
                {/* Left Side: Truck Fleet List */}
                {!isFocusMode && (
                    <div className="col-span-3 space-y-4 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">local_shipping</span> Today's Fleet
                            </h3>
                        </div>
                        <TruckList 
                            routesData={displayRoutes as any} 
                            selectedRouteId={selectedRouteId} 
                            onSelectRoute={(id) => setSelectedRouteId(id)}
                            trafficWarnings={trafficWarnings as any}
                        />
                    </div>
                )}

                {/* Right Side: Route Sequence Timeline or Map/Live View */}
                <div className={`${isFocusMode ? 'col-span-12' : 'col-span-9'} space-y-4 transition-all duration-300`}>
                    
                    {/* Reassign banner controls */}
                    {isReassignMode && (
                        <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                                        <span className="material-symbols-outlined text-white text-xl">swap_horiz</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-violet-800 dark:text-violet-300 text-sm">Reassign Mode Active</h4>
                                        <p className="text-xs text-violet-500">Pilih rute truk baru pada menu dropdown di stop untuk memindahkan</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {reassignHistory.length > 0 && (
                                        <span className="text-xs font-bold text-violet-600 bg-violet-100 dark:bg-violet-900/40 px-3 py-1.5 rounded-lg">
                                            {reassignHistory.length} perubahan
                                        </span>
                                    )}
                                    <button onClick={() => exitReassignMode(false)} className="px-4 py-2 text-sm font-bold border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                                    <button onClick={() => exitReassignMode(true)} disabled={reassignHistory.length === 0} className="px-4 py-2 text-sm font-bold bg-violet-500 text-white rounded-lg hover:bg-violet-600 shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed">Simpan</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <RouteDetailPanel 
                        selectedRoute={selectedRoute}
                        isFocusMode={isFocusMode}
                        onToggleFocus={() => setIsFocusMode(!isFocusMode)}
                        showMapView={viewMode === 'map'}
                        onToggleMapView={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
                        mapComponent={
                            <RouteMap 
                                routesData={displayRoutes}
                                selectedRouteId={selectedRouteId}
                                truckColors={truckColors}
                                droppedNodesData={[]}
                                hasDummyData={hasDummyData}
                            />
                        }
                    />

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
                                    {displayRoutes.map((route, i) => (
                                        <tr key={i} className="border-b border-slate-100 dark:border-[#222] last:border-0 hover:bg-slate-50 dark:hover:bg-[#2A2A2A]">
                                            <td className="py-3 font-bold dark:text-white">{route.kendaraan}</td>
                                            <td className="py-3 text-slate-600 dark:text-slate-300">{route.driver_name}</td>
                                            {activeModal === 'cost' && <td className="py-3 text-right font-mono text-emerald-600">Rp {(route.total_distance_km * 3500).toLocaleString('id-ID')}</td>}
                                            {activeModal === 'distance' && <td className="py-3 text-right font-mono text-blue-500">{route.total_distance_km || '0'} KM</td>}
                                            {activeModal === 'fleet' && <td className="py-3 text-right text-slate-500">{route.jenis}</td>}
                                            {activeModal === 'stops' && <td className="py-3 text-right font-bold text-primary">{route.destinasi_jumlah} Toko</td>}
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

            {/* Custom High-Fidelity Loading Progression Overlay */}
            <RouteLoadingOverlay 
                isUploading={isUploading}
                isOptimizing={isOptimizing}
                loadingProgress={loadingProgress}
            />

            {/* Upload Verification Modal */}
            {showVerificationModal && uploadReport && (
                <UploadVerificationModal 
                    uploadReport={uploadReport as any}
                    onClose={() => setShowVerificationModal(false)}
                    onUpdateTime={handleTimeChange}
                    onUpdateWeight={handleUpdateWeight}
                    onUpdateSuccessCoord={handleUpdateSuccessCoord}
                    onSaveCoord={handleSaveCoord}
                    onOptimize={handleOptimizeRoute}
                />
            )}

            {/* AI Optimization Preview Modal */}
            {previewData && (
                <RoutePreviewModal 
                    previewData={previewData}
                    truckColors={truckColors}
                    onCancel={() => setPreviewData(null)}
                    onProceedDispatch={(draft) => {
                        setDispatchDraft(draft);
                        setPreviewData(null);
                    }}
                />
            )}

            {/* Penugasan Driver / Helper assignment Modal */}
            {dispatchDraft && (
                <RouteDispatchModal 
                    draftData={dispatchDraft}
                    onBack={() => {
                        setPreviewData(dispatchDraft);
                        setDispatchDraft(null);
                    }}
                    onConfirmSave={async (finalData) => {
                        await handleConfirmSaveRoute(finalData);
                        setDispatchDraft(null);
                    }}
                    isSaving={false}
                />
            )}

        </div>
    );
}