import React, { useEffect, useState } from 'react';
import PodSidebar from "../../../shared/components/Sidebar";
import Header from '../../../shared/components/Header';

export default function Dashboard() {
    const [podStats, setPodStats] = useState<any>(null);
    useEffect(() => {
        import('../../../shared/services/apiClient').then(({ api }) => {
            api.get('/api/pod/stats')
               .then(r => setPodStats(r.data?.data || r.data))
               .catch(() => {});
        });
    }, []);

    return (
        <div className="flex h-screen overflow-hidden relative bg-main-bg dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 antialiased font-display transition-colors">
            <PodSidebar />
            <main className="flex-1 overflow-y-auto flex flex-col bg-slate-50 dark:bg-[#111111] transition-colors">
                <Header title="Daily POD Verification Dashboard" />

                {/* Content Body */}
                <div className="p-8 flex flex-col gap-8">
                    {/* KPI Cards Row */}
                    <div className="grid grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Verification</span>
                                <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-primary">
                                    <span className="material-symbols-outlined">pending_actions</span>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">142</h3>
                                <span className="text-slate-400 text-sm font-bold flex items-center">
                                    Queue
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Requires manual review</p>
                        </div>

                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Auto-Verified</span>
                                <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-lg text-green-500 dark:text-green-400">
                                    <span className="material-symbols-outlined">verified</span>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{podStats?.auto_verified_pct != null ? `${podStats.auto_verified_pct}%` : "—"}</h3>
                                <span className="text-green-500 dark:text-green-400 text-sm font-bold flex items-center">
                                    <span className="material-symbols-outlined text-xs">arrow_upward</span> 2.1%
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">System approved PODs</p>
                        </div>

                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rejected PODs</span>
                                <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-500 dark:text-red-400">
                                    <span className="material-symbols-outlined">cancel</span>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">24</h3>
                                <span className="text-red-500 dark:text-red-400 text-sm font-bold flex items-center">
                                    <span className="material-symbols-outlined text-xs">arrow_upward</span> 5
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Today's invalid submissions</p>
                        </div>

                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg. Processing</span>
                                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-500 dark:text-blue-400">
                                    <span className="material-symbols-outlined">speed</span>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">1.2 <span className="text-xl">mins</span></h3>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Per manual verification</p>
                        </div>
                    </div>

                    {/* Middle Section: Verification Queue */}
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
                                            <th className="pb-3 font-semibold">Resi Number</th>
                                            <th className="pb-3 font-semibold">Driver</th>
                                            <th className="pb-3 font-semibold">Time Uploaded</th>
                                            <th className="pb-3 font-semibold">Flag Reason</th>
                                            <th className="pb-3 font-semibold text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-4 font-bold text-primary">JPF-2403-8891</td>
                                            <td className="py-4">Eko Prasetyo</td>
                                            <td className="py-4">10 mins ago</td>
                                            <td className="py-4">
                                                <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 rounded text-xs font-bold">Image Blurry</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <button className="text-primary hover:text-primary/80 font-semibold px-3 py-1 border border-primary/20 rounded-md">Review</button>
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-4 font-bold text-primary">JPF-2403-8895</td>
                                            <td className="py-4">Budi Santoso</td>
                                            <td className="py-4">15 mins ago</td>
                                            <td className="py-4">
                                                <span className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 rounded text-xs font-bold">GPS Mismatch</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <button className="text-primary hover:text-primary/80 font-semibold px-3 py-1 border border-primary/20 rounded-md">Review</button>
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-4 font-bold text-primary">JPF-2403-8902</td>
                                            <td className="py-4">Agus Wijaya</td>
                                            <td className="py-4">22 mins ago</td>
                                            <td className="py-4">
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 rounded text-xs font-bold">Missing Signature</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <button className="text-primary hover:text-primary/80 font-semibold px-3 py-1 border border-primary/20 rounded-md">Review</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}