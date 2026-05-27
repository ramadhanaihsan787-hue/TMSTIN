// src/features/drivers/components/DriverTableRow.tsx
import React from 'react';
import { toast } from 'sonner'; 
import type { DriverData } from '../types';
import DriverExpandedRow from './DriverExpandedRow';

interface DriverTableRowProps {
    driver: DriverData;
    isExpanded: boolean;
    onToggle: () => void;
}

export default function DriverTableRow({ driver, isExpanded, onToggle }: DriverTableRowProps) {
    const getStatusStyle = (status: string) => {
        switch(status) {
            case 'On Route': return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
            case 'Resting': return 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case 'Offline': return 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-600';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const getStatusIndicator = (status: string) => {
        switch(status) {
            case 'On Route': return 'bg-emerald-500';
            case 'Resting': return 'bg-blue-500';
            case 'Offline': return 'bg-slate-400';
            default: return 'bg-slate-400';
        }
    };

    // 🌟 FIX CTO: Fallback Avatar biar ngga error split kalau nama/avatar null
    const safeAvatar = driver?.avatar || `https://ui-avatars.com/api/?name=${(driver?.name || "Driver").replace(/\s/g, '+')}&background=0D8ABC&color=fff`;

    return (
        <React.Fragment>
            <tr 
                onClick={onToggle}
                className={`transition-colors cursor-pointer ${isExpanded ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-[#1a1a1a]'}`}
            >
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-[#444]">
                            <img className="h-full w-full object-cover" src={safeAvatar} alt={driver?.name || 'Driver'} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white">{driver?.name || 'Supir Tanpa Nama'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{driver?.id || '-'}</p>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusStyle(driver?.status || 'Offline')}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusIndicator(driver?.status || 'Offline')}`}></span>
                        {driver?.status || 'Offline'}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                        {driver?.score != null ? (
                            <>
                                <span
                                    className={`material-symbols-outlined text-lg ${
                                        driver.score >= 90 ? 'text-amber-500'
                                        : driver.score >= 70 ? 'text-emerald-500'
                                        : 'text-slate-300'
                                    }`}
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >stars</span>
                                <span className="font-bold text-slate-800 dark:text-white">{driver.score}%</span>
                                <span className="text-xs text-slate-400 dark:text-slate-500">progress</span>
                            </>
                        ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">— tidak bertugas</span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 dark:text-slate-500 w-20">On-time:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{driver?.ontime || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 dark:text-slate-500 w-20">DO Success:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{driver?.doSuccess || '0'}</span>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
                    {driver?.truck || '-'}
                </td>
                <td className="px-6 py-4 text-right">
                    <button onClick={(e) => { e.stopPropagation(); toast.info('Menu aksi Driver segera hadir!'); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 transition-colors">
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                    </button>
                </td>
            </tr>

            {isExpanded && <DriverExpandedRow driver={driver} />}
        </React.Fragment>
    );
}