import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner'; // 🌟 FIX CTO: Tambah notifikasi
import Header from '../../../shared/components/Header';
import { driverappService } from '../services/driverappService';
import { useDriverStore } from '../../../store/useDriverStore';

const DriverPodCapture: React.FC = () => {
    const navigate = useNavigate();
    const { activeStop, fetchMyRoute, tripData } = useDriverStore();
    const sigCanvas = useRef<SignatureCanvas>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    
    // 🌟 Tambah state loading
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Return (Retur) States
    const [hasReturn, setHasReturn] = useState(false);
    const [returnItems, setReturnItems] = useState([
        { skuProduct: '', qty: '', reason: '' }
    ]);
    const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDarkMode(document.documentElement.classList.contains('dark'));
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Gunakan produk yang dikirim ke toko ini dari activeStop
    // Format: [{nama_barang: "SGF BSL U 01 / 2.0KG TC", qty: "20.0 KG"}, ...]
    const stopItems: Array<{nama_barang: string; qty: string}> = activeStop?.items || [];


    // =========================================================
    // 🌟 EXIF STRIPPER & COMPRESSOR
    // =========================================================
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Jangan langsung disave! Masukin ke mesin cuci Canvas dulu
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        // Convert ke JPEG dgn kualitas 80%. Ini OTOMATIS MENGHAPUS EXIF GPS!
                        const strippedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        setCapturedImage(strippedDataUrl);
                    } else {
                        setCapturedImage(reader.result as string);
                    }
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerCamera = () => fileInputRef.current?.click();
    const clearSignature = () => sigCanvas.current?.clear();
    const removePhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCapturedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // =========================================================
    // 🌟 CONNECT BUTTON KE BACKEND API
    // =========================================================
    const handleSubmitPOD = async () => {
        const currentStopId = activeStop?.id;
        if (!currentStopId) {
            toast.error('Stop tidak ditemukan. Kembali ke halaman rute.');
            navigate('/driver/routes');
            return;
        }
        
        if (!capturedImage) {
            toast.error("Foto Surat Jalan wajib diisi!");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            
            // 1. Convert Base64 Foto ke File/Blob
            const rawBlob   = await (await fetch(capturedImage)).blob();
            const photoBlob = new Blob([await rawBlob.arrayBuffer()], { type: "image/jpeg" });
            formData.append('file', photoBlob, 'pod_photo.jpg');  // backend expects 'file' not 'photo'

            // 2. Convert Base64 TTD ke File/Blob (getTrimmedCanvas optional — fallback ke toDataURL)
            if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
                try {
                    const canvas = sigCanvas.current.getTrimmedCanvas?.()
                        ?? sigCanvas.current.getCanvas?.();
                    if (canvas) {
                        const sigDataUrl = canvas.toDataURL('image/png');
                        const sigBlob = await (await fetch(sigDataUrl)).blob();
                        formData.append('signature', sigBlob, 'signature.png');
                    }
                } catch {
                    // getTrimmedCanvas tidak tersedia — skip signature, lanjut submit
                }
            }

            // 3. Masukin data retur kalau ada
            if (hasReturn) {
                formData.append('returns', JSON.stringify(returnItems));
            }

            // 4. TEMBAK BACKEND!
            await driverappService.submitEpod(currentStopId, formData);

            toast.success("✅ Bukti pengiriman berhasil diunggah!");

            // Refresh data rute dari backend
            await fetchMyRoute();

            // Kalau semua stop selesai → summary, kalau belum → kembali ke daftar rute
            const freshData = await driverappService.getMyRoute();
            const allDone = freshData.total_stops > 0
                && freshData.completed_stops >= freshData.total_stops;
            if (allDone) {
                navigate('/driver/summary');
            } else {
                navigate('/driver/routes');
            }
        } catch (error) {
            console.error("Gagal submit POD:", error);
            toast.error("Gagal mengirim bukti. Coba lagi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = capturedImage && (!hasReturn || returnItems.every(item => item.skuProduct && item.qty && item.reason));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] font-sans transition-colors duration-300">
            <Header title="e-POD Capture" />

            <main className="max-w-md mx-auto px-4 py-6 flex flex-col min-h-[calc(100vh-80px)]">
                <div className="bg-white dark:bg-[#111111] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5 space-y-8">

                    {/* Return Selection Toggle */}
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold dark:text-white">Apakah ada barang retur?</h3>
                                <p className="text-[10px] text-slate-400 font-medium">Informasikan jika ada pengembalian</p>
                            </div>
                            <div className="flex bg-slate-200 dark:bg-white/10 p-1 rounded-xl">
                                <button
                                    onClick={() => setHasReturn(false)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!hasReturn ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-slate-500'}`}
                                >
                                    TIDAK
                                </button>
                                <button
                                    onClick={() => setHasReturn(true)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${hasReturn ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-slate-500'}`}
                                >
                                    ADA
                                </button>
                            </div>
                        </div>

                        {/* Return Form (Dynamic) */}
                        {hasReturn && (
                            <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                                {returnItems.map((item, index) => (
                                    <div key={index} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 relative">
                                        {returnItems.length > 1 && (
                                            <button
                                                onClick={() => setReturnItems(returnItems.filter((_, i) => i !== index))}
                                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center bg-white dark:bg-[#111111] rounded-full shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        )}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Produk & SKU</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={item.skuProduct}
                                                        onChange={(e) => {
                                                            const newItems = [...returnItems];
                                                            newItems[index].skuProduct = e.target.value;
                                                            setReturnItems(newItems);
                                                            setActiveDropdownIndex(index);
                                                        }}
                                                        onFocus={() => setActiveDropdownIndex(index)}
                                                        onBlur={() => setTimeout(() => setActiveDropdownIndex(null), 200)}
                                                        placeholder="Cari SKU atau Produk..."
                                                        className="w-full h-12 bg-white dark:bg-[#1A1A1A] border-none rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                                                    />
                                                    {activeDropdownIndex === index && (
                                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-[#2c2e33] rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto">
                                                            {stopItems.filter(s => !item.skuProduct || (s.nama_barang || '').toLowerCase().includes(item.skuProduct.toLowerCase())).map(s => (
                                                                <div
                                                                    key={s.nama_barang}
                                                                    onMouseDown={() => {
                                                                        const newItems = [...returnItems];
                                                                        newItems[index].skuProduct = s.nama_barang;
                                                                        setReturnItems(newItems);
                                                                        setActiveDropdownIndex(null);
                                                                    }}
                                                                    className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer border-b border-slate-50 dark:border-white/5 last:border-0"
                                                                >
                                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">{s.nama_barang}</p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">{s.qty}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Quantity (KG)</label>
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => {
                                                            const newItems = [...returnItems];
                                                            newItems[index].qty = e.target.value;
                                                            setReturnItems(newItems);
                                                        }}
                                                        placeholder="0.00"
                                                        className="w-full h-12 bg-white dark:bg-[#1A1A1A] border-none rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Alasan Retur</label>
                                                    <select
                                                        value={item.reason}
                                                        onChange={(e) => {
                                                            const newItems = [...returnItems];
                                                            newItems[index].reason = e.target.value;
                                                            setReturnItems(newItems);
                                                        }}
                                                        className="w-full h-12 bg-white dark:bg-[#1A1A1A] border-none rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                                                    >
                                                        <option value="">Pilih Alasan...</option>
                                                        <option value="Quality Issues">Quality Issues</option>
                                                        <option value="Mismatched SKU">Mismatched SKU</option>
                                                        <option value="Customer Rejection">Customer Rejection</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setReturnItems([...returnItems, { skuProduct: '', qty: '', reason: '' }])}
                                    className="w-full h-12 bg-primary/10 text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-all"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    Tambah Produk Retur
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Photo capture */}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />

                    <div onClick={triggerCamera} className={`flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer group active:scale-[0.98] overflow-hidden ${capturedImage ? 'border-green-500/50 bg-green-50/10' : 'border-primary/30 bg-primary/5 hover:bg-primary/10'}`}>
                        {capturedImage ? (
                            <div className="relative w-full aspect-video">
                                <img src={capturedImage} alt="Captured POD" className="w-full h-full object-cover rounded-2xl" />
                                <button onClick={removePhoto} className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl font-bold">add_a_photo</span>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold dark:text-white mb-1">Ambil Foto Surat Jalan</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Pastikan teks terlihat jelas & tidak buram</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Signature section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-bold dark:text-white">Tanda Tangan Penerima</p>
                                <p className="text-[10px] text-slate-400 font-medium">Tanda tangan di dalam kotak</p>
                            </div>
                            <button onClick={clearSignature} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider">
                                <span className="material-symbols-outlined text-sm">delete</span> Hapus
                            </button>
                        </div>
                        <div className="h-48 bg-slate-50 dark:bg-[#0a0a0a] rounded-2xl border border-slate-100 dark:border-white/10 relative shadow-inner overflow-hidden">
                            <SignatureCanvas
                                key={isDarkMode ? 'dark' : 'light'}
                                ref={sigCanvas}
                                penColor={isDarkMode ? "white" : "black"}
                                canvasProps={{ className: "signature-canvas w-full h-full", style: { width: '100%', height: '100%' } }}
                            />
                            {!sigCanvas.current?.isEmpty() && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                    <span className="text-slate-300 dark:text-slate-700 font-bold select-none">AREA TANDA TANGAN</span>
                                </div>
                            )}
                            <div className="absolute bottom-6 left-6 right-6 h-px border-b border-dashed border-slate-200 dark:border-white/10 pointer-events-none"></div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-8 pb-8 space-y-4">
                    {/* 🌟 FIX CTO: Tombol sekarang panggil handleSubmitPOD, ada loading state-nya! */}
                    <button
                        onClick={handleSubmitPOD}
                        disabled={!isFormValid || isSubmitting}
                        className={`w-full h-16 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 uppercase tracking-wide ${isFormValid && !isSubmitting
                            ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></span>
                                MENGUNGGAH...
                            </span>
                        ) : 'KIRIM BUKTI (SUBMIT)'}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default DriverPodCapture;