interface DriverToolbarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
}

export default function DriverToolbar({ searchQuery, onSearchChange }: DriverToolbarProps) {
    return (
        <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Driver Performance Directory</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Monitor driver performance and real-time shift progress.</p>
            </div>

            <div className="flex items-center gap-4 w-full lg:max-w-xl justify-end">
                <div className="relative w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-800 dark:text-white shadow-sm" 
                        placeholder="Find Driver by name or ID..." 
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#333] rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1A1A1A] shadow-sm whitespace-nowrap">
                    <span className="material-symbols-outlined text-sm">filter_list</span>
                    Filter
                </button>
            </div>
        </div>
    );
}