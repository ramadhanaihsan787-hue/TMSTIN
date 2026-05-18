import React from 'react';

interface RejectVerificationModalProps {
    orderId: string;
    rejectReason: string;
    setRejectReason: (val: string) => void;
    rejectNotes: string;
    setRejectNotes: (val: string) => void;
    submitting: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

export const RejectVerificationModal: React.FC<RejectVerificationModalProps> = ({
    orderId,
    rejectReason,
    setRejectReason,
    rejectNotes,
    setRejectNotes,
    submitting,
    onClose,
    onSubmit
}) => {
    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500">cancel</span>
                        Tolak / Verifikasi Manual e-POD
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={onSubmit}>
                    <div className="p-6 space-y-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Masukkan alasan penolakan dokumen e-POD untuk Surat Jalan <span className="font-bold text-slate-700 dark:text-slate-300">{orderId}</span>. Supir akan menerima notifikasi dan harus mengunggah ulang.
                        </p>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Alasan Utama</label>
                            <select
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold focus:ring-primary focus:border-primary"
                                required
                            >
                                <option value="">-- Pilih Alasan --</option>
                                <option value="Foto Buram / Tidak Terbaca">Foto Buram / Tidak Terbaca</option>
                                <option value="Tanda Tangan Tidak Sesuai">Tanda Tangan Tidak Sesuai</option>
                                <option value="Kuantitas GR Tidak Sesuai">Kuantitas GR Tidak Sesuai</option>
                                <option value="Dokumen Salah / Tertukar">Dokumen Salah / Tertukar</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Catatan Tambahan (Opsional)</label>
                            <textarea
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-primary focus:border-primary h-20 resize-none"
                                placeholder="Tulis detail catatan tambahan untuk supir..."
                            />
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                            {submitting ? "Memproses..." : "Tolak POD"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
