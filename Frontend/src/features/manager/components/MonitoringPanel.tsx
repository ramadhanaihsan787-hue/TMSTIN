import { useState, useEffect } from 'react';
import { api } from '../../../shared/services/apiClient';

export default function MonitoringPanel() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await api.get('/analytics/monitoring-alerts');
                if (response.data.status === "success") {
                    setAlerts(response.data.data);
                }
            } catch (error) {
                console.error("Gagal narik data Monitoring Alerts:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className={`bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col h-full transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center h-20">
                <h2 className="text-xl font-bold text-japfa-dark dark:text-white uppercase tracking-tight">Monitoring</h2>
                <span className={`${alerts.length > 0 ? 'bg-red-100 dark:bg-red-500/20 text-red-600' : 'bg-green-100 dark:bg-green-500/20 text-green-600'} px-2 py-0.5 text-[10px] font-black rounded-full uppercase`}>
                    {alerts.length} ACTIVE
                </span>
            </div>
            <div className="p-6 flex-1 space-y-4 overflow-y-auto max-h-[450px]">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                        <p className="text-xs font-bold uppercase tracking-widest">All Systems Normal</p>
                    </div>
                ) : (
                    alerts.map((alert, i) => (
                        <div key={i} className={`p-4 bg-gray-50 dark:bg-sidebar border-l-4 ${alert.color} rounded-r-lg relative animate-in fade-in slide-in-from-right-4`}>
                            <span className="absolute top-3 right-3 text-[10px] font-bold text-japfa-gray">{alert.time}</span>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="material-symbols-outlined text-sm text-red-500">{alert.icon}</span>
                                <h3 className="text-xs font-bold text-japfa-dark dark:text-white uppercase">{alert.title}</h3>
                            </div>
                            <p className="text-[11px] text-japfa-gray dark:text-gray-400 leading-tight">{alert.desc}</p>
                        </div>
                    ))
                )}
                
                {alerts.length > 0 && (
                    <button 
                        onClick={() => setAlerts([])}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg uppercase transition-all shadow-md active:scale-95"
                    >
                        Acknowledge All Alerts
                    </button>
                )}
            </div>
        </section>
    );
}