import React from 'react';

interface ActionMenuProps {
    orderId: string;
    currentOpenId: string | null;
    setOpenId: (id: string | null) => void;
    onViewDetail: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
    orderId,
    currentOpenId,
    setOpenId,
    onViewDetail
}) => {
    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpenId(currentOpenId === orderId ? null : orderId);
                }}
                className="text-slate-400 hover:text-primary transition-colors cursor-pointer active:scale-95 flex items-center justify-center p-1 rounded-full"
            >
                <span className="material-symbols-outlined">more_vert</span>
            </button>
            {currentOpenId === orderId && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl shadow-lg z-20 overflow-hidden text-left" onClick={(e) => e.stopPropagation()}>
                    <div className="p-2 flex flex-col">
                        <button
                            onClick={() => {
                                onViewDetail();
                                setOpenId(null);
                            }}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222] hover:text-primary dark:hover:text-primary rounded-lg transition-colors text-left group active:scale-95 font-medium"
                        >
                            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">visibility</span> Lihat Detail
                        </button>
                        <button
                            onClick={() => {
                                alert(`Mengunduh PDF untuk ${orderId}...`);
                                setOpenId(null);
                            }}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222] hover:text-primary dark:hover:text-primary rounded-lg transition-colors text-left group active:scale-95 font-medium"
                        >
                            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">picture_as_pdf</span> Unduh PDF
                        </button>
                        <button
                            onClick={() => {
                                alert(`Mencetak arsip untuk ${orderId}...`);
                                setOpenId(null);
                            }}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222] hover:text-primary dark:hover:text-primary rounded-lg transition-colors text-left group active:scale-95 font-medium"
                        >
                            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">print</span> Cetak Arsip
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};