import React, { useState, useEffect } from 'react';
import { api } from '../../../shared/services/apiClient'; // 🌟 IMPORT API KITA
import type { DriverPerformance } from '../types'; // Boleh dibiarin kalau ada, tapi kita pake 'any' dulu sementara

export default function DriverPerformanceTable() {
    // 🌟 STATE MANDIRI BUAT NARIK DATA API
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDriverPerformance = async () => {
            try {
                // Nembak ke endpoint yang tadi kita bikin di driver.py
                const response = await api.get('/api/driver/performance');
                if (response.data.status === 'success') {
                    setDrivers(response.data.data);
                }
            } catch (error) {
                console.error("Gagal narik data Driver Performance:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDriverPerformance();
    }, []);
    
    // Bikin pembuat avatar otomatis yang kebal error (anti .split crash)
    const getAvatar = (name: string) => {
        const safeName = (name || "Driver").replace(/\s/g, '+');
        return `https://ui-avatars.com/api/?name=${safeName}&background=0D8ABC&color=fff`;
    };

    return (
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-slate-200 dark:border-[#333] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#333] flex items-center justify-between">
                <h4 className="font-bold text-[#111] dark:text-white">Driver Efficiency Performance</h4>
                <button className="text-sm text-primary font-medium hover:underline">View All Drivers</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-[#0a0a0a]">
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Driver Name</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Trips</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">On-time Rate (%)</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Fuel Rating</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                    <span className="material-symbols-outlined animate-spin text-primary block mb-2 text-2xl">refresh</span>
                                    Loading driver performance data...
                                </td>
                            </tr>
                        ) : drivers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                    <span className="material-symbols-outlined block mb-2 text-2xl opacity-50">person_off</span>
                                    No driver data available yet.
                                </td>
                            </tr>
                        ) : (
                            drivers.map((driver, index) => {
                                // Jembatan data: Antisipasi nama variabel beda dari Backend
                                const name = driver.name || driver.driverName || driver.nama_supir || "Unknown Driver";
                                const trips = driver.totalTrips || driver.trips || driver.total_rute || 0;
                                const onTime = driver.onTimeRate || driver.ontime || driver.on_time_rate || "0%";
                                const fuel = driver.fuelRating || driver.fuel_economy || driver.rating_bbm || "-";
                                const avatar = driver.avatar || getAvatar(name);

                                return (
                                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                                <span className="font-bold text-slate-800 dark:text-white">{name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-600 dark:text-slate-300 font-medium">{trips} Trips</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold ${parseFloat(onTime) >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                                                {onTime}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold text-xs">
                                                {fuel}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}