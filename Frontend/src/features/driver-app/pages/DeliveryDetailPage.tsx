import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../shared/components/Header';
import { useDriverStore } from '../../../store/useDriverStore';
import { driverappService } from '../services/driverappService';
import { toast } from 'sonner';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function DeliveryDetailPage() {
    const navigate  = useNavigate();
    const { activeStop, fetchMyRoute } = useDriverStore();

    // Fallback kalau akses langsung tanpa activeStop
    if (!activeStop) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#1a1c1e] flex flex-col">
                <Header title="Stop Detail" />
                <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-5xl">route</span>
                        <p className="mt-2 font-bold">Tidak ada stop aktif</p>
                        <button onClick={() => navigate('/driver/routes')}
                            className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-bold">
                            Kembali ke Rute
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const lat = activeStop.latitude  || (activeStop as any).lat || 0;
    const lon = activeStop.longitude || (activeStop as any).lon || (activeStop as any).lng || 0;
    const hasCoords = lat !== 0 && lon !== 0;

    const handleArrived = async () => {
        try {
            await driverappService.updateStopStatus(activeStop.id, 'arrived');
            await fetchMyRoute();
            navigate('/driver/pod');
        } catch {
            toast.error('Gagal update status. Coba lagi.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#1a1c1e] font-sans">
            <Header title="Stop Detail" />

            <main className="max-w-md mx-auto px-4 py-6 space-y-4 pb-32">

                {/* Info Toko */}
                <div className="bg-white dark:bg-[#2c2e33] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Name</p>
                        <p className="text-lg font-bold dark:text-white">
                            {(activeStop as any).customerName || (activeStop as any).nama_toko || 'Toko'}
                        </p>
                    </div>

                    {(activeStop as any).address && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Address</p>
                            <p className="text-sm dark:text-slate-300 leading-relaxed">
                                {(activeStop as any).address}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Muatan</p>
                            <p className={`text-base font-bold ${(activeStop as any).has_realisasi ? 'text-teal-400' : 'dark:text-white'}`}>
                                {activeStop.weight}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jam Tiba</p>
                            <p className="text-base font-bold dark:text-white">{activeStop.timeWindow || '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Peta */}
                {hasCoords && (
                    <div className="bg-white dark:bg-[#2c2e33] rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="h-48">
                            <Map
                                initialViewState={{ longitude: lon, latitude: lat, zoom: 15 }}
                                style={{ width: '100%', height: '100%' }}
                                mapStyle="mapbox://styles/mapbox/navigation-night-v1"
                                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                                interactive={false}
                            >
                                <Marker longitude={lon} latitude={lat} anchor="bottom">
                                    <span className="material-symbols-outlined text-primary text-3xl drop-shadow-lg">
                                        location_on
                                    </span>
                                </Marker>
                            </Map>
                        </div>
                        <div className="px-4 py-2 text-xs text-slate-400 font-mono">
                            📍 {lat.toFixed(6)}, {lon.toFixed(6)}
                        </div>
                    </div>
                )}
            </main>

            {/* Tombol aksi fixed di bawah */}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 pt-3 bg-slate-50/95 dark:bg-[#1a1c1e]/95 backdrop-blur space-y-3">
                <button
                    onClick={() => navigate('/driver/navigation')}
                    className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">navigation</span>
                    MULAI NAVIGASI
                </button>
                <button
                    onClick={handleArrived}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                >
                    <span className="material-symbols-outlined">where_to_vote</span>
                    SAYA SUDAH TIBA
                </button>
            </div>
        </div>
    );
}