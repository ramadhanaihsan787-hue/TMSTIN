// driverappdashboardpage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../shared/components/Header';
import { useDriverappFlow } from '../hooks/useDriverappFlow';
import { driverappService } from '../services/driverappService';
import { toast } from 'sonner';

const DriverDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [startKm, setStartKm] = useState('');
    
    // 🌟 NYEDOT DATA DARI BACKEND
    const { startRoute, isLoading, tripData } = useDriverappFlow();
    
    // Hitung progress beneran
    const totalStops = tripData?.total_stops || 0;
    const completedCount = tripData?.completed_stops || 0;
    const progressPercent = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

    // ==========================================
    // 🌟 FIX CTO: AMBIL REAL TIME DARI BACKEND
    // ==========================================
    const stopsArray = tripData?.stops || [];
    let estFinishTime = '--';

    if (stopsArray.length > 0) {
        // Ambil elemen paling terakhir dari array rute (Jam pulang depo / Toko terakhir)
        const lastStop = stopsArray[stopsArray.length - 1];
        estFinishTime = lastStop.timeWindow || '--';
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#1a1c1e] font-sans transition-colors duration-300">
            <Header title="Dashboard" />
            
            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                {/* Truck Info Card */}
                <div className="bg-white dark:bg-[#2c2e33] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">calendar_today</span>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                {new Date().toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold dark:text-white mb-2">Truck ID: <span className="text-primary">{tripData?.truck_id || 'Memuat...'}</span></h3>
                    <div className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold tracking-wide">
                        {isLoading ? 'MEMUAT DATA...' : 'READY FOR DEPARTURE'}
                    </div>
                    
                    <div className="mt-6 aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner">
                        <img 
                            src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=2075&auto=format&fit=crop" 
                            alt="Truck" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Progress Section */}
                <div className="bg-white dark:bg-[#2c2e33] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-primary text-2xl font-bold">route</span>
                        <h4 className="text-lg font-bold dark:text-white">Route Progress</h4>
                    </div>
                    
                    <div className="flex justify-between items-end mb-2">
                        <p className="text-2xl font-bold dark:text-white">{completedCount} <span className="text-slate-400 text-base font-normal">of {totalStops} visits completed</span></p>
                        <p className="text-xl font-bold text-primary">{progressPercent}%</p>
                    </div>
                    
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    
                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Distance</span>
                            <span className="text-lg font-bold dark:text-white">{tripData?.total_distance || 0} km</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            {/* 🌟 FIX CTO: Label diganti jadi Est. Kepulangan biar supir tau itu jam kelar */}
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Est. Kepulangan</span>
                            <span className="text-lg font-bold dark:text-white">{estFinishTime}</span>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 pb-12 space-y-4">
                    <div className="bg-white dark:bg-[#2c2e33] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <label htmlFor="startKm" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Catat Odometer Awal (KM)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                id="startKm"
                                value={startKm}
                                onChange={(e) => setStartKm(e.target.value)}
                                placeholder="Contoh: 12500"
                                className="w-full bg-slate-50 dark:bg-[#1a1c1e] border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 text-lg font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">KM</span>
                        </div>
                    </div>

                    <button 
                        onClick={async () => {
                            if (!startKm) { toast.error('Isi odometer awal dahulu!'); return; }
                            localStorage.setItem('driver_start_km', startKm);
                            if (tripData?.route_id) {
                                try {
                                    await driverappService.startTrip(tripData.route_id, Number(startKm));
                                    toast.success(`Perjalanan dimulai — KM ${Number(startKm).toLocaleString('id-ID')}`);
                                } catch {
                                    toast.warning('Gagal sync ke server, data tersimpan lokal');
                                }
                            }
                            startRoute();
                            navigate('/driver/routes');
                        }}
                        disabled={!startKm}
                        className={`w-full h-16 ${startKm ? 'bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'} rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3`}
                    >
                        <span className="material-symbols-outlined text-2xl">play_arrow</span>
                        MULAI PERJALANAN
                    </button>
                </div>
            </main>
        </div>
    );
};

export default DriverDashboard;