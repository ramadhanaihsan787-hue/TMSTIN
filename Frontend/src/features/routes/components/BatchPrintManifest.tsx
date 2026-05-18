import React from 'react';

interface BatchPrintManifestProps {
    allRoutes: any[]; // Data array SEMUA jadwal truk dari Backend
}

export default function BatchPrintManifest({ allRoutes }: BatchPrintManifestProps) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Kalau datanya kosong, jangan render apa-apa
    if (!allRoutes || allRoutes.length === 0) return null;

    return (
        /* 🌟 DIV UTAMA GAIB: Cuma muncul pas diprint */
        <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:text-black print:z-[999999] print:p-0 w-full font-sans text-xs">
            
            {/* 🌟 LOOPING SEMUA TRUK DI SINI */}
            {allRoutes.map((routeData, index) => {
                let printCounter = 1;

                return (
                    /* 🌟 JURUS SAKTI CTO: break-after-page bikin tiap truk nge-print di kertas baru! */
                    <div key={index} className="break-after-page p-8" style={{ pageBreakAfter: 'always' }}>
                        
                        {/* Header Perusahaan & Tanggal */}
                        <div className="flex justify-between items-start border-b-[3px] border-black pb-4 mb-6">
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-widest text-black">DELIVERY ROUTE</h1>
                                <p className="font-bold text-black text-sm mt-1">PT. SO GOOD FOOD - JAPFA GROUP</p>
                                <p className="font-medium text-black text-xs">DEPO CIKUPA</p>
                            </div>
                            <div className="text-right flex gap-8 font-bold text-sm">
                                <div className="text-left space-y-1">
                                    <p>KM AWAL <span className="inline-block w-32 border-b border-black border-dashed ml-2"></span></p>
                                    <p>KM AKHIR <span className="inline-block w-32 border-b border-black border-dashed ml-2"></span></p>
                                </div>
                                <div className="text-left">
                                    <p>TANGGAL : <span className="ml-2 font-black">{routeData.tanggal || todayStr}</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Info Kru dan Armada */}
                        <div className="grid grid-cols-2 gap-8 mb-6 font-bold text-sm">
                            <div className="space-y-3">
                                <p>NO POLISI <span className="ml-10">: <span className="uppercase text-lg border-b border-black border-dashed pb-0.5 px-4 font-black">{routeData.kendaraan || routeData.armada || "—"}</span></span></p>
                                <p>JAM KELUAR CIKUPA <span className="ml-1">: <span className="inline-block w-24 border-b border-black border-dashed px-2 text-center text-gray-300">____ : ____</span></span></p>
                                <p>JAM KEMBALI CIKUPA <span className="ml-[1px]">: <span className="inline-block w-24 border-b border-black border-dashed px-2 text-center text-gray-300">____ : ____</span></span></p>
                            </div>
                            <div className="space-y-3">
                                <p>NAMA SOPIR <span className="ml-6">: <span className="uppercase border-b border-black border-dashed pb-0.5 px-4">{routeData.driver_name || routeData.driverName || "—"}</span></span></p>
                                <p>NAMA HELPER <span className="ml-[18px]">: <span className="uppercase border-b border-black border-dashed pb-0.5 px-4">{routeData.helper_name || routeData.helperName || "Tanpa Helper"}</span></span></p>
                            </div>
                        </div>

                        {/* Tabel Manifest Persis Template Excel */}
                        <table className="w-full border-collapse border-2 border-black text-xs">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-2 text-center w-12 font-black">NO.<br/>URUT</th>
                                    <th className="border border-black p-2 text-left font-black">NAMA PELANGGAN</th>
                                    <th className="border border-black p-2 text-center w-24 font-black">JML BRG<br/>(KG)</th>
                                    <th className="border border-black p-2 text-center w-32 font-black">NO. DO / SO</th>
                                    <th className="border border-black p-2 text-center w-24 font-black">JENIS<br/>BARANG</th>
                                    <th className="border border-black p-2 text-center w-20 font-black">JAM TIBA</th>
                                    <th className="border border-black p-2 text-center w-20 font-black">JAM KELUAR</th>
                                    <th className="border border-black p-2 text-left w-40 font-black">KETERANGAN / ALASAN PENDING</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(routeData.details || routeData.detail_rute || routeData.detail_perjalanan || []).map((stop: any, stopIdx: number) => {
                                    const namaToko = stop.storeName || stop.nama_toko || stop.lokasi || "Toko JAPFA";
                                    const beratKg = stop.weightKg || stop.berat_kg || stop.turun_barang_kg || 0;
                                    const noDO = stop.nomor_do || stop.order_id || "-";
                                    const jamTiba = stop.arrivalTime || stop.jam_tiba || stop.jam;

                                    if (namaToko === "📍 GUDANG JAPFA" || stop.keterangan === "Start" || stop.keterangan === "Finish") return null;

                                    const urutanCetak = printCounter++;

                                    return (
                                        <tr key={stopIdx}>
                                            <td className="border border-black p-2 text-center font-bold">{urutanCetak}</td>
                                            <td className="border border-black p-2 font-black uppercase text-[11px] leading-tight">{namaToko}</td>
                                            <td className="border border-black p-2 text-center font-bold">{beratKg}</td>
                                            <td className="border border-black p-2 text-center text-[10px] break-all">{noDO}</td>
                                            <td className="border border-black p-2 text-center font-semibold text-[10px]">
                                                {stop.items && stop.items.length > 0 ? stop.items[0].tipe || "FRESH/FROZEN" : "MIX"}
                                            </td>
                                            <td className="border border-black p-2 text-center font-mono">{jamTiba || "   :   "}</td>
                                            <td className="border border-black p-2 text-center font-mono"></td>
                                            <td className="border border-black p-2 text-[9px] italic text-gray-600 border-dashed">
                                                {stop.items?.map((it: any) => `${it.sku}(${it.qty})`).join(', ') || ''}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Baris Total */}
                                <tr className="bg-gray-100">
                                    <td colSpan={2} className="border border-black p-2 text-right font-black">TOTAL MUATAN ARMADA:</td>
                                    <td className="border border-black p-2 text-center font-black text-sm">{routeData.totalWeight || routeData.total_berat || 0}</td>
                                    <td colSpan={5} className="border border-black p-2"></td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Warning Text & Kolom Tanda Tangan */}
                        <div className="mt-4 mb-16">
                            <p className="text-[10px] font-bold italic">
                                * Dokumen hasil pengiriman wajib diserahkan ke Bagian Administrasi Gudang dihari yang sama setelah perjalanan selesai.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-8 text-center text-sm font-bold">
                            <div className="flex flex-col items-center">
                                <p className="mb-16">Dibuat Oleh (Admin),</p>
                                <div className="border-b border-black w-40"></div>
                            </div>
                            <div className="flex flex-col items-center">
                                <p className="mb-16">Disetujui (Security),</p>
                                <div className="border-b border-black w-40"></div>
                            </div>
                            <div className="flex flex-col items-center">
                                <p className="mb-16">Dibawa Oleh (Sopir),</p>
                                <div className="border-b border-black w-40 uppercase">{routeData.driver_name || routeData.driverName || ""}</div>
                            </div>
                        </div>

                    </div>
                );
            })}
        </div>
    );
}