import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { api } from '../../../shared/services/apiClient';

export default function DelayTable() {
    const [delayData, setDelayData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDelayData = async () => {
            try {
                const response = await api.get('/analytics/delay-reasons');
                if (response.data.status === "success") {
                    setDelayData(response.data.data);
                }
            } catch (error) {
                console.error("Gagal narik data Delay Analysis:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDelayData();
    }, []);

    return (
        <section className={`bg-white dark:bg-card-dark p-8 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-japfa-dark dark:text-white">Reason for Delay Analysis</h2>
                    <p className="text-sm text-japfa-gray dark:text-gray-400">Root cause identification for non-compliant shipments</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/5 rounded-lg text-sm font-bold text-japfa-gray dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                    <Download className="w-4 h-4" />
                    EXPORT
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-white/5">
                            <th className="py-4 px-4 text-xs font-bold text-japfa-orange uppercase tracking-widest">Delay Category</th>
                            <th className="py-4 px-4 text-xs font-bold text-japfa-orange uppercase tracking-widest text-center">Incident Count</th>
                            <th className="py-4 px-4 text-xs font-bold text-japfa-orange uppercase tracking-widest text-center">OTIF Impact (%)</th>
                            <th className="py-4 px-4 text-xs font-bold text-japfa-orange uppercase tracking-widest text-right">Responsible Party</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {delayData.length === 0 && !isLoading ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-sm font-bold text-gray-400">Belum ada data delay.</td>
                            </tr>
                        ) : (
                            delayData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-japfa-orange">
                                                <span className="material-symbols-outlined text-lg">{row.icon}</span>
                                            </div>
                                            <span className="text-sm font-semibold text-japfa-dark dark:text-white">{row.category}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-sm font-medium text-japfa-gray dark:text-gray-400 text-center">{row.count}</td>
                                    <td className="py-4 px-4 text-sm font-bold text-red-500 text-center">{row.impact}</td>
                                    <td className="py-4 px-4 text-right">
                                        <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-white/10 text-japfa-dark dark:text-white text-[10px] font-bold rounded-full uppercase">{row.responsible}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}