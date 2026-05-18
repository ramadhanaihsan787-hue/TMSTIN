import { useState, useEffect } from 'react';
import { 
    Download, 
    Filter, 
    ChevronDown, 
    Eye, 
    FileText, 
    RefreshCcw,
    TrendingUp,
    TrendingDown,
    Minus
} from 'lucide-react';
import { api } from '../../../shared/services/apiClient';

export default function ReturnDashboard() {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [openActionId, setOpenActionId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [summaryData, setSummaryData] = useState({
        qualityKg: 0, qualityRupiah: 0, qualityTrend: 0,
        skuKg: 0, skuRupiah: 0, skuTrend: 0,
        custKg: 0, custRupiah: 0, custTrend: 0,
        totalReturnKg: 0
    });

    const [donutData, setDonutData] = useState({
        qualityPercent: 0, skuPercent: 0, custPercent: 0
    });

    const [fleetIncidentData, setFleetIncidentData] = useState<any[]>([]);
    const [auditData, setAuditData] = useState<any[]>([]);

    useEffect(() => {
        const fetchReturnData = async () => {
            try {
                const response = await api.get('/analytics/returns-dashboard');
                const resData = response.data;

                if (resData.status === "success") {
                    setSummaryData(resData.data?.summary || {
                        qualityKg: 0, qualityRupiah: 0, qualityTrend: 0,
                        skuKg: 0, skuRupiah: 0, skuTrend: 0,
                        custKg: 0, custRupiah: 0, custTrend: 0,
                        totalReturnKg: 0
                    });
                    
                    setDonutData(resData.data?.distribution || {
                        qualityPercent: 0, skuPercent: 0, custPercent: 0
                    });

                    setFleetIncidentData(resData.data?.fleet_performance || []);
                    setAuditData(resData.data?.audit_logs || []);
                }
            } catch (error) {
                console.error("Gagal narik data Return Dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReturnData();
    }, []);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
    const formatCurrency = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const renderTrend = (value: number) => {
        if (value > 0) return <><span className="material-symbols-outlined text-xs mr-0.5">arrow_upward</span> {value}% vs last month</>;
        if (value < 0) return <><span className="material-symbols-outlined text-xs mr-0.5">arrow_downward</span> {Math.abs(value)}% vs last month</>;
        return <>Stable vs last month</>;
    };

    const getTrendColor = (value: number, invertBadGood = false) => {
        if (value > 0) return invertBadGood ? "text-green-500 bg-green-50 dark:bg-green-500/10" : "text-red-500 bg-red-50 dark:bg-red-500/10";
        if (value < 0) return invertBadGood ? "text-red-500 bg-red-50 dark:bg-red-500/10" : "text-green-500 bg-green-50 dark:bg-green-500/10";
        return "text-gray-500 bg-gray-50 dark:bg-gray-800";
    };

    return (
        <div className={`space-y-8 animate-fadeIn transition-opacity duration-500 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
            {/* 1. Top Row: Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Quality Issues */}
                <div className="bg-white dark:bg-card-dark p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:border-japfa-orange/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-japfa-gray dark:text-gray-400 uppercase tracking-wider">Quality Standard Issues</span>
                            <span className="text-[10px] bg-orange-100 dark:bg-orange-500/20 text-japfa-orange px-2 py-0.5 rounded font-bold self-start uppercase">Production</span>
                        </div>
                        <div className="p-2 bg-orange-50 dark:bg-orange-500/10 text-japfa-orange rounded-lg">
                            <span className="material-symbols-outlined text-xl">high_quality</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-3xl font-extrabold text-japfa-dark dark:text-white">{formatNumber(summaryData.qualityKg)} KG</h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded flex items-center ${getTrendColor(summaryData.qualityTrend)}`}>
                                {renderTrend(summaryData.qualityTrend)}
                            </span>
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-japfa-gray dark:text-gray-400 italic border-t border-gray-50 dark:border-white/5 pt-3">Physical damage or contamination</p>
                </div>

                {/* SKU Mismatch */}
                <div className="bg-white dark:bg-card-dark p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:border-blue-500/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-japfa-gray dark:text-gray-400 uppercase tracking-wider">Mismatched SKU</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-500/20 text-japfa-slate dark:text-japfa-gray px-2 py-0.5 rounded font-bold self-start uppercase">Warehouse</span>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-500/10 text-japfa-navy dark:text-blue-400 rounded-lg">
                            <span className="material-symbols-outlined text-xl">category</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-3xl font-extrabold text-japfa-dark dark:text-white">{formatNumber(summaryData.skuKg)} KG</h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded flex items-center ${getTrendColor(summaryData.skuTrend)}`}>
                                {renderTrend(summaryData.skuTrend)}
                            </span>
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-japfa-gray dark:text-gray-400 italic border-t border-gray-50 dark:border-white/5 pt-3">Incorrect product delivered</p>
                </div>

                {/* Customer Rejection */}
                <div className="bg-white dark:bg-card-dark p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:border-red-500/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-japfa-gray dark:text-gray-400 uppercase tracking-wider">Customer Rejection</span>
                            <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-bold self-start uppercase">Transporter</span>
                        </div>
                        <div className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg">
                            <span className="material-symbols-outlined text-xl">person_off</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-3xl font-extrabold text-japfa-dark dark:text-white">{formatNumber(summaryData.custKg)} KG</h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded flex items-center ${getTrendColor(summaryData.custTrend)}`}>
                                {renderTrend(summaryData.custTrend)}
                            </span>
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-japfa-gray dark:text-gray-400 italic border-t border-gray-50 dark:border-white/5 pt-3">Delivery window or slot missed</p>
                </div>
            </div>

            {/* 2. Middle Section: Donut Chart & Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Donut Chart with Math Logic */}
                <div className="bg-white dark:bg-card-dark p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
                    <h2 className="text-xl font-bold text-japfa-dark dark:text-white mb-1">Return Causes Distribution</h2>
                    <p className="text-sm text-japfa-gray dark:text-gray-400 font-medium mb-8">Breakdown of return reasons by total weight percentage</p>
                    <div className="flex flex-col items-center">
                        <div className="relative w-56 h-56 mb-8">
                            <svg className="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 36 36">
                                <circle className="stroke-gray-100 dark:stroke-white/5" cx="18" cy="18" r="15.9155" fill="transparent" strokeWidth="3"></circle>
                                
                                {/* Dynamic SVG Segments */}
                                <circle className="stroke-japfa-orange transition-all duration-1000" cx="18" cy="18" r="15.9155" fill="transparent" strokeWidth="5" 
                                    strokeDasharray={`${donutData.qualityPercent} ${100 - donutData.qualityPercent}`} strokeDashoffset="0"></circle>
                                <circle className="stroke-japfa-navy dark:stroke-blue-400 transition-all duration-1000" cx="18" cy="18" r="15.9155" fill="transparent" strokeWidth="5" 
                                    strokeDasharray={`${donutData.skuPercent} ${100 - donutData.skuPercent}`} strokeDashoffset={`-${donutData.qualityPercent}`}></circle>
                                <circle className="stroke-japfa-gray dark:stroke-gray-600 transition-all duration-1000" cx="18" cy="18" r="15.9155" fill="transparent" strokeWidth="5" 
                                    strokeDasharray={`${donutData.custPercent} ${100 - donutData.custPercent}`} strokeDashoffset={`-${donutData.qualityPercent + donutData.skuPercent}`}></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-extrabold text-japfa-dark dark:text-white">{formatCurrency(summaryData.totalReturnKg)}</span>
                                <span className="text-[10px] font-bold text-japfa-gray dark:text-gray-400 uppercase tracking-widest mt-1">Total KG</span>
                            </div>
                        </div>
                        
                        <div className="w-full max-sm mb-4">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-sidebar rounded-lg border border-gray-100 dark:border-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-japfa-orange"></span>
                                        <span className="text-sm font-semibold text-japfa-gray dark:text-gray-400">Quality Issues</span>
                                    </div>
                                    <span className="text-md font-bold text-japfa-dark dark:text-white">{donutData.qualityPercent}%</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-sidebar rounded-lg border border-gray-100 dark:border-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-japfa-navy dark:bg-blue-400"></span>
                                        <span className="text-sm font-semibold text-japfa-gray dark:text-gray-400">Mismatched SKU</span>
                                    </div>
                                    <span className="text-md font-bold text-japfa-dark dark:text-white">{donutData.skuPercent}%</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-sidebar rounded-lg border border-gray-100 dark:border-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-japfa-gray dark:bg-gray-600"></span>
                                        <span className="text-sm font-semibold text-japfa-gray dark:text-gray-400">Cust. Rejection</span>
                                    </div>
                                    <span className="text-md font-bold text-japfa-dark dark:text-white">{donutData.custPercent}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fleet Performance List */}
                <div className="bg-white dark:bg-sidebar p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/10">
                    <h2 className="text-xl font-bold text-japfa-dark dark:text-white mb-1">Fleet Performance</h2>
                    <p className="text-sm text-japfa-gray dark:text-gray-400 font-medium mb-6">Top vehicles by incident count and weight impact</p>
                    
                    {fleetIncidentData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">local_shipping</span>
                            <p className="text-sm font-bold">Belum ada insiden armada dicatat.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {fleetIncidentData.map((fleet, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${idx === 0 ? 'bg-orange-50/50 dark:bg-orange-500/5 border-orange-100 dark:border-orange-500/20' : 'bg-white dark:bg-sidebar border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/20'}`}>
                                    <div className="flex items-center gap-4">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-japfa-orange text-white' : 'bg-gray-100 dark:bg-white/10 text-japfa-gray dark:text-gray-400'}`}>{idx + 1}</span>
                                        <div>
                                            <p className="font-bold text-japfa-dark dark:text-white text-lg tracking-tight">{fleet.plate}</p>
                                            <p className="text-[11px] text-japfa-gray dark:text-gray-500 uppercase font-bold">{fleet.count} Incidents This Month</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-extrabold text-japfa-dark dark:text-white">{fleet.weight} KG</p>
                                        <p className={`text-[10px] font-bold flex items-center justify-end gap-1 ${fleet.trend === 'up' ? 'text-red-500' : fleet.trend === 'down' ? 'text-green-500' : 'text-japfa-gray dark:text-gray-500'}`}>
                                            <span className="material-symbols-outlined text-xs">
                                                {fleet.trend === 'up' ? 'trending_up' : fleet.trend === 'down' ? 'trending_down' : 'trending_flat'}
                                            </span>
                                            {fleet.percent} vs last month
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Bottom Section: Audit Table (Ditambahin Style Baru Temen Lu `bg-card-dark`) */}
            <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-japfa-dark dark:text-white">Historical Return Audit</h3>
                        <p className="text-sm text-japfa-gray dark:text-gray-400">Transaction-level accountability log</p>
                    </div>
                    <div className="flex gap-2">
                        {/* Tombol Filter dan Export dibiarin sama */}
                        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold text-japfa-gray hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 transition-all">
                            <Filter className="w-4 h-4" /> Filter
                        </button>
                        <button className="px-4 py-2 bg-japfa-navy dark:bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-japfa-dark transition-all flex items-center gap-2 shadow-sm">
                            <Download className="w-4 h-4" /> Export PDF
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-sidebar border-b border-gray-100 dark:border-white/10">
                                {['Date', 'Customer', 'Batch ID', 'Product', 'Weight', 'Return Reason', 'Status', 'Action'].map((h) => (
                                    <th key={h} className="py-4 px-6 text-xs font-bold text-japfa-gray dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {auditData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-gray-400 text-sm font-bold">
                                        Data Audit Kosong / Belum ada Retur
                                    </td>
                                </tr>
                            ) : (
                                auditData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="py-4 px-6 text-[11px] font-bold text-japfa-gray dark:text-gray-400">{row.date}</td>
                                        <td className="py-4 px-6"><p className="font-bold text-japfa-dark dark:text-white text-sm">{row.customer}</p></td>
                                        <td className="py-4 px-6"><span className="font-mono text-[10px] text-japfa-gray bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">{row.id}</span></td>
                                        <td className="py-4 px-6 text-[11px] text-japfa-dark dark:text-gray-300">{row.product}</td>
                                        <td className="py-4 px-6 font-bold text-japfa-dark dark:text-white">{row.weight}</td>
                                        <td className="py-4 px-6 text-[11px] italic text-japfa-gray dark:text-gray-500">{row.reason}</td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`px-2.5 py-1 text-[9px] font-bold rounded-full uppercase tracking-wider ${row.color}`}>{row.status}</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="text-japfa-orange text-[10px] font-bold hover:underline">DETAILS</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}