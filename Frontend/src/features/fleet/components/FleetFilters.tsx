// src/features/fleet/components/FleetFilters.tsx

interface FleetFiltersProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onMoreFiltersClick?: () => void;
}

export default function FleetFilters({
    activeTab,
    onTabChange,
    searchQuery,
    onSearchChange,
    onMoreFiltersClick
}: FleetFiltersProps) {
    const tabs = ['All Trucks', 'Active', 'Idle', 'Maintenance', 'Alerts'];

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            {/* Filter Tabs */}
            <div className="flex flex-wrap bg-app-panel border border-app-border rounded-lg p-1 shadow-sm w-fit">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => onTabChange(tab)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                                isActive
                                    ? 'bg-app-accent/10 text-app-accent shadow-sm'
                                    : 'text-slate-600 dark:text-app-muted hover:text-slate-900 dark:hover:text-white hover:bg-app-panel-hover'
                            }`}
                        >
                            {tab}
                        </button>
                    );
                })}
            </div>

            {/* Search and More Options */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-slate-500 dark:text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                    </div>
                    <input
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-app-border rounded-lg leading-5 bg-app-panel text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-app-muted focus:outline-none focus:ring-1 focus:ring-app-accent focus:border-app-accent sm:text-sm transition-all"
                        placeholder="Search license plate, driver, route..."
                        type="text"
                    />
                </div>
                
                <button 
                    onClick={onMoreFiltersClick}
                    className="w-9 h-9 rounded-lg bg-app-panel border border-app-border flex items-center justify-center text-slate-600 dark:text-app-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer hover:border-app-accent/40"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}