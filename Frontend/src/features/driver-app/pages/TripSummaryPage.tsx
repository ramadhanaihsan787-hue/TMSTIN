// src/features/driver-app/pages/TripSummaryPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../shared/components/Header';
import { useDriverappFlow } from '../hooks/useDriverappFlow';
import { driverappService } from '../services/driverappService';
import { toast } from 'sonner';
import { api } from '../../../shared/services/apiClient';

const DriverTripSummary: React.FC = () => {
    const navigate  = useNavigate();
    const { endTrip, tripData } = useDriverappFlow();

    const [endKm,    setEndKm]    = useState('');
    const [startKm,  setStartKm]  = useState(0);
    const [isEnding, setIsEnding] = useState(false);

    // Geofence jembatan timbang
    const [autoLockedTime, setAutoLockedTime] = useState<string | null>(null);
    const [gpsCoords, setGpsCoords]           = useState<{ lat: number; lon: number } | null>(null);
    const [inRadius,  setInRadius]             = useState(false);
    const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
    const watchIdRef  = useRef<number | null>(null);
    const inRadiusRef = useRef(false);

    // Ambil settings jembatan timbang
    const [jtSettings, setJtSettings] = useState<{
        lat: number | null; lon: number | null; radius: number;
    }>({ lat: null, lon: null, radius: 100 });

    useEffect(() => {
        const storedKm = localStorage.getItem('driver_start_km');
        if (storedKm) setStartKm(Number(storedKm));

        // Fetch koordinat jembatan timbang dari settings
        api.get('/api/settings').then(res => {
            const d = res.data?.data || res.data;
            setJtSettings({
                lat:    d?.jembatan_timbang_lat    ?? null,
                lon:    d?.jembatan_timbang_lon    ?? null,
                radius: d?.jembatan_timbang_radius_m ?? 100,
            });
        }).catch(() => {});
    }, []);

    // Haversine distance (meter)
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180)
            * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Watch GPS — mulai saat halaman dibuka, kalau settings ada
    useEffect(() => {
        if (!jtSettings.lat || !jtSettings.lon) return;
        if (!navigator.geolocation) return;

        const handlePos = (pos: GeolocationPosition) => {
            const { latitude, longitude } = pos.coords;
            setGpsCoords({ lat: latitude, lon: longitude });

            const dist = haversine(latitude, longitude, jtSettings.lat!, jtSettings.lon!);
            const now  = new Date().toTimeString().slice(0, 5);

            if (dist <= jtSettings.radius) {
                setInRadius(true);
                if (!inRadiusRef.current) {
                    inRadiusRef.current = true;
                    // Mulai timer 10 detik
                    timerRef.current = setTimeout(() => {
                        setAutoLockedTime(now);
                        toast.success('🎯 Jam pulang otomatis terkunci di jembatan timbang!');
                    }, 10_000);
                }
            } else {
                setInRadius(false);
                if (inRadiusRef.current) {
                    inRadiusRef.current = false;
                    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
                }
            }
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            handlePos,
            () => {},
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [jtSettings]);

    const calculatedDistance = endKm && !isNaN(Number(endKm)) && Number(endKm) > startKm
        ? Number(endKm) - startKm
        : 0;

    const completed = tripData?.completed_stops || 0;
    const total     = tripData?.total_stops || 0;

    const handleFinishTrip = useCallback(async () => {
        if (!endKm) { toast.error('Isi odometer akhir dahulu!'); return; }
        setIsEnding(true);
        try {
            const lat = gpsCoords?.lat ?? 0;
            const lon = gpsCoords?.lon ?? 0;
            if (tripData?.route_id) {
                await driverappService.endTrip(tripData.route_id, Number(endKm), lat, lon);
                toast.success('Perjalanan selesai! Data tersimpan ke sistem.');
            }
        } catch {
            toast.warning('Gagal sync ke server, lanjut proses.');
        } finally {
            localStorage.removeItem('driver_start_km');
            endTrip();
            navigate('/driver');
            setIsEnding(false);
        }
    }, [endKm, gpsCoords, tripData, endTrip, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#1a1c1e] font-sans transition-colors duration-300">
            <Header title="Trip Summary" />
            <main className="max-w-md mx-auto px-4 py-8 flex flex-col items-center gap-6">

                {/* Status card */}
                <div className="bg-white dark:bg-[#2c2e33] rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-6 w-full">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[60px] font-bold">thumb_up</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold dark:text-white">Pengiriman Selesai!</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Kerja bagus, {tripData?.driver_name || 'Driver'}. Silakan akhiri perjalanan.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-primary mb-1">route</span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Jarak</p>
                            <p className="text-xl font-bold text-primary">{calculatedDistance > 0 ? calculatedDistance : (tripData?.total_distance || 0)} KM</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-primary mb-1">check_circle</span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Selesai</p>
                            <p className="text-xl font-bold text-primary">{completed} / {total}</p>
                        </div>
                    </div>
                </div>

                {/* Geofence status (hanya tampil kalau ada setting jembatan timbang) */}
                {jtSettings.lat && (
                    <div className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-sm font-bold
                        ${autoLockedTime
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                            : inRadius
                                ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                        <span className="material-symbols-outlined text-[18px]">
                            {autoLockedTime ? 'gps_fixed' : inRadius ? 'my_location' : 'location_searching'}
                        </span>
                        <span>
                            {autoLockedTime
                                ? `✓ Jam pulang dikunci otomatis: ${autoLockedTime}`
                                : inRadius
                                    ? 'Terdeteksi di jembatan timbang — mengunci jam dalam 10 detik...'
                                    : 'Mendeteksi posisi jembatan timbang...'}
                        </span>
                    </div>
                )}

                {/* Input odometer akhir */}
                <div className="w-full bg-white dark:bg-[#2c2e33] rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                    <label htmlFor="endKm" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                        Catat Odometer Akhir (KM)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            id="endKm"
                            value={endKm}
                            onChange={e => setEndKm(e.target.value)}
                            placeholder={`Awal: ${startKm.toLocaleString('id-ID')} KM`}
                            className="w-full bg-slate-50 dark:bg-[#1a1c1e] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4 text-lg font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">KM</span>
                    </div>
                    {startKm > 0 && endKm && Number(endKm) > startKm && (
                        <p className="text-xs text-primary font-semibold mt-2">
                            Jarak tempuh: {(Number(endKm) - startKm).toLocaleString('id-ID')} KM
                        </p>
                    )}
                </div>

                {/* Tombol selesai */}
                <button
                    onClick={handleFinishTrip}
                    disabled={!endKm || isEnding}
                    className={`w-full h-16 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3
                        ${endKm
                            ? 'bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                >
                    {isEnding
                        ? <><span className="material-symbols-outlined animate-spin">sync</span> Menyimpan...</>
                        : <><span className="material-symbols-outlined text-2xl">flag</span> Akhiri Perjalanan</>}
                </button>
            </main>
        </div>
    );
};

export default DriverTripSummary;