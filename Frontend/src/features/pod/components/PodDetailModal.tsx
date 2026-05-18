import React, { useState } from 'react';
import type { PodRecord } from '../services/podService';

interface PodDetailModalProps {
    selectedRecord: PodRecord;
    onClose: () => void;
    onViewSignature: (orderId: string) => void;
}

const defaultPhoto = "https://lh3.googleusercontent.com/aida-public/AB6AXuDTx9bYd1hgeeWX1P-Y3mUYWXFJXplpHkDmiLVOPyUD3oP3aJElteBrqefiqoN_-Cj5Dqk33srhBY4zrITGWjG4ujVaQ3xQiGHog_oa0w-kghUP08wCk7mbK3RgDR27N3ExeGW_7vXLuybyDzoF7w7L4Fzs5otvHtFs0O1ISma6-tYq2OIj-SzkbZ0odalVapd_oC_uUxt9sT4GPxUp9FvuyJKHZYgvTHhgpqDDZ-7TTMrExRscqw9-YCYrE7uWpnNL07ggrbIz1D0";

export const PodDetailModal: React.FC<PodDetailModalProps> = ({
    selectedRecord,
    onClose,
    onViewSignature
}) => {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const isReturn = selectedRecord.qty_return > 0 || selectedRecord.status === "delivered_partial" || selectedRecord.status === "DELIVERED_PARTIAL";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-6xl w-full h-[85vh] border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">fact_check</span>
                            Arsip Bukti Dokumen e-POD - #{selectedRecord.order_id}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Status Dokumen: <span className="font-bold text-green-500 uppercase">{selectedRecord.status || "VERIFIED"}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                {/* Modal Body */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Info Panel */}
                    <div className="w-[40%] border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-[#111111] overflow-y-auto">
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
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {selectedRecord.timestamp ? selectedRecord.timestamp.split(' ')[0] : "-"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-bold uppercase text-[10px]">Truck & Driver</p>
                                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {selectedRecord.vehicle_plate || "-"} / {selectedRecord.driver_name}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-auto min-h-[150px]">
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
                        
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-slate-400 text-sm">chat_bubble</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Driver Notes</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 italic mb-3">
                                "{selectedRecord.driver_notes || "Tidak ada catatan tambahan."}"
                            </p>
                            
                            <button
                                onClick={() => onViewSignature(selectedRecord.order_id)}
                                className="text-xs text-primary font-bold hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">draw</span>
                                Lihat Tanda Tangan Driver
                            </button>
                        </div>
                        
                        {isReturn && (
                            <div className="p-4 bg-red-50 dark:bg-red-500/5 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-red-500 text-sm">assignment_return</span>
                                    <span className="text-[10px] font-bold text-red-500 uppercase">Detail Retur</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold">Qty Retur:</span> {selectedRecord.qty_return} KG/Pcs</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold">Qty Rusak:</span> {selectedRecord.qty_damaged} KG/Pcs</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold">Alasan:</span> {selectedRecord.return_reason || "Quality Issues"}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Right Preview Panel */}
                    <div className="flex-1 bg-slate-100 dark:bg-[#0a0a0a] flex flex-col relative overflow-hidden">
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <button
                                onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
                                className="w-10 h-10 bg-slate-900/80 text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg cursor-pointer">
                                <span className="material-symbols-outlined">zoom_in</span>
                            </button>
                            <button
                                onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
                                className="w-10 h-10 bg-slate-900/80 text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg cursor-pointer">
                                <span className="material-symbols-outlined">zoom_out</span>
                            </button>
                            <button
                                onClick={() => setRotation(prev => prev + 90)}
                                className="w-10 h-10 bg-slate-900/80 text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg cursor-pointer">
                                <span className="material-symbols-outlined">rotate_right</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                            <div className="bg-white dark:bg-[#1a1a1a] shadow-2xl rounded-lg w-full h-full max-w-[650px] flex items-center justify-center relative border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div 
                                    className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform duration-200" 
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
                        
                        <div className="absolute top-4 left-4 z-10">
                            <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-3 shadow-lg">
                                <span className="material-symbols-outlined text-primary">verified_user</span>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Photo Evidence</p>
                                    <p className="text-white text-xs font-medium mt-1">Captured by {selectedRecord.driver_name} at {selectedRecord.timestamp || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 shrink-0">
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
