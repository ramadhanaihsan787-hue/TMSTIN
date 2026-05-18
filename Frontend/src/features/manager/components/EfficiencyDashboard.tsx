import { useState, useEffect } from 'react';
import KPICard from './ManagerKPICards';
import { api } from '../../../shared/services/apiClient';

export default function EfficiencyDashboard() {
    const [isLoading, setIsLoading] = useState(true);
    
    // State nampung API
    const [efficiencyData, setEfficiencyData] = useState<any>({
        kpi: { totalShipments: 0, avgLeadTime: "0h", loadFactor: "0%", costPerKg: "Rp 0", hiddenCost: "0%" },
        lfTrend: [0, 0, 0, 0, 0, 0, 0], // Data 7 hari terakhir
        costDist: [],
        hiddenCosts: [],
        leakagePoints: [],
        opExcellence: []
    });

    useEffect(() => {
        const fetchEfficiencyData = async () => {
            try {
                const response = await api.get('/analytics/efficiency-dashboard');
                if (response.data.status === "success") {
                    setEfficiencyData(response.data.data);
                }
            } catch (error) {
                console.error("Gagal narik data Efficiency Dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEfficiencyData();
    }, []);

    // 🌟 MATEMATIKA CTO: Ngubah array Load Factor jadi koordinat SVG (ViewBox 0 0 1000 400 ala UI Baru)
    const generateChartPoints = (data: number[]) => {
        return data.map((val, i) => {
            // Lebar X = 0 s/d 1000. Y = 400 (bawah) s/d 0 (atas). 
            // Garis target (90%) ada di Y=80. Berarti rumus Y = 400 - (val * 3.55)
            const y_val = 400 - (val * 3.55);
            return {
                x: (i / 6) * 1000,
                y: isNaN(y_val) ? 400 : y_val
            };
        });
    };
    const points = generateChartPoints(efficiencyData.lfTrend);
    const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
    
    // Lingkaran akhir (Pulse Point)
    const lastPoint = points.length > 0 ? points[points.length - 1] : {x:1000, y:80};

    // 🌟 MATEMATIKA CTO: Ngitung Donut Chart Cost Dist (ViewBox 100x100)
    let currentOffset = 0;
    const circumference = 251.2;

    return (
        <div className={`space-y-8 animate-fadeIn pb-20 transition-opacity duration-500 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
            
            {/* KPI Row - 5 Cards (UI Baru) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <KPICard label="Cost per KG" value={efficiencyData.kpi.costPerKg} change="2.1%" trend="up" icon="scale" bgColor="bg-orange-50" iconColor="text-japfa-orange" subtext="vs. target IDR 820" />
                <KPICard label="Avg Lead Time" value={efficiencyData.kpi.avgLeadTime} change="0.8%" trend="down" icon="local_gas_station" bgColor="bg-orange-50" iconColor="text-japfa-orange" subtext="faster processing" />
                <KPICard label="Load Factor" value={efficiencyData.kpi.loadFactor} change="1.5%" trend="up" icon="local_shipping" bgColor="bg-orange-50" iconColor="text-japfa-orange" subtext="capacity utilization" />
                <KPICard label="Hidden Cost" value={efficiencyData.kpi.hiddenCost} change="0.5%" trend="down" icon="visibility_off" bgColor="bg-orange-50" iconColor="text-japfa-orange" subtext="minimal leakage" />
                <KPICard label="Total Shipments" value={efficiencyData.kpi.totalShipments.toString()} change="On Target" trend="up" icon="star" bgColor="bg-orange-50" iconColor="text-japfa-orange" subtext="service excellence" />
            </div>

            {/* Main Analytics: Load Factor & Cost Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Actual vs. Target Load Factor Chart (UI Baru - ViewBox 1000x400) */}
                <div className="lg:col-span-2 bg-white dark:bg-card-dark p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-japfa-dark dark:text-white">Actual vs. Target Load Factor</h3>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-0.5 bg-japfa-orange"></span>
                                <span className="text-[10px] font-bold text-japfa-gray dark:text-gray-500 uppercase tracking-wider">Actual</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-0.5 border-t border-dashed border-gray-400"></span>
                                <span className="text-[10px] font-bold text-japfa-gray dark:text-gray-500 uppercase tracking-wider">Baseline</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-0.5 border-t border-dotted border-red-500"></span>
                                <span className="text-[10px] font-bold text-japfa-gray dark:text-gray-500 uppercase tracking-wider">90% Target</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative w-full aspect-[21/9] bg-gray-50 dark:bg-sidebar rounded-xl overflow-hidden border border-gray-100 dark:border-white/5">
                        <svg className="w-full h-full p-4" preserveAspectRatio="none" viewBox="0 0 1000 400">
                            {/* Red Dotted Target Line at 90% */}
                            <line x1="0" y1="80" x2="1000" y2="80" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
                            {/* Grey Dashed Historical Baseline */}
                            <path d="M 0 280 Q 250 300 500 240 T 1000 200" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 6" className="text-gray-400 opacity-40" />
                            
                            {/* 🌟 Solid JAPFA Orange Actual Line (DYNAMIC DARI API!) */}
                            <path d={pathD} fill="none" stroke="#F28C38" strokeWidth="3" className="transition-all duration-1000" />
                            
                            {/* Pulse Point di ujung grafik dinamis */}
                            <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="#F28C38" stroke="white" strokeWidth="2" className="transition-all duration-1000">
                                <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                        </svg>
                    </div>
                </div>

                {/* Operating Cost Distribution Donut */}
                <div className="bg-white dark:bg-card-dark p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col h-full">
                    <h3 className="text-lg font-bold text-japfa-dark dark:text-white mb-8">Operating Cost Distribution</h3>
                    <div className="flex-1 flex flex-col items-center justify-center relative min-h-[180px]">
                        <svg className="w-40 h-40 transform -rotate-90 drop-shadow-md" viewBox="0 0 100 100">
                            {efficiencyData.costDist.map((item: any, idx: number) => {
                                const dash = (item.percent / 100) * circumference;
                                const strokeOffset = circumference - dash;
                                const transformRotate = `rotate(${(currentOffset / 100) * 360} 50 50)`;
                                currentOffset += item.percent;
                                return (
                                    <circle key={idx} cx="50" cy="50" r="40" fill="transparent" stroke={item.stroke} strokeWidth="12" 
                                        strokeDasharray={circumference} strokeDashoffset={strokeOffset} transform={transformRotate} className="transition-all duration-1000" />
                                );
                            })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-japfa-dark dark:text-white">100%</span>
                            <span className="text-[10px] font-bold text-japfa-gray dark:text-gray-500 uppercase tracking-widest">Total Ops</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 mt-8">
                        {efficiencyData.costDist.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                                <span className="text-[11px] font-bold text-japfa-gray dark:text-gray-400">{item.label} ({item.percent}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Hidden Cost & Leakage Points */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Hidden Cost Composition */}
                <div className="bg-white dark:bg-card-dark p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <h3 className="text-lg font-bold text-japfa-dark dark:text-white mb-8">Hidden Cost Composition</h3>
                    <div className="space-y-6">
                        {efficiencyData.hiddenCosts.length === 0 ? (
                            <div className="text-center text-gray-400 py-10 font-bold text-sm">Tidak ada data hidden cost</div>
                        ) : (
                            efficiencyData.hiddenCosts.map((item: any, idx: number) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-japfa-dark dark:text-white">{item.label}</span>
                                        <span className="text-japfa-orange text-sm">{item.value}</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-50 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: item.value }}></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Highest Leakage Points Table */}
                <div className="bg-white dark:bg-card-dark p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <h3 className="text-lg font-bold text-japfa-dark dark:text-white mb-8">Highest Leakage Points</h3>
                    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/5">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-white/5">
                                <tr>
                                    <th className="p-4 text-[10px] font-black text-japfa-gray dark:text-gray-500 uppercase tracking-widest">Location</th>
                                    <th className="p-4 text-[10px] font-black text-japfa-gray dark:text-gray-500 uppercase tracking-widest text-right">Cost (IDR)</th>
                                    <th className="p-4 text-[10px] font-black text-japfa-gray dark:text-gray-500 uppercase tracking-widest text-right">% Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {efficiencyData.leakagePoints.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-xs font-bold text-gray-400">Belum ada data leakage cost.</td>
                                    </tr>
                                ) : (
                                    efficiencyData.leakagePoints.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="p-4 text-xs font-bold text-japfa-dark dark:text-white">{row.loc}</td>
                                            <td className="p-4 text-xs font-mono text-japfa-gray dark:text-gray-400 text-right">{row.cost}</td>
                                            <td className="p-4 text-xs font-black text-japfa-orange text-right">{row.pct}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}