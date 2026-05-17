import { useState, useEffect } from "react";
import Header from "../../../shared/components/Header";
import { podService, type PodRecord } from "../services/podService";

export default function Verifications() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [queue, setQueue] = useState<PodRecord[]>([]);
    const [selectedQueueItemId, setSelectedQueueItemId] = useState<string | null>(null);
    const [showSignature, setShowSignature] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Reject Modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectNotes, setRejectNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const defaultPhoto = "https://lh3.googleusercontent.com/aida-public/AB6AXuDTx9bYd1hgeeWX1P-Y3mUYWXFJXplpHkDmiLVOPyUD3oP3aJElteBrqefiqoN_-Cj5Dqk33srhBY4zrITGWjG4ujVaQ3xQiGHog_oa0w-kghUP08wCk7mbK3RgDR27N3ExeGW_7vXLuybyDzoF7w7L4Fzs5otvHtFs0O1ISma6-tYq2OIj-SzkbZ0odalVapd_oC_uUxt9sT4GPxUp9FvuyJKHZYgvTHhgpqDDZ-7TTMrExRscqw9-YCYrE7uWpnNL07ggrbIz1D0";

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchQueue = async (autoSelect = false) => {
        try {
            setLoading(true);
            setError(null);
            const response = await podService.getPodVerifications();
            if (response.status === 'success') {
                setQueue(response.data);
                if (response.data.length > 0) {
                    if (autoSelect || !selectedQueueItemId || !response.data.some(r => r.order_id === selectedQueueItemId)) {
                        setSelectedQueueItemId(response.data[0].order_id);
                    }
                } else {
                    setSelectedQueueItemId(null);
                }
            } else {
                setError("Gagal memuat antrian.");
            }
        } catch (err: any) {
            console.error("Error fetching POD verifications queue:", err);
            setError(err?.response?.data?.detail || "Gagal menghubungi server backend.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue(true);
    }, []);

    const selectedRecord = queue.find(r => r.order_id === selectedQueueItemId) || null;

    const handleApprove = async () => {
        if (!selectedRecord) return;
        try {
            setSubmitting(true);
            const response = await podService.approvePod(selectedRecord.order_id);
            if (response.status === "success") {
                showToast(response.message, "success");
                await fetchQueue(true);
            } else {
                showToast("Gagal menyetujui POD.", "error");
            }
        } catch (err: any) {
            console.error("Error approving POD:", err);
            showToast(err?.response?.data?.detail || "Gagal menyetujui POD.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectClick = () => {
        if (!selectedRecord) return;
        setRejectReason("");
        setRejectNotes("");
        setShowRejectModal(true);
    };

    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRecord || !rejectReason) return;
        try {
            setSubmitting(true);
            const response = await podService.rejectPod(selectedRecord.order_id, rejectReason, rejectNotes);
            if (response.status === "success") {
                showToast(response.message, "success");
                setShowRejectModal(false);
                await fetchQueue(true);
            } else {
                showToast("Gagal menolak POD.", "error");
            }
        } catch (err: any) {
            console.error("Error rejecting POD:", err);
            showToast(err?.response?.data?.detail || "Gagal menolak POD.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Main Workspace */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
                <Header title="Admin Portal" />

                {/* Workspace Content */}
                <div className="flex-1 flex overflow-hidden">
                    {loading && queue.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs text-slate-400 mt-4 font-semibold tracking-widest uppercase">Memuat antrian e-POD...</p>
                        </div>
                    ) : error && queue.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-8">
                            <span className="material-symbols-outlined text-6xl text-red-500">error_outline</span>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-4">Gagal Memuat Antrian</p>
                            <p className="text-sm text-slate-400 mt-1 text-center max-w-md">{error}</p>
                            <button onClick={() => fetchQueue(true)} className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors">
                                Coba Lagi
                            </button>
                        </div>
                    ) : queue.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/50">
                            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700">playlist_add_check</span>
                            <p className="text-lg font-bold text-slate-600 dark:text-slate-400 mt-4">Antrian Verifikasi Kosong</p>
                            <p className="text-sm text-slate-400 mt-1 text-center max-w-md">Semua dokumen e-POD dari supir telah selesai diproses dan diverifikasi.</p>
                            <button onClick={() => fetchQueue(true)} className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors">
                                Segarkan Halaman
                            </button>
                        </div>
                    ) : selectedRecord ? (
                        <>
                            {/* Panel 1: Live Queue (20%) */}
                            <section className="w-1/4 xl:w-1/5 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Live Queue</h2>
                                        <p className="text-xs text-slate-400 mt-1">{queue.length} Pending Verifications</p>
                                    </div>
                                    <button onClick={() => fetchQueue(false)} className="text-slate-400 hover:text-primary transition-colors cursor-pointer" title="Refresh antrian">
                                        <span className="material-symbols-outlined text-sm">refresh</span>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {queue.map((item) => (
                                        <div
                                            key={item.order_id}
                                            onClick={() => {
                                                setSelectedQueueItemId(item.order_id);
                                                setZoom(1);
                                                setRotation(0);
                                            }}
                                            className={`p-4 cursor-pointer transition-colors ${selectedQueueItemId === item.order_id ? 'bg-primary/5 border-l-4 border-primary' : 'border-b border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-xs font-bold ${selectedQueueItemId === item.order_id ? 'text-primary' : 'text-slate-500'}`}>e-POD #{item.order_id.substring(item.order_id.length - 5)}</span>
                                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.driver_name}</p>
                                            <p className="text-xs text-slate-500 mt-1 truncate">{item.customer_name}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Panel 2: Data Sistem GR (30%) */}
                            <section className="w-1/3 xl:w-[30%] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#111111]">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Data Sistem GR</h2>
                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-bold rounded">MATCHING</span>
                                </div>

                                {/* Customer & Surat Jalan Info */}
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20">
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                                        <div>
                                            <p className="text-slate-500 font-bold uppercase text-[10px]">Customer</p>
                                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={selectedRecord.customer_name}>
                                                {selectedRecord.customer_name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 font-bold uppercase text-[10px]">No. Surat Jalan</p>
                                            <p className="font-mono text-primary font-bold">
                                                {selectedRecord.order_id}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 font-bold uppercase text-[10px]">Tanggal Pengiriman</p>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">{selectedRecord.timestamp ? selectedRecord.timestamp.split(' ')[0] : "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 font-bold uppercase text-[10px]">Truck</p>
                                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                                {selectedRecord.vehicle_plate || "-"} ({selectedRecord.vehicle_type || "-"})
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase">Item Name</th>
                                                <th className="p-3 text-[10px] font-bold text-slate-500 uppercase text-right">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                            {selectedRecord.items && selectedRecord.items.length > 0 ? (
                                                selectedRecord.items.map((it, idx) => (
                                                    <tr key={idx}>
                                                        <td className="p-3 text-xs font-medium text-slate-800 dark:text-slate-200">{it.nama_barang}</td>
                                                        <td className="p-3 text-xs font-bold text-slate-900 dark:text-slate-100 text-right">{it.qty}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={2} className="p-3 text-xs text-slate-400 italic text-center">Tidak ada detail barang</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-slate-400 text-sm">chat_bubble</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Driver Notes</span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                                        "{selectedRecord.driver_notes || "Tidak ada catatan tambahan."}"
                                    </p>

                                    <button
                                        onClick={() => setShowSignature(true)}
                                        className="mt-3 text-xs text-primary font-bold hover:text-primary/80 flex items-center gap-1 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">draw</span>
                                        Lihat Tanda Tangan Driver
                                    </button>
                                </div>
                                {selectedRecord.qty_return > 0 && (
                                    <div className="p-4 bg-red-50 dark:bg-red-500/5 border-t border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-red-500 text-sm">assignment_return</span>
                                            <span className="text-[10px] font-bold text-red-500 uppercase">Detail Retur (Dilaporkan Driver)</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold">Qty Retur:</span> {selectedRecord.qty_return} Pcs / KG</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold">Qty Rusak:</span> {selectedRecord.qty_damaged} Pcs / KG</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold">Alasan:</span> {selectedRecord.return_reason || "Quality Issues"}</p>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Panel 3: Document Viewer (50%) */}
                            <section className={`flex-1 bg-slate-100 dark:bg-[#0a0a0a] flex flex-col relative ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
                                {/* Toolbar */}
                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                    <button
                                        onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
                                        className="w-10 h-10 bg-slate-900/80 text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg">
                                        <span className="material-symbols-outlined">zoom_in</span>
                                    </button>
                                    <button
                                        onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
                                        className="w-10 h-10 bg-slate-900/80 text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg">
                                        <span className="material-symbols-outlined">zoom_out</span>
                                    </button>
                                    <button
                                        onClick={() => setRotation(prev => prev + 90)}
                                        className="w-10 h-10 bg-slate-900/80 text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg">
                                        <span className="material-symbols-outlined">rotate_right</span>
                                    </button>
                                    <button
                                        onClick={() => setIsFullscreen(!isFullscreen)}
                                        className="w-10 h-10 bg-slate-900/80 text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg">
                                        <span className="material-symbols-outlined">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                                    </button>
                                </div>

                                {/* Document Image */}
                                <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                                    <div className={`bg-white dark:bg-[#1a1a1a] shadow-2xl rounded-lg w-full h-full ${isFullscreen ? 'max-w-[90%]' : 'max-w-[600px]'} flex items-center justify-center relative border border-slate-200 dark:border-slate-800 overflow-hidden`}>
                                        <div 
                                            className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform duration-200" 
                                            data-alt="Photo of a signed delivery note and invoice" 
                                            style={{ 
                                                backgroundImage: `url('${selectedRecord.photo_url || defaultPhoto}')`, 
                                                transform: `scale(${zoom}) rotate(${rotation}deg)` 
                                            }}
                                        ></div>
                                        <div className="relative z-10 flex flex-col items-center pointer-events-none p-8 bg-black/40 rounded-xl backdrop-blur-sm">
                                            <span className="material-symbols-outlined text-6xl text-white">image</span>
                                            <span className="text-xs text-white mt-2 font-bold tracking-widest">DOCUMENT PREVIEW MODE</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Header */}
                                <div className="absolute top-4 left-4 z-10">
                                    <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-3 shadow-lg">
                                        <span className="material-symbols-outlined text-primary">verified_user</span>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Photo Evidence</p>
                                            <p className="text-white text-xs font-medium mt-1">Captured by {selectedRecord.driver_name} at {selectedRecord.timestamp ? selectedRecord.timestamp.split(' ')[1] : "-"}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </>
                    ) : null}
                </div>

                {selectedRecord && (
                    <footer className="h-20 bg-white dark:bg-[#111111] border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Live Connection Active</span>
                            </div>
                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 italic">Reviewing: {selectedRecord.order_id}</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleRejectClick}
                                disabled={submitting}
                                className="px-8 py-3 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-lg">cancel</span>
                                VERIFIKASI MANUAL
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={submitting}
                                className="px-8 py-3 bg-primary text-white hover:bg-primary/90 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                {submitting ? "Memproses..." : "VERIFIKASI COCOK"}
                            </button>
                        </div>
                    </footer>
                )}
            </div>

            {toast && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white font-bold flex items-center gap-2 transition-all ${toast.type === 'success' ? 'bg-green-500 animate-bounce' : 'bg-red-500'}`}>
                    <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
                    {toast.message}
                </div>
            )}

            {/* Signature Modal */}
            {showSignature && selectedRecord && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">draw</span>
                                Tanda Tangan Driver
                            </h3>
                            <button
                                onClick={() => setShowSignature(false)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col items-center">
                            <div className="w-full h-40 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center relative mb-4">
                                {/* Simulated Signature */}
                                <span className="text-4xl font-serif text-slate-400 dark:text-slate-600 italic select-none">{selectedRecord.driver_name}</span>
                                <div className="absolute bottom-2 right-2 text-[10px] text-slate-400">Digital Signature</div>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedRecord.driver_name}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Vehicle: {selectedRecord.vehicle_plate} ({selectedRecord.vehicle_type})</p>
                                <p className="text-[10px] text-slate-400">Timestamp: {selectedRecord.timestamp || "Baru saja"}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={() => setShowSignature(false)}
                                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors cursor-pointer active:scale-95"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedRecord && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">cancel</span>
                                Tolak / Verifikasi Manual e-POD
                            </h3>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleRejectSubmit}>
                            <div className="p-6 space-y-4">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Masukkan alasan penolakan dokumen e-POD untuk Surat Jalan <span className="font-bold text-slate-700 dark:text-slate-300">{selectedRecord.order_id}</span>. Supir akan menerima notifikasi dan harus mengunggah ulang.
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
                                    onClick={() => setShowRejectModal(false)}
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
            )}
        </>
    );
}

