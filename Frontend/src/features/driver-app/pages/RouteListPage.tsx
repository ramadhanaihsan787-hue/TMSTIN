import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../shared/components/Header';
import { useDriverStore } from '../../../store/useDriverStore';
import { useDriverappFlow } from '../hooks/useDriverappFlow';

const DriverRouteList: React.FC = () => {
    const navigate = useNavigate();
    const { tripData, isLoading } = useDriverStore();
    const { viewStopDetail } = useDriverappFlow();

    // Backend sudah filter sequence > 0 — semua stops valid, tidak perlu filter lagi
    const stops = tripData?.stops || [];

    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        completed: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'SELESAI' },
        active:    { bg: 'bg-primary/10',   text: 'text-primary',   label: 'ACTIVE ROUTE' },
        pending:   { bg: 'bg-slate-500/10', text: 'text-slate-400', label: 'PENDING' },
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#1a1c1e] font-sans transition-colors duration-300">
            <Header title="Daily Route" />

            <main className="max-w-md mx-auto px-4 py-6 space-y-3">

                {/* Info progress + tombol akhiri manual */}
                <div className="flex items-center justify-between px-1">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        {tripData
                            ? `${tripData.completed_stops} / ${tripData.total_stops} stop selesai`
                            : 'Memuat...'
                        }
                    </p>
                    <button
                        onClick={() => navigate('/driver/summary')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">flag</span>
                        Akhiri Perjalanan
                    </button>
                </div>

                {/* Depot — selalu completed saat trip mulai */}
                <div className="bg-slate-100 dark:bg-[#2c2e33]/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="text-slate-400 bg-slate-200 dark:bg-slate-800 rounded-full p-2">
                            <span className="material-symbols-outlined text-xl">check_circle</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-slate-500 dark:text-slate-400 font-bold line-through">0. Gudang Pusat JAPFA</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Completed</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="text-center py-12 text-slate-400">
                        <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
                        <p className="mt-2 font-bold">Memuat rute...</p>
                    </div>
                )}

                {/* Stops dari API */}
                {!isLoading && stops.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <span className="material-symbols-outlined text-4xl">route</span>
                        <p className="mt-2 font-bold">Tidak ada stop hari ini</p>
                    </div>
                )}

                {!isLoading && stops.map((stop: any) => {
                    const isActive    = stop.status === 'active';
                    const isCompleted = stop.status === 'completed';
                    const cfg         = statusConfig[stop.status] || statusConfig.pending;

                    return (
                        <div
                            key={stop.id}
                            className={`rounded-3xl p-6 border-2 transition-all ${
                                isActive
                                    ? 'bg-white dark:bg-[#2c2e33] border-primary shadow-xl shadow-primary/10'
                                    : isCompleted
                                        ? 'bg-slate-50 dark:bg-[#2c2e33]/40 border-slate-200 dark:border-slate-800 opacity-60'
                                        : 'bg-white dark:bg-[#2c2e33] border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Nomor urut */}
                                <div className={`rounded-2xl w-12 h-12 flex items-center justify-center font-bold text-xl shadow-lg flex-shrink-0 ${
                                    isActive    ? 'bg-primary text-white shadow-primary/30' :
                                    isCompleted ? 'bg-slate-300 dark:bg-slate-700 text-slate-500' :
                                                  'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                }`}>
                                    {isCompleted
                                        ? <span className="material-symbols-outlined text-lg">check</span>
                                        : stop.urutan
                                    }
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Nama toko */}
                                    <h3 className="text-base font-bold dark:text-white leading-tight truncate mb-2">
                                        {stop.customerName || stop.nama_toko || stop.storeName || 'Toko'}
                                    </h3>

                                    {/* Jam + status */}
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        {stop.timeWindow && (
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                                                <span className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-slate-500'}`}>
                                                    {stop.timeWindow}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Badge status + berat */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text} border border-current/20 uppercase tracking-widest`}>
                                            {isActive && (
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                </span>
                                            )}
                                            {cfg.label}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${stop.has_realisasi ? 'text-teal-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {stop.weight}
                                            {stop.has_realisasi && <span className="ml-1">✓</span>}
                                        </span>
                                    </div>

                                    {/* Tombol aksi — muncul di semua stop yang belum selesai */}
                                    {!isCompleted && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => navigate('/driver/navigation')}
                                                className="flex-1 bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                            >
                                                <span className="material-symbols-outlined text-lg">navigation</span>
                                                Navigate
                                            </button>
                                            <button
                                                onClick={() => viewStopDetail(stop)}
                                                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                                            >
                                                <span className="material-symbols-outlined text-lg">info</span>
                                                Details
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Spacer bawah */}
                <div className="h-20"></div>
            </main>

            {/* Bottom nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1c1e] border-t border-slate-200 dark:border-slate-800 flex justify-around py-3 max-w-md mx-auto">
                <button
                    onClick={() => navigate('/driver')}
                    className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors"
                >
                    <span className="material-symbols-outlined">history</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">HISTORY</span>
                </button>
            </div>
        </div>
    );
};

export default DriverRouteList;