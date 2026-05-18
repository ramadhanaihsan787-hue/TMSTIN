import { useKasirDashboardState } from '../hooks/useKasirDashboardState';
import {
    BopInputForm,
    BopSummaryPanel,
    BopImportPreview,
    BopDailyHistoryTable,
    BopDetailModal
} from '../components';

export default function KasirDashboard() {
    const {
        topRef,
        entries,
        fleets,
        drivers,
        selectedFleetIdx,
        setSelectedFleetIdx,
        isOncall,
        setIsOncall,
        oncallPlate,
        setOncallPlate,
        selectedDriver,
        setSelectedDriver,
        customDriver,
        setCustomDriver,
        selectedHelper,
        setSelectedHelper,
        customHelper,
        setCustomHelper,
        bbm,
        setBbm,
        tol,
        setTol,
        parkir,
        setParkir,
        parkirLiar,
        setParkirLiar,
        kuliAngkut,
        setKuliAngkut,
        lainLain,
        setLainLain,
        showToast,
        editingId,
        detailEntry,
        setDetailEntry,
        isUploading,
        uploadSuccess,
        fileInputRef,
        parsedPreview,
        showImportToast,
        setShowImportToast,
        importToastMsg,
        currentPlate,
        currentDriver,
        currentHelper,
        total,
        resetForm,
        handleSubmit,
        handleDownloadTemplate,
        handleImportClick,
        handleExcelUpload,
        handleConfirmImport,
        handleCancelImport,
        handleExportExcel,
        handleEdit,
        handleDelete,
        todayEntries
    } = useKasirDashboardState();

    return (
        <div ref={topRef} className="p-6 lg:p-8">
            {/* Toast */}
            {showToast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-[slideIn_0.3s_ease-out]">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span className="font-semibold">Biaya untuk {currentPlate} berhasil {editingId ? 'diupdate' : 'dicatat'}!</span>
                </div>
            )}

            {/* Excel Upload Loading Overlay */}
            {isUploading && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary text-2xl">description</span>
                    </div>
                    <p className="mt-4 font-bold text-slate-900 dark:text-white text-lg tracking-tight">Processing Excel Data...</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Please wait a moment</p>
                </div>
            )}

            {/* Excel Upload Success Toast */}
            {uploadSuccess && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-[slideDown_0.4s_ease-out]">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-xl">check</span>
                    </div>
                    <div>
                        <p className="font-bold text-lg leading-none">Upload Berhasil!</p>
                        <p className="text-white/80 text-xs mt-1 font-medium tracking-wide uppercase">Data Excel telah berhasil diimpor</p>
                    </div>
                </div>
            )}

            {/* Sync-Import Dynamic Notification Toast */}
            {showImportToast && (
                <div className="fixed top-6 right-6 z-[200] bg-gradient-to-r from-slate-900 to-slate-800 dark:from-[#222] dark:to-[#1a1a1a] text-white border border-slate-700/50 dark:border-slate-800 p-5 rounded-2xl shadow-2xl flex items-start gap-4 animate-[slideIn_0.3s_ease-out] max-w-md">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl text-orange-500">sync_saved_locally</span>
                    </div>
                    <div className="space-y-1">
                        <p className="font-extrabold text-slate-100 leading-tight">{importToastMsg.title}</p>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium">{importToastMsg.desc}</p>
                    </div>
                    <button onClick={() => setShowImportToast(false)} className="text-slate-400 hover:text-slate-200 transition-colors shrink-0">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            {/* Page Title & Excel Integration Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100 dark:border-white/5">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        Operational Expense Entry
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm">
                        Input daily costs for fleet operations and deliveries.
                    </p>
                </div>

                {/* Minimalist Premium 2-Button Toolbar - Highlighting Import & Upload/Template directly */}
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-white/[0.02] p-2 rounded-2xl border border-slate-200/40 dark:border-white/5">
                    {/* Tombol 1: Unduh Template BOP */}
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-sm border-2 border-amber-500/40 text-amber-600 dark:text-amber-500 hover:bg-amber-500/5 hover:border-amber-500/60 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-sm group"
                    >
                        <span className="material-symbols-outlined text-lg group-hover:animate-bounce">download</span>
                        Unduh Template BOP
                    </button>

                    {/* Tombol 2: Unggah / Impor BOP */}
                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
                    >
                        <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">publish</span>
                        Unggah / Impor BOP
                    </button>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleExcelUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />

            {parsedPreview.length === 0 ? (
                <div className="flex flex-col lg:flex-row gap-8 items-start animate-[fadeIn_0.3s_ease-out] w-full">
                    {/* Left Column: Input Forms */}
                    <BopInputForm
                        isOncall={isOncall}
                        setIsOncall={setIsOncall}
                        oncallPlate={oncallPlate}
                        setOncallPlate={setOncallPlate}
                        selectedFleetIdx={selectedFleetIdx}
                        setSelectedFleetIdx={setSelectedFleetIdx}
                        fleets={fleets}
                        drivers={drivers}
                        selectedDriver={selectedDriver}
                        setSelectedDriver={setSelectedDriver}
                        customDriver={customDriver}
                        setCustomDriver={setCustomDriver}
                        selectedHelper={selectedHelper}
                        setSelectedHelper={setSelectedHelper}
                        customHelper={customHelper}
                        setCustomHelper={setCustomHelper}
                        bbm={bbm}
                        setBbm={setBbm}
                        tol={tol}
                        setTol={setTol}
                        parkir={parkir}
                        setParkir={setParkir}
                        parkirLiar={parkirLiar}
                        setParkirLiar={setParkirLiar}
                        kuliAngkut={kuliAngkut}
                        setKuliAngkut={setKuliAngkut}
                        lainLain={lainLain}
                        setLainLain={setLainLain}
                    />

                    {/* Right Column: Cost Summary Sticky Panel */}
                    <BopSummaryPanel
                        currentPlate={currentPlate}
                        currentDriver={currentDriver}
                        currentHelper={currentHelper}
                        bbm={bbm}
                        tol={tol}
                        parkir={parkir}
                        parkirLiar={parkirLiar}
                        kuliAngkut={kuliAngkut}
                        lainLain={lainLain}
                        total={total}
                        editingId={editingId}
                        resetForm={resetForm}
                        handleSubmit={handleSubmit}
                    />
                </div>
            ) : (
                /* Gorgeous Imported Data Preview Workspace */
                <BopImportPreview
                    parsedPreview={parsedPreview}
                    handleCancelImport={handleCancelImport}
                    handleConfirmImport={handleConfirmImport}
                />
            )}

            {/* Section 3: Daily History Table */}
            <BopDailyHistoryTable
                todayEntries={todayEntries}
                entries={entries}
                handleExportExcel={handleExportExcel}
                setDetailEntry={setDetailEntry}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
            />

            {/* Detail Modal */}
            {detailEntry && (
                <BopDetailModal
                    detailEntry={detailEntry}
                    onClose={() => setDetailEntry(null)}
                />
            )}
        </div>
    );
}
