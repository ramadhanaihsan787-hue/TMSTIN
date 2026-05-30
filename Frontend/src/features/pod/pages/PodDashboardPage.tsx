import React, { useEffect, useState } from 'react';
import Header from "../../../shared/components/Header";
import { usePod } from '../hooks/usePod';
import { api } from '../../../shared/services/apiClient';

interface PodStats {
    pending:           number;
    auto_verified_pct: number;
    rejected_today:    number;
    total_completed:   number;
    avg_queue_mins:    number;
}

export default function PodDashboardPage() {
    const { orders, isLoading, error } = usePod();
    const [stats, setStats]     = useState<PodStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/api/pod/stats');
                setStats(res.data?.data || res.data);
            } catch { /* stats tidak kritis — silently fail */ }
            finally { setStatsLoading(false); }
        };
        fetchStats();
        // Refresh setiap 60 detik
        const interval = setInterval(fetchStats, 60_000);
        return () => clearInterval(interval);
    }, []);

    const fmt = (v: number | undefined, suffix = '') =>
        statsLoading ? '…' : v != null ? `${v}${suffix}` : '—';

    return (
        <React.Fragment>
            <Header title="Daily POD Verification Dashboard" />

            <div className="p-8 flex flex-col gap-8">
                {/* KPI Cards Row */}
                <div className="grid grid-cols-4 gap-6">
                    {/* Pending Verification — dari orders.length (real-time) */}
                    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Verification</span>
                            <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-primary">
                                <span className="material-symbols-outlined">pending_actions</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? '…' : orders.length}
                            </h3>
                            <span className="text-slate-400 text-sm font-bold">Queue</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Requires manual review</p>
                    </div>

                    {/* Auto-Verified % — dari stats API */}
                    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Auto-Verified</span>
                            <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-lg text-green-500 dark:text-green-400">
                                <span className="material-symbols-outlined">verified</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                                {statsLoading ? '…' : stats ? `${stats.auto_verified_pct}%` : '—'}
                            </h3>
                            {stats && stats.total_completed > 0 && (
                                <span className="text-green-500 dark:text-green-400 text-sm font-bold">
                                    {stats.total_completed} selesai
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                            {stats ? `${stats.total_completed} DO selesai hari ini` : 'System approved PODs'}
                        </p>
                    </div>

                    {/* Rejected PODs — dari stats API */}
                    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rejected PODs</span>
                            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-500 dark:text-red-400">
                                <span className="material-symbols-outlined">cancel</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                                {fmt(stats?.rejected_today)}
                            </h3>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Today's failed submissions</p>
                    </div>

                    {/* Avg Queue Time — dari stats API */}
                    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg. Queue Time</span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-500 dark:text-blue-400">
                                <span className="material-symbols-outlined">schedule</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                                {statsLoading ? '…'
                                    : stats && stats.avg_queue_mins > 0
                                        ? `${stats.avg_queue_mins}`
                                        : '—'}
                                {stats && stats.avg_queue_mins > 0 && (
                                    <span className="text-xl ml-1">mins</span>
                                )}
                            </h3>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                            {stats?.avg_queue_mins ? 'Rata-rata antrean menunggu review' : 'Belum ada antrean hari ini'}
                        </p>
                    </div>
                </div>

                {/* Verification Queue Table */}
                <div className="flex gap-6">
                    <div className="w-full bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Needs Manual Verification</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Review driver submitted proof of deliveries</p>
                            </div>
                            <button className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-sm hover:bg-primary/90 transition-colors">
                                Start Queue
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                                        <th className="pb-3 font-semibold whitespace-nowrap">Resi Number</th>
                                        <th className="pb-3 font-semibold whitespace-nowrap">Customer / Toko</th>
                                        <th className="pb-3 font-semibold whitespace-nowrap">Berat</th>
                                        <th className="pb-3 font-semibold whitespace-nowrap">Driver</th>
                                        <th className="pb-3 font-semibold whitespace-nowrap">Time Uploaded</th>
                                        <th className="pb-3 font-semibold whitespace-nowrap">Status</th>
                                        <th className="pb-3 font-semibold text-right whitespace-nowrap">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                                    {isLoading && (
                                        <tr><td colSpan={7} className="py-8 text-center text-slate-500 font-bold">Memuat data… ⏳</td></tr>
                                    )}
                                    {error && (
                                        <tr><td colSpan={7} className="py-8 text-center text-red-500 font-bold">🚨 {error}</td></tr>
                                    )}
                                    {!isLoading && !error && orders.length === 0 && (
                                        <tr><td colSpan={7} className="py-8 text-center text-slate-500 font-bold">Antrean kosong!</td></tr>
                                    )}
                                    {!isLoading && !error && orders.map((order) => (
                                        <tr key={order.order_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-4 font-bold text-primary whitespace-nowrap">{order.order_id}</td>
                                            <td className="py-4 min-w-[200px] font-medium">{order.customer_name}</td>
                                            <td className="py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">{order.weight_total} KG</td>
                                            <td className="py-4 text-slate-500 italic whitespace-nowrap">
                                                {(order as any).driver_name || 'Menunggu Supir…'}
                                            </td>
                                            <td className="py-4 text-slate-500 whitespace-nowrap">
                                                {(order as any).epod_timestamp
                                                    ? new Date((order as any).epod_timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                                    : '—'
                                                }
                                            </td>
                                            <td className="py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    order.status === 'delivered_pod_uploaded'
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                                        : order.status === 'do_verified'
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                                            : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                                                }`}>
                                                    {order.status === 'delivered_pod_uploaded'
                                                        ? '📷 FOTO DIKIRIM'
                                                        : order.status.replace(/_/g, ' ').toUpperCase()
                                                    }
                                                </span>
                                            </td>
                                            <td className="py-4 text-right whitespace-nowrap">
                                                <button className="text-primary hover:text-primary/80 font-semibold px-3 py-1 border border-primary/20 rounded-md transition-colors">
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}