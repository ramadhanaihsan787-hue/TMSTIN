export default function SettingsHeader() {
    return (
        <header className="sticky top-0 z-10 bg-white dark:bg-[#111111] border-b border-slate-200 dark:border-[#333] px-4 md:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-xl font-bold">Settings Configuration</h1>
            <div className="flex items-center gap-6">
                <div className="relative hidden md:block">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xl">search</span>
                    <input className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-[#1A1A1A] border border-transparent rounded-lg text-sm focus:ring-2 focus:ring-primary w-64 outline-none text-[#111] dark:text-white" placeholder="Search settings..." type="text" />
                </div>
            </div>
        </header>
    );
}