import type { DriverData } from '../types/types';
import DriverTableRow from './DriverTableRow';

interface DriverTableProps {
    loading: boolean;
    drivers: DriverData[];
    expandedDriverId: string | null;
    onToggleExpand: (id: string) => void;
}

export default function DriverTable({ loading, drivers, expandedDriverId, onToggleExpand }: DriverTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                    <tr className="bg-slate-50 dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-[#333]">
                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Driver Info</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Status</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Perf. Score</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Key Metrics</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Truck</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
                    {loading ? (
                        <tr><td colSpan={6} className="text-center py-12 font-bold text-slate-500">Menarik Data Driver...</td></tr>
                    ) : drivers.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-12 font-bold text-slate-500">Belum ada driver yang terdaftar di Database!</td></tr>
                    ) : (
                        drivers.map((driver) => (
                            <DriverTableRow 
                                key={driver.id}
                                driver={driver}
                                isExpanded={expandedDriverId === driver.id}
                                onToggle={() => onToggleExpand(driver.id)}
                            />
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}