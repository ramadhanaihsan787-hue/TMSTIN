import { useState, useEffect } from "react";
import Header from "../../../shared/components/Header";
import { podService, type PodRecord } from "../services/podService";
import { toast } from "sonner"; 

// Helper function to format timestamp beautifully
const formatTimestamp = (tsStr: string) => {
    if (!tsStr) return "-";
    try {
        const parts = tsStr.split(" ");
        if (parts.length === 2) {
            const dateParts = parts[0].split("-");
            const timeParts = parts[1].split(":");
            if (dateParts.length === 3 && timeParts.length >= 2) {
                const year = dateParts[0];
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
                const monthIdx = parseInt(dateParts[1], 10) - 1;
                const month = monthNames[monthIdx] || dateParts[1];
                const day = dateParts[2];
                return `${timeParts[0]}:${timeParts[1]}, ${day} ${month} ${year}`;
            }
        }
        return tsStr;
    } catch {
        return tsStr;
    }
};

// Action Menu Component for Main Table Rows
const ActionMenu = ({ 
    orderId, 
    currentOpenId, 
    setOpenId, 
    onViewDetail 
}: { 
    orderId: string; 
    currentOpenId: string | null; 
    setOpenId: (id: string | null) => void;
    onViewDetail: () => void;
}) => (
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
                            toast.info(`Mengunduh PDF untuk ${orderId}...`);
                            setOpenId(null);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222] hover:text-primary dark:hover:text-primary rounded-lg transition-colors text-left group active:scale-95 font-medium"
                    >
                        <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">picture_as_pdf</span> Unduh PDF
                    </button>
                    <button 
                        onClick={() => {
                            toast.info(`Mencetak arsip untuk ${orderId}...`);
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

export default function History() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [historyList, setHistoryList] = useState<PodRecord[]>([]);
    
    // Filters State
    const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "PARTIAL">("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const [openActionId, setOpenActionId] = useState<string | null>(null);

    // Modal & Previewer States
    const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);
    const [showSignatureOrderId, setShowSignatureOrderId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const defaultPhoto = "https://lh3.googleusercontent.com/aida-public/AB6AXuDTx9bYd1hgeeWX1P-Y3mUYWXFJXplpHkDmiLVOPyUD3oP3aJElteBrqefiqoN_-Cj5Dqk33srhBY4zrITGWjG4ujVaQ3xQiGHog_oa0w-kghUP08wCk7mbK3RgDR27N3ExeGW_7vXLuybyDzoF7w7L4Fzs5otvHtFs0O1ISma6-tYq2OIj-SzkbZ0odalVapd_oC_uUxt9sT4GPxUp9FvuyJKHZYgvTHhgpqDDZ-7TTMrExRscqw9-YCYrE7uWpnNL07ggrbIz1D0";

    // Fetch dynamic historical data from database
    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await podService.getPodHistory(statusFilter, searchQuery);
            if (response.status === "success") {
                setHistoryList(response.data);
            } else {
                setError("Gagal memuat riwayat e-POD.");
            }
        } catch (err: any) {
            console.error("Error fetching POD history:", err);
            setError(err?.response?.data?.detail || "Gagal menghubungi server backend.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        // Hide open action menus on filter change
        setOpenActionId(null);
    }, [statusFilter, searchQuery]);

    // Active record for detail modal
    const selectedRecord = historyList.find(r => r.order_id === selectedOrderIdForDetail) || null;
    
    // Active record for signature modal
    const signatureRecord = historyList.find(r => r.order_id === showSignatureOrderId) || null;

    // Filter table returns
    const returnOrders = historyList.filter(item => item.qty_return > 0 || item.status === "delivered_partial" || item.status === "DELIVERED_PARTIAL");

    // Dynamic stats computation for the Summary Card
    const totalDocs = historyList.length;
    const successDocs = historyList.filter(item => item.status === "BILLED" || item.status === "delivered_success").length;
    const returnDocs = historyList.filter(item => item.qty_return > 0 || item.status === "delivered_partial" || item.status === "DELIVERED_PARTIAL").length;
    const successPercentage = totalDocs > 0 ? ((successDocs / totalDocs) * 100).toFixed(1) : "0.0";

    const getTabClass = (tab: "ALL" | "SUCCESS" | "PARTIAL") => {
        if (statusFilter === tab) {
            return "px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-bold";
        }
        return "px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2A2A2A] rounded-lg text-sm font-bold transition-colors";
    };

    const handleDownloadReport = (format: string) => {
        setIsDownloadMenuOpen(false);
        toast.success(`Laporan format ${format} berhasil diexport dan diunduh untuk ${totalDocs} dokumen!`);
    };

    return (
        <>
            {/* Header */}
            <Header title="Riwayat & Arsip Dokumen" />

            {/* Main Content Area */}
            <div className="p-8 space-y-6">
                
                {/* Filters & Search Toolbar */}
                <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-[#1a1a1a] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Status Filter (Dropdown)</span>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "SUCCESS" | "PARTIAL")}
                            className="bg-background-light dark:bg-[#222] dark:text-slate-300 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-primary focus:border-primary transition-colors py-2 px-3 outline-none"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="SUCCESS">Selesai (Success)</option>
                            <option value="PARTIAL">Gagal / Retur (Partial)</option>
                        </select>
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Cari Data</span>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-[#222] dark:text-slate-300 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary transition-colors outline-none" 
                                placeholder="Cari No. DO, Nama Toko, atau Driver..." 
                                type="text" 
                            />
                        </div>
                    </div>
                    <div className="flex items-end self-stretch relative pt-5">
                        <button 
                            onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)} 
                            className="flex items-center gap-2 border-2 border-primary text-primary px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary hover:text-white transition-all h-[42px] cursor-pointer active:scale-95"
                        >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Unduh Laporan
                        </button>
                        {isDownloadMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl shadow-lg z-20 overflow-hidden text-left">
                                <div className="p-2 flex flex-col gap-1">
                                    <button 
                                        onClick={() => handleDownloadReport("Excel/CSV")}
                                        className="flex items-center gap-3 p-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222] hover:text-primary rounded-lg transition-colors active:scale-95 text-left font-medium w-full"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">summarize</span> Excel (CSV)
                                    </button>
                                    <button 
                                        onClick={() => handleDownloadReport("PDF Report")}
                                        className="flex items-center gap-3 p-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222] hover:text-primary rounded-lg transition-colors active:scale-95 text-left font-medium w-full"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span> PDF Report
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Dynamic Summary Card */}
                <div className="bg-primary/10 border border-primary/20 p-6 rounded-xl flex items-center justify-between transition-all">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined">fact_check</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Arsip e-POD</h3>
                            <p className="text-slate-600 dark:text-slate-300 font-medium">
                                {successDocs}/{totalDocs} ({successPercentage}%) Documents Verified. <span className="text-red-500 font-bold">{returnDocs} Returns</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <div className="text-right">
                            <div className="text-xs text-slate-500 uppercase font-bold">Rata-rata Waktu Verifikasi</div>
                            <div className="text-2xl font-black text-primary">32 Menit</div>
                        </div>
                    </div>
                </div>

                {/* Table Content: Riwayat & Arsip Dokumen */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                    {/* Tab Navigation */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-[#1E1E1E]">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setStatusFilter("ALL")} 
                                className={getTabClass("ALL")}
                            >
                                All Archive
                            </button>
                            <button 
                                onClick={() => setStatusFilter("SUCCESS")} 
                                className={getTabClass("SUCCESS")}
                            >
                                Verified Only
                            </button>
                            <button 
                                onClick={() => setStatusFilter("PARTIAL")} 
                                className={getTabClass("PARTIAL")}
                            >
                                Returns/Flagged
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => fetchHistory()} className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" title="Segarkan data">
                                <span className="material-symbols-outlined text-sm">refresh</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-[#222]/80 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">STATUS & ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">FLEET & DRIVER</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CUSTOMER</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">TIMELINE LOGS</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">DOCS & PROOF</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                                            <p className="text-xs text-slate-400 mt-3 font-semibold uppercase tracking-widest">Memuat riwayat...</p>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-red-500">
                                            <span className="material-symbols-outlined text-3xl">error_outline</span>
                                            <p className="text-sm font-bold mt-2">Gagal Memuat Data</p>
                                            <p className="text-xs text-slate-400 mt-1">{error}</p>
                                        </td>
                                    </tr>
                                ) : historyList.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <span className="material-symbols-outlined text-4xl">folder_off</span>
                                            <p className="text-sm font-bold mt-2">Tidak Ada Arsip Dokumen</p>
                                            <p className="text-xs mt-1">Gunakan kata kunci pencarian atau ganti status filter.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    historyList.map((item) => {
                                        const isReturn = item.qty_return > 0 || item.status === "delivered_partial" || item.status === "DELIVERED_PARTIAL";
                                        return (
                                            <tr key={item.order_id} className="hover:bg-slate-50 dark:hover:bg-[#222]/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    {isReturn ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 mb-1">RETURNED</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 mb-1">VERIFIED</span>
                                                    )}
                                                    <div 
                                                        onClick={() => setSelectedOrderIdForDetail(item.order_id)} 
                                                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-primary cursor-pointer transition-colors"
                                                    >
                                                        {item.order_id}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white">{item.vehicle_plate || "No Vehicle"}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{item.driver_name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={item.customer_name}>{item.customer_name}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={item.customer_address}>{item.customer_address}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-1">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                        <span>Sub: {formatTimestamp(item.timestamp)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                        <span>Ver: Selesai</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            onClick={() => setSelectedOrderIdForDetail(item.order_id)}
                                                            className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300 font-bold cursor-pointer hover:bg-primary/10 transition-colors border border-slate-300 dark:border-slate-600 overflow-hidden relative"
                                                        >
                                                            {item.photo_url ? (
                                                                <img src={item.photo_url} alt="POD" className="w-full h-full object-cover" />
                                                            ) : (
                                                                "IMG"
                                                            )}
                                                        </div>
                                                        <button 
                                                            onClick={() => setShowSignatureOrderId(item.order_id)}
                                                            className="material-symbols-outlined text-green-500 hover:text-green-600 transition-colors p-1" 
                                                            title="Tanda Tangan"
                                                        >
                                                            draw
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <ActionMenu 
                                                        orderId={item.order_id} 
                                                        currentOpenId={openActionId} 
                                                        setOpenId={setOpenActionId} 
                                                        onViewDetail={() => setSelectedOrderIdForDetail(item.order_id)}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination (Static / Dynamic Visuals) */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#1a1a1a]">
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Showing {historyList.length} of {historyList.length} records
                        </span>
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" disabled><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                            <button className="w-8 h-8 bg-primary text-white rounded-full text-sm font-bold">1</button>
                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" disabled><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                        </div>
                    </div>
                </div>

                {/* Historical Return Audit Table */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-[#1E1E1E]">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Historical Return Audit Table</h3>
                            <p className="text-xs text-slate-400 mt-1">Audit log khusus untuk pengiriman bermasalah atau retur sebagian</p>
                        </div>
                        <button 
                            onClick={() => handleDownloadReport("Returns CSV")} 
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors cursor-pointer active:scale-95"
                        >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Export Excel/CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-[#222]/80 border-b border-slate-200 dark:border-slate-700">
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">DO ID</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Weight/Qty</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Return Cause</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Driver Notes</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-xs text-slate-400 uppercase tracking-wider font-semibold">Memuat data retur...</td>
                                    </tr>
                                ) : returnOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 px-6 text-sm text-center text-slate-400 italic">
                                            Tidak ada data retur historis yang ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    returnOrders.map((row) => {
                                        const firstItem = row.items && row.items.length > 0 ? row.items[0].nama_barang : "-";
                                        const itemCount = row.items && row.items.length > 1 ? ` (+${row.items.length - 1} items)` : "";
                                        return (
                                            <tr key={row.order_id} className="hover:bg-slate-50 dark:hover:bg-[#222]/50 transition-colors">
                                                <td className="py-4 px-6 text-sm dark:text-slate-300">{row.timestamp ? row.timestamp.split(' ')[0] : "-"}</td>
                                                <td className="py-4 px-6 text-sm font-semibold dark:text-white">{row.customer_name}</td>
                                                <td className="py-4 px-6 text-xs font-mono text-slate-500">{row.order_id}</td>
                                                <td className="py-4 px-6 text-sm dark:text-slate-300">{firstItem}{itemCount}</td>
                                                <td className="py-4 px-6 text-sm font-bold dark:text-white">{row.qty_return} KG/Pcs</td>
                                                <td className="py-4 px-6 text-sm dark:text-slate-300">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400">
                                                        {row.return_reason || "Quality Issues"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-sm text-center dark:text-slate-300 italic">"{row.driver_notes || "-"}"</td>
                                                <td className="py-4 px-6 text-right relative">
                                                    <button
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setOpenActionId(openActionId === `return_${row.order_id}` ? null : `return_${row.order_id}`); 
                                                        }}
                                                        className="px-3 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold rounded hover:bg-primary hover:text-white transition-all active:scale-95 cursor-pointer flex items-center gap-1 ml-auto"
                                                    >
                                                        Details <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                                                    </button>
                                                    {openActionId === `return_${row.order_id}` && (
                                                        <div className="absolute right-6 top-10 mt-1 w-48 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl shadow-lg z-20 overflow-hidden text-left">
                                                            <div className="p-2 flex flex-col">
                                                                <button 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        setSelectedOrderIdForDetail(row.order_id); 
                                                                        setOpenActionId(null); 
                                                                    }} 
                                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222] hover:text-primary rounded-lg transition-colors text-left group active:scale-95 font-medium"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">visibility</span> View Report
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        toast.info(`Downloading PDF report for ${row.order_id}...`); 
                                                                        setOpenActionId(null); 
                                                                    }} 
                                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222] hover:text-primary rounded-lg transition-colors text-left group active:scale-95 font-medium"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">download</span> Download PDF
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Read-Only Bukti e-POD Detail Modal */}
            {selectedOrderIdForDetail && selectedRecord && (
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
                                onClick={() => {
                                    setSelectedOrderIdForDetail(null);
                                    setZoom(1);
                                    setRotation(0);
                                }}
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
                                        onClick={() => setShowSignatureOrderId(selectedRecord.order_id)}
                                        className="text-xs text-primary font-bold hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">draw</span>
                                        Lihat Tanda Tangan Driver
                                    </button>
                                </div>
                                
                                {(selectedRecord.qty_return > 0 || selectedRecord.status === "delivered_partial" || selectedRecord.status === "DELIVERED_PARTIAL") && (
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
                                                backgroundImage: `url('${selectedRecord.photo_url ? (selectedRecord.photo_url.startsWith('http') ? selectedRecord.photo_url : (import.meta.env.VITE_API_URL || 'http://localhost:8000') + selectedRecord.photo_url) : defaultPhoto}')`, 
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
                                onClick={() => {
                                    setSelectedOrderIdForDetail(null);
                                    setZoom(1);
                                    setRotation(0);
                                }}
                                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors cursor-pointer active:scale-95"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {showSignatureOrderId && signatureRecord && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in duration-150">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">draw</span>
                                Tanda Tangan Driver (Arsip)
                            </h3>
                            <button
                                onClick={() => setShowSignatureOrderId(null)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col items-center">
                            <div className="w-full h-40 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center relative mb-4">
                                <span className="text-4xl font-serif text-slate-400 dark:text-slate-600 italic select-none">{signatureRecord.driver_name}</span>
                                <div className="absolute bottom-2 right-2 text-[10px] text-slate-400">Digital Signature</div>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{signatureRecord.driver_name}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Vehicle: {signatureRecord.vehicle_plate} ({signatureRecord.vehicle_type})</p>
                                <p className="text-[10px] text-slate-400">Timestamp: {signatureRecord.timestamp || "Baru saja"}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={() => setShowSignatureOrderId(null)}
                                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors cursor-pointer active:scale-95"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}