import { useState, useEffect } from 'react';
import KPICard from './ManagerKPICards';
import { TrendingUp, Check, Navigation, Clock } from 'lucide-react';
import { api } from '../../../shared/services/apiClient';

export default function OverviewDashboard() {
    // 🌟 STATE MURNI KOSONG (0 / N/A / --:--)
    const [kpiData, setKpiData] = useState({
        otif: 0,
        onTime: 0,
        avgLeadTime: 0,
        fillRate: 0, 
        returnRate: 0,
        transportCost: 0, 
        loadUtilization: 0,
        
        todayTarget: 0,
        todayRemaining: 0,
        completedQty: 0,
        completedPercent: 0,
        completedDrops: 0,
        inTransitQty: 0,
        inTransitPercent: 0,
        inTransitDrops: 0,
        avgPayload: 0,
        utilization: 0,

        estCompletion: "--:--",
        completionPeriod: "",
        riskLevel: "N/A",
        riskColor: "text-gray-500",
        
        otifTrend: [0, 0, 0, 0, 0, 0, 0],
        volumeTrend: [0, 0, 0, 0, 0, 0, 0]
    });

    const [isLoading, setIsLoading] = useState(true);
    const isHistorical = false; // Flag dari UI temen lu

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const today = new Date();
                const lastMonth = new Date();
                lastMonth.setDate(today.getDate() - 30);
                
                const endDate = today.toISOString().split('T')[0];
                const startDate = lastMonth.toISOString().split('T')[0];

                // Ambil data hari ini dari manager/overview (lebih kaya dari kpi-summary)
                const [overviewRes, kpiRes] = await Promise.all([
                    api.get('/api/analytics/manager/overview'),
                    api.get('/analytics/kpi-summary', { params: { startDate, endDate } })
                ]);

                const ov = overviewRes.data?.data || {};
                const kpi = kpiRes.data;

                if (overviewRes.data?.status === "success") {
                    let autoRiskColor = "text-gray-500";
                    if (ov.risk_level === "Low Range")    autoRiskColor = "text-emerald-500";
                    if (ov.risk_level === "Medium Range") autoRiskColor = "text-orange-500";
                    if (ov.risk_level === "High Risk")    autoRiskColor = "text-red-500";

                    const avgPayloadTon = ov.active_fleet_today > 0
                        ? ((ov.total_weight_today || 0) / ov.active_fleet_today / 1000).toFixed(1)
                        : 0;

                    setKpiData({
                        // KPI dari kpi-summary (30 hari)
                        otif:           kpi?.success_rate_percent || 0,
                        onTime:         ov.on_time_rate           || 0,
                        avgLeadTime:    kpi?.data?.avgLeadTime     || 0,
                        fillRate:       kpi?.data?.fillRate        || 0,
                        returnRate:     kpi?.data?.returnRate      || 0,
                        transportCost:  ov.estimated_cost_rp      || 0,
                        loadUtilization: kpi?.load_factor_percent  || 0,

                        // Progress hari ini dari manager/overview
                        todayTarget:      ov.total_weight_today   || 0,
                        todayRemaining:   Math.max(0, (ov.total_weight_today || 0) - (ov.weight_done || 0)),
                        completedQty:     ov.weight_done          || 0,
                        completedPercent: ov.completed_percent     || 0,
                        completedDrops:   (ov.done_success || 0) + (ov.done_partial || 0),
                        inTransitQty:     ov.in_transit           || 0,
                        inTransitPercent: ov.total_orders > 0
                            ? Math.round(((ov.in_transit || 0) / ov.total_orders) * 100)
                            : 0,
                        inTransitDrops:   ov.in_transit           || 0,
                        avgPayload:       Number(avgPayloadTon),
                        utilization:      kpi?.load_factor_percent || 0,

                        estCompletion:    ov.est_completion        || "--:--",
                        completionPeriod: "",
                        riskLevel:        ov.risk_level            || "N/A",
                        riskColor:        autoRiskColor,
                        
                        otifTrend:        kpi?.otifTrend || [0,0,0,0,0,0,0],
                        volumeTrend:      kpi?.volumeTrend || [0,0,0,0,0,0,0]
                    });
                }
            } catch (error) {
                console.error("Gagal narik data KPI Dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
    const formatCurrency = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)} jt`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)} rb`;
        return num.toString();
    };

    // 🌟 KALKULASI GRAFIK SVG DINAMIS
    const maxVolume = Math.max(1, ...kpiData.volumeTrend);
    const scaleVolume = (vol: number) => (vol / maxVolume) * 280; // max height 280
    // Scale OTIF: 95% di y=150. (Setiap 1% naik, y turun 20px). Clamped 0-300.
    const scaleOtif = (val: number) => Math.max(0, Math.min(300, 150 - (val - 95) * 20));
    
    const otifPoints = kpiData.otifTrend.map((val, i) => ({ x: 100 + i * 130, y: scaleOtif(val) }));
    const pathD = "M " + otifPoints.map(p => `${p.x},${p.y}`).join(" L ");

    return (
        <div className={`space-y-8 animate-fadeIn transition-opacity duration-500 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
            
            {/* Top KPI Row (4 Cards) - UI DARI TEMEN LU */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard label="OTIF Performance" value={`${kpiData.otif}%`} change="1.2%" trend="up" icon="schedule" bgColor="bg-blue-50" iconColor="text-blue-600" subtext="vs. last month avg" />
                <KPICard label="On-Time Delivery" value={`${kpiData.onTime}%`} change="0.5%" trend="up" icon="check_circle" bgColor="bg-green-50" iconColor="text-green-600" subtext="Target: 95%" />
                <KPICard label="Average delivery time" value={`${kpiData.avgLeadTime} menit`} change="0.2d" trend="down" icon="timer" bgColor="bg-purple-50" iconColor="text-purple-600" subtext="vs. previous week" />
                <KPICard label="Fill Rate" value={`${kpiData.fillRate}%`} change="0.3%" trend="up" icon="inventory_2" bgColor="bg-orange-50" iconColor="text-japfa-orange" subtext="Stock availability" />
            </section>

            {/* Today's Fulfillment Tracking Section - UI DARI TEMEN LU */}
            <section className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-japfa-orange/10 p-2 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-japfa-orange" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-japfa-dark dark:text-white">
                                {isHistorical ? "Historical Fulfillment Tracking" : "Today's Fulfillment Tracking"}
                            </h3>
                            <p className="text-[10px] font-black text-japfa-gray dark:text-gray-500 uppercase tracking-widest mt-0.5">
                                Unit: KG • {isHistorical ? "Analysis Data" : "Real-time Operations"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center px-6 border-r border-gray-100 dark:border-white/5">
                            <p className="text-[9px] font-black text-japfa-gray dark:text-gray-500 uppercase tracking-[0.1em] mb-1">Total Target</p>
                            <p className="text-xl font-black text-japfa-navy dark:text-blue-400">{formatNumber(kpiData.todayTarget)} <span className="text-[10px] opacity-70">KG</span></p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-japfa-gray dark:text-gray-500 uppercase tracking-[0.1em] mb-1">Remaining</p>
                            <p className="text-xl font-black text-japfa-gray dark:text-gray-400">{formatNumber(kpiData.todayRemaining)} <span className="text-[10px] opacity-70">KG</span></p>
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Status Column 1: Completed */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                                <span className="text-[11px] font-black text-japfa-dark dark:text-white uppercase tracking-widest">Completed</span>
                            </div>
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">{kpiData.completedPercent}%</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-sidebar p-4 rounded-xl border border-gray-100 dark:border-white/5 group hover:border-emerald-500/50 transition-colors cursor-pointer">
                            <p className="text-2xl font-black text-japfa-dark dark:text-white">{formatNumber(kpiData.completedQty)}</p>
                            <p className="text-[10px] font-bold text-japfa-gray dark:text-gray-500 uppercase tracking-[0.1em] mt-1 inline-flex items-center gap-1.5">
                                KG DELIVERED <span className="w-1 h-1 rounded-full bg-emerald-500"></span> {kpiData.completedDrops} DROPS
                            </p>
                            <div className="mt-4 h-1.5 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${kpiData.completedPercent}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Status Column 2: In-Transit */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 ${isHistorical ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-blue-50 dark:bg-blue-500/10'} rounded-lg`}>
                                    {isHistorical ? <Clock className="w-3.5 h-3.5 text-japfa-orange" /> : <Navigation className="w-3.5 h-3.5 text-blue-600" />}
                                </div>
                                <span className="text-[11px] font-black text-japfa-dark dark:text-white uppercase tracking-widest">
                                    {isHistorical ? "Pending" : "In-Transit"}
                                </span>
                            </div>
                            <span className={`text-xs font-black ${isHistorical ? 'text-japfa-orange bg-orange-50' : 'text-blue-600 bg-blue-50'} dark:bg-opacity-10 px-2 py-0.5 rounded-full`}>{kpiData.inTransitPercent}%</span>
                        </div>
                        <div className={`bg-gray-50 dark:bg-sidebar p-4 rounded-xl border border-gray-100 dark:border-white/5 group transition-colors cursor-pointer ${isHistorical ? 'hover:border-japfa-orange/50' : 'hover:border-blue-500/50'}`}>
                            <p className="text-2xl font-black text-japfa-dark dark:text-white">{formatNumber(kpiData.inTransitQty)}</p>
                            <p className="text-[10px] font-bold text-japfa-gray dark:text-gray-500 uppercase tracking-[0.1em] mt-1 inline-flex items-center gap-1.5">
                                KG PROGRESS <span className={`w-1 h-1 rounded-full ${isHistorical ? 'bg-japfa-orange' : 'bg-blue-500'}`}></span> {kpiData.inTransitDrops} LOADS
                            </p>
                            <div className="mt-4 h-1.5 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full ${isHistorical ? 'bg-japfa-orange' : 'bg-blue-500'} rounded-full animate-pulse-slow transition-all duration-1000`} style={{ width: `${kpiData.inTransitPercent}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Mini Stats 1 */}
                    <div className="bg-gray-50 dark:bg-sidebar p-6 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col justify-between">
                        <div>
                            <p className="text-[9px] font-black text-japfa-gray dark:text-gray-500 uppercase tracking-widest mb-1">Average Payload</p>
                            <h4 className="text-xl font-extrabold text-japfa-dark dark:text-white">{kpiData.avgPayload} <span className="text-xs uppercase opacity-60">Ton</span></h4>
                        </div>
                        <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                                <span className="text-japfa-gray dark:text-gray-500 uppercase italic">Capacity Utilization</span>
                                <span className="text-japfa-orange">{kpiData.utilization}%</span>
                            </div>
                            <div className="h-1 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-japfa-orange transition-all duration-1000" style={{ width: `${kpiData.utilization}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Mini Stats 2 */}
                    <div className="bg-gray-50 dark:bg-sidebar p-6 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col justify-between">
                        <div>
                            <p className="text-[9px] font-black text-japfa-gray dark:text-gray-500 uppercase tracking-widest mb-1">Est. Completion</p>
                            <h4 className="text-xl font-extrabold text-japfa-dark dark:text-white">{isHistorical ? "Full Archive" : kpiData.estCompletion} <span className="text-xs uppercase opacity-60 italic">{isHistorical ? "" : kpiData.completionPeriod}</span></h4>
                        </div>
                        <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className="text-japfa-gray dark:text-gray-500 uppercase italic">Risk level</span>
                                <span className={`${kpiData.riskColor} uppercase tracking-tighter`}>{kpiData.riskLevel}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom KPI Row - UI DARI TEMEN LU */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <KPICard label="Return Rate" value={`${kpiData.returnRate}%`} change="0.4%" trend="down" icon="assignment_return" bgColor="bg-red-50" iconColor="text-red-600" subtext="Rejected loads reduction" />
                <KPICard label="Transport Cost" value={`Rp ${formatCurrency(kpiData.transportCost)}/hari`} change="2.1%" trend="up" icon="payments" bgColor="bg-purple-50" iconColor="text-purple-600" subtext="Fuel surcharge impact" />
                <KPICard label="Load Factor" value={`${kpiData.loadUtilization}%`} change="1.5%" trend="up" icon="local_shipping" bgColor="bg-teal-50" iconColor="text-teal-600" subtext="Capacity efficiency" />
            </section>

            {/* Distribution Performance Trend (SVG Chart Temen Lu) */}
            <section className="bg-white dark:bg-card-dark p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-wrap">
                    <div>
                        <h2 className="text-xl font-bold text-japfa-dark dark:text-white">Distribution Performance Trend</h2>
                        <p className="text-sm text-japfa-gray dark:text-gray-400">Daily fulfillment vs shipment volume (OTIF & Load Count)</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-orange-100 dark:bg-orange-500/20"></span>
                            <span className="text-xs font-medium text-japfa-gray dark:text-gray-400">Shipment Volume</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-japfa-orange"></div>
                            <span className="text-xs font-medium text-japfa-gray dark:text-gray-400">OTIF Performance</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 border-t border-dashed border-red-400"></div>
                            <span className="text-xs font-medium text-japfa-gray dark:text-gray-400">95% Target</span>
                        </div>
                    </div>
                </div>

                {/* SVG Chart DINAMIS DARI API */}
                <div className="relative w-full h-[300px] mb-4">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 300">
                        {/* Grid lines */}
                        {[0, 60, 120, 180, 240, 300].map((y) => (
                            <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="currentColor" className="text-gray-100 dark:text-white/5" strokeDasharray="4" />
                        ))}
                        {/* 95% Target Line at Y=150 */}
                        <line x1="0" x2="1000" y1="150" y2="150" stroke="#ef4444" strokeDasharray="6,4" strokeWidth="2" />
                        
                        {/* Bar Chart: Shipment Volume */}
                        {kpiData.volumeTrend.map((vol, i) => {
                            const h = scaleVolume(vol);
                            return (
                                <rect key={i} x={80 + i * 130} y={300 - h} width="40" height={h} fill="currentColor" className="text-orange-100 dark:text-orange-500/20 rounded-t-sm" />
                            );
                        })}
                        
                        {/* Line Chart: OTIF Performance */}
                        <path d={pathD} fill="none" stroke="#F28C38" strokeWidth="4" />
                        
                        {/* Points for Line Chart */}
                        {otifPoints.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="5" fill="white" stroke="#F28C38" strokeWidth="2" />
                        ))}
                    </svg>
                </div>
                <div className="flex justify-between px-10 text-[10px] font-bold text-japfa-gray dark:text-gray-500 uppercase tracking-wider">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
            </section>
        </div>
    );
};