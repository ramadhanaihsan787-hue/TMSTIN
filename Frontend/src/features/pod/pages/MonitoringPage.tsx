import React, { useState } from "react";
import { toast } from 'sonner'; // 🌟 SUNTIKAN SONNER!
import Header from "../../../shared/components/Header";
import { ActionMenu } from "../components";
import { usePod } from '../hooks/usePod'; 

export default function MonitoringPage() {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [openActionId, setOpenActionId] = useState<number | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);

    const { orders, isLoading, error } = usePod();

    const totalTarget = orders.length;
    const verifiedCount = orders.filter(o => o.status === 'do_verified').length; 
    const waitingCount = totalTarget - verifiedCount;
    const progressPercentage = totalTarget === 0 ? 0 : Math.round((verifiedCount / totalTarget) * 100);

    return (
        <React.Fragment>
            <Header title="Monitoring Harian" />

            <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Target</p>
                                <p className="text-3xl font-bold mt-1">{isLoading ? '...' : totalTarget}</p>
                            </div>
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined">assignment</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-4">Dokumen POD hari ini</p>
                    </div>

                    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">POD Progress</p>
                                <p className="text-3xl font-bold mt-1">
                                    {isLoading ? '...' : verifiedCount}
                                    <span className="text-sm font-normal text-slate-400">/{totalTarget}</span>
                                </p>
                            </div>
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <span className="material-symbols-outlined">trending_up</span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                            </div>
                            <p className="text-xs text-primary font-semibold mt-2">{progressPercentage}% Tercapai</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Waiting for Driver</p>
                                <p className="text-3xl font-bold mt-1">{isLoading ? '...' : waitingCount}</p>
                            </div>
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
                                <span className="material-symbols-outlined">pending_actions</span>
                            </div>
                        </div>
                        <p className="text-xs text-amber-600 font-medium mt-4">Menunggu upload berkas</p>
                    </div>

                    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Verified</p>
                                <p className="text-3xl font-bold mt-1">{isLoading ? '...' : verifiedCount}</p>
                            </div>
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                                <span className="material-symbols-outlined">verified</span>
                            </div>
                        </div>
                        <p className="text-xs text-emerald-600 font-medium mt-4">Selesai divalidasi admin</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#1a1a1a]">
                        <h3 className="font-bold text-lg dark:text-white">Tabel Pemantauan Truk</h3>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-slate-700 rounded-lg transition-colors active:scale-95">
                                        <span className="material-symbols-outlined text-base">filter_list</span> Filter
                                    </button>
                                    {isFilterOpen && (
                                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl shadow-lg z-20 overflow-hidden text-left">
                                            <div className="p-3 border-b border-slate-100 dark:border-[#333]">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter By Route</p>
                                            </div>
                                            <div className="p-2 flex flex-col gap-1">
                                                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-[#222] rounded-lg cursor-pointer transition-colors">
                                                    <input type="checkbox" className="rounded text-primary focus:ring-primary" />
                                                    <span className="text-sm dark:text-slate-300">Inner City</span>
                                                </label>
                                                <label className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-[#222] rounded-lg cursor-pointer transition-colors">
                                                    <input type="checkbox" className="rounded text-primary focus:ring-primary" />
                                                    <span className="text-sm dark:text-slate-300">Inter-city</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* 🌟 FIX CTO: Ganti alert jadi toast.info */}
                                <button onClick={() => toast.info("Fitur Export segera hadir!")} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors active:scale-95">
                                    <span className="material-symbols-outlined text-base">download</span> Export
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-[#222] text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Plat Nomor / Driver</th>
                                    <th className="px-6 py-4 font-semibold">Route</th>
                                    <th className="px-6 py-4 font-semibold">POD Progress</th>
                                    <th className="px-6 py-4 font-semibold">Status Terkini</th>
                                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                
                                {isLoading && (
                                    <tr><td colSpan={5} className="py-8 text-center text-slate-500 font-bold">Memuat data monitoring... ⏳</td></tr>
                                )}
                                {error && (
                                    <tr><td colSpan={5} className="py-8 text-center text-red-500 font-bold">🚨 Gagal memuat data</td></tr>
                                )}

                                {!isLoading && !error && orders.length > 0 && (
                                    <React.Fragment>
                                        <tr className="bg-slate-50/50 dark:bg-[#222]/50 hover:bg-slate-100 dark:hover:bg-[#333] transition-colors cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-400 transition-transform" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                                        expand_more
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-slate-100">BELUM DIALOKASIKAN</p>
                                                        <p className="text-xs text-slate-500">Menunggu Hasil Routing VRP</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm dark:text-slate-300 italic text-slate-500">Multi-drop (Auto)</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                        <div className="bg-primary h-full" style={{ width: "0%" }}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">0/{orders.length}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                    Menunggu VRP
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <ActionMenu 
                                                        id={999} 
                                                        currentOpenId={openActionId} 
                                                        setOpenId={setOpenActionId} 
                                                        items={[
                                                            // 🌟 FIX CTO: Ganti alert jadi toast.info
                                                            { icon: 'route', label: 'Jalankan VRP Engine', onClick: () => toast.info('Fitur VRP segera hadir!') }
                                                        ]}
                                                    />
                                                </div>
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr className="bg-white dark:bg-[#1a1a1a] border-l-4 border-primary">
                                                <td className="px-6 py-0" colSpan={5}>
                                                    <div className="pl-12 py-6 space-y-4">
                                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Detail Stop & Dokumen ({orders.length} Titik)</p>
                                                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                                            
                                                            {orders.map((order, index) => {
                                                                const isVerified = order.status === 'do_verified' || order.status === 'pod_verified';
                                                                const boxStyle = isVerified 
                                                                    ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/10" 
                                                                    : "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/10";
                                                                const iconColor = isVerified ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" : "text-amber-600 bg-amber-100 dark:bg-amber-900/30";
                                                                const iconName = isVerified ? "check_circle" : "hourglass_empty";
                                                                const badgeStyle = isVerified 
                                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
                                                                const badgeText = isVerified ? "Verified" : "Waiting Admin";

                                                                return (
                                                                    <div key={order.order_id} className={`flex items-center justify-between p-3 rounded-lg border ${boxStyle}`}>
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-8 h-8 rounded flex items-center justify-center ${iconColor}`}>
                                                                                <span className="material-symbols-outlined text-lg">{iconName}</span>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-bold dark:text-slate-200">Stop {(index + 1).toString().padStart(2, '0')} - {order.customer_name}</p>
                                                                                <p className="text-xs text-slate-500">{order.order_id} • Berat: {order.weight_total} KG</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-6">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeStyle}`}>{badgeText}</span>
                                                                            
                                                                            {!isVerified ? (
                                                                                // 🌟 FIX CTO: Ganti alert jadi toast.info
                                                                                <button onClick={() => toast.info("Menuju halaman verifikasi...")} className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer active:scale-95">Verify Now</button>
                                                                            ) : (
                                                                                <ActionMenu 
                                                                                    id={`doc-${order.order_id}` as any} 
                                                                                    currentOpenId={openActionId} 
                                                                                    setOpenId={setOpenActionId} 
                                                                                    items={[
                                                                                        // 🌟 FIX CTO: Ganti alert jadi toast.info
                                                                                        { icon: 'description', label: 'View Document', onClick: () => toast.info('Lihat Dokumen: ' + order.order_id) }
                                                                                    ]}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )}

                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#1a1a1a]">
                        <p className="text-sm text-slate-500 italic">Menampilkan {orders.length > 0 ? 1 : 0}-{orders.length} DO yang belum dialokasikan</p>
                        <div className="flex items-center gap-1">
                            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#222] rounded-lg transition-colors"><span className="material-symbols-outlined">first_page</span></button>
                            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#222] rounded-lg transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
                            <button className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded font-bold text-xs">1</button>
                            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#222] rounded-lg transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
                            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#222] rounded-lg transition-colors"><span className="material-symbols-outlined">last_page</span></button>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}