import React from 'react';

interface PodSignatureModalProps {
    driverName: string;
    vehiclePlate: string;
    vehicleType: string;
    timestamp: string | null;
    onClose: () => void;
}

export const PodSignatureModal: React.FC<PodSignatureModalProps> = ({
    driverName,
    vehiclePlate,
    vehicleType,
    timestamp,
    onClose
}) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">draw</span>
                        Tanda Tangan Driver
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-6 flex flex-col items-center">
                    <div className="w-full h-40 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center relative mb-4">
                        {/* Simulated Signature */}
                        <span className="text-4xl font-serif text-slate-400 dark:text-slate-600 italic select-none">{driverName}</span>
                        <div className="absolute bottom-2 right-2 text-[10px] text-slate-400">Digital Signature</div>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{driverName}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Vehicle: {vehiclePlate} ({vehicleType})</p>
                        <p className="text-[10px] text-slate-400">Timestamp: {timestamp || "Baru saja"}</p>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors cursor-pointer active:scale-95"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};
