import React from 'react';

interface BopSummaryPanelProps {
    currentPlate: string;
    currentDriver: string;
    currentHelper: string;
    bbm: string;
    tol: string;
    parkir: string;
    parkirLiar: string;
    kuliAngkut: string;
    lainLain: string;
    total: number;
    editingId: string | null;
    resetForm: () => void;
    handleSubmit: () => void;
}

const formatRp = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
const n = (v: string) => Number(v) || 0;

export const BopSummaryPanel: React.FC<BopSummaryPanelProps> = ({
    currentPlate,
    currentDriver,
    currentHelper,
    bbm,
    tol,
    parkir,
    parkirLiar,
    kuliAngkut,
    lainLain,
    total,
    editingId,
    resetForm,
    handleSubmit
}) => {
    return (
        <aside className="w-full lg:w-96 shrink-0 lg:sticky lg:top-8">
            <div className="bg-white dark:bg-[#111111] p-6 lg:p-8 rounded-xl shadow-sm dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5 space-y-6">
                <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Cost Summary</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">Rincian pengeluaran operasional.</p>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-[#1A1A1A] p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Armada</span>
                            <span className="font-bold text-slate-900 dark:text-white">{currentPlate}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Driver</span>
                            <span className="font-bold text-slate-900 dark:text-white">{currentDriver || '—'}</span>
                        </div>
                        {currentHelper && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 dark:text-slate-400">Helper</span>
                                <span className="font-bold text-slate-900 dark:text-white">{currentHelper}</span>
                            </div>
                        )}
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-white/5 my-2" />

                    {[
                        ['BBM (Solar)', bbm], ['Total Tol', tol],
                        ['Parkir Resmi', parkir], ['Parkir Liar', parkirLiar],
                        ['Kuli Angkut/DLL', kuliAngkut], ['Helper Harian', lainLain]
                    ].map(([label, val]) => (
                        <div key={label as string} className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">{label}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{formatRp(n(val as string))}</span>
                        </div>
                    ))}

                    <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                        <div className="flex justify-between items-end mb-8">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Grand Total</span>
                            <span className="text-3xl font-black text-primary">{formatRp(total)}</span>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={total === 0}
                            className="w-full bg-gradient-to-r from-[#994700] to-[#FF7A00] disabled:opacity-40 disabled:cursor-not-allowed text-white py-5 rounded-lg font-extrabold text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <span>{editingId ? 'Update Biaya' : 'Submit Biaya'}</span>
                            <span className="material-symbols-outlined">send</span>
                        </button>
                        {editingId && (
                            <button
                                onClick={resetForm}
                                className="w-full mt-3 py-3 rounded-lg font-bold text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            >
                                Batal Edit
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
};