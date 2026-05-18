import React from 'react';
import type { ExpenseEntry } from '../types';

interface BopDetailModalProps {
    detailEntry: ExpenseEntry;
    onClose: () => void;
}

const formatRp = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

export const BopDetailModal: React.FC<BopDetailModalProps> = ({
    detailEntry,
    onClose
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
                <div className="bg-slate-50 dark:bg-white/5 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Rincian Biaya</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center text-sm mb-4">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Armada / Waktu</p>
                            <p className="font-bold text-slate-900 dark:text-white mt-1">{detailEntry.plate} • {detailEntry.time}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Driver</p>
                            <p className="font-bold text-slate-900 dark:text-white mt-1">{detailEntry.driver}</p>
                        </div>
                    </div>
                    {detailEntry.helperName && (
                        <div className="flex justify-between items-center text-sm mb-4 pb-4 border-b border-slate-100 dark:border-white/5">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Helper</span>
                            <span className="font-bold text-slate-900 dark:text-white">{detailEntry.helperName}</span>
                        </div>
                    )}
                    {!detailEntry.helperName && <div className="pb-4 border-b border-slate-100 dark:border-white/5" />}

                    <div className="space-y-3">
                        {[
                            { label: 'BBM (Solar)', val: detailEntry.bbm },
                            { label: 'Total Tol', val: detailEntry.tol },
                            { label: 'Parkir Resmi', val: detailEntry.parkir },
                            { label: 'Parkir Liar', val: detailEntry.parkirLiar },
                            { label: 'Kuli Angkut/DLL', val: detailEntry.kuliAngkut },
                            { label: 'Helper Harian', val: detailEntry.lainLain }
                        ].map(item => item.val > 0 && (
                            <div key={item.label} className="flex justify-between text-sm items-center">
                                <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                                <span className="font-semibold text-slate-900 dark:text-white">{formatRp(item.val)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                        <span className="font-bold text-slate-500 dark:text-slate-400">Grand Total</span>
                        <span className="text-2xl font-black text-primary">{formatRp(detailEntry.total)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
