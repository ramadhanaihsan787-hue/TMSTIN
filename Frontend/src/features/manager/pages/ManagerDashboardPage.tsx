import { useLocation } from "react-router-dom";
import { useDateRange } from "../../../context/DateRangeContext";

import OverviewDashboard from "../components/OverviewDashboard";
import ReturnDashboard from "../components/ReturnDashboard";
import EfficiencyDashboard from "../components/EfficiencyDashboard";

const ManagerLogistik = () => {
    const location = useLocation();
    const activeTab = location.pathname.split('/').pop() || 'overview';
    const { endDate } = useDateRange(); // Kalau nanti butuh dilempar ke komponen

    return (
        <div className="p-8 pt-0 max-w-[1600px] mx-auto min-h-screen">

            {/* Tab Content */}
            <div className="space-y-8 pb-10 transition-all duration-500">
                {/* 🌟 PANGGIL COMPONENT API-NYA DI SINI! (BUKAN DUMMY LAGI) */}
                {activeTab === "overview" && <OverviewDashboard />}
                {activeTab === "return" && <ReturnDashboard />}
                {activeTab === "efficiency" && <EfficiencyDashboard />}
            </div>
            
        </div>
    );
};

export default ManagerLogistik;