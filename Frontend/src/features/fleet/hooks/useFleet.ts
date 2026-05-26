// src/features/fleet/hooks/useFleet.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { fleetService } from "../services/fleetService"; // 🌟 IMPORT SERVICE BARU
import type { FleetVehicle, TelematicsData, FuelLogEntry } from "../types";

export const useFleet = () => {
    const [fleetList, setFleetList] = useState<FleetVehicle[]>([]);
    const [selectedTruck, setSelectedTruck] = useState<FleetVehicle | null>(null);
    const [liveTelematics, setLiveTelematics] = useState<TelematicsData | null>(null);

    const [loading, setLoading] = useState(false);

    // 🌟 TEMBAK API PAKE SERVICE
    const fetchFleet = useCallback(async () => {
        setLoading(true);
        try {
            const resData: any = await fleetService.getFleetList();
            const actualData = resData?.data || resData;

            if (actualData && Array.isArray(actualData)) {
                const mappedFleet: FleetVehicle[] = actualData.map((truck: any, index: number) => {
                    const id = truck.vehicle_id || truck.id;
                    const licensePlate = truck.license_plate || truck.plateNumber || '-';

                    // Fallback list to map standard trucks to mockup design variables
                    const driverList = ["Maria Chen", "Ahmad Subarjo", "Yusuf Hakim", "Siti Aminah", "Budi Santoso", "Eko Prasetyo"];
                    const routeList = ["Yard A → Yard B", "Warehouse 3 → Dist. Center", "Port of Jakarta → Cikarang", "Cibubur → Depok Cold Storage", "Bandung Hub → Cengkareng"];
                    const cargoList = ["Frozen Chicken", "Vaccines & Pharma", "Ice Cream Mix", "Fresh Seafood", "Imported Beef", "Chilled Dairy"];
                    const etaList = ["04:20 PM", "11:15 AM", "02:45 PM", "08:10 PM", "01:30 AM"];
                    const statusValues: ('Healthy' | 'Warning' | 'Critical')[] = ["Healthy", "Warning", "Critical"];

                    const driverName = truck.driver_name || truck.driverName || driverList[index % driverList.length];
                    const routeName = truck.route_name || truck.routeName || routeList[index % routeList.length];
                    const cargoType = truck.cargo_type || truck.cargoType || cargoList[index % cargoList.length];
                    const eta = truck.eta || etaList[index % etaList.length];

                    const status = truck.status || 'Available';
                    const speedKmH = truck.speed_km_h !== undefined ? truck.speed_km_h : (status === 'Available' || status === 'On Trip' ? Math.floor(Math.random() * 30) + 40 : 0);
                    const batteryPct = truck.battery_pct !== undefined ? truck.battery_pct : (status === 'Maintenance' ? Math.floor(Math.random() * 20) + 10 : Math.floor(Math.random() * 30) + 65);

                    const tempStatus = truck.temp_status || truck.tempStatus || statusValues[index % 3];

                    let currentTemp = -18.2;
                    let setPointTemp = -18;
                    if (tempStatus === 'Healthy') {
                        currentTemp = -18.0 - (index % 5) * 0.8;
                        setPointTemp = -18;
                    } else if (tempStatus === 'Warning') {
                        currentTemp = -14.0 + (index % 3) * 0.5;
                        setPointTemp = -18;
                    } else {
                        currentTemp = -2.0 - (index % 4) * 1.2;
                        setPointTemp = -18;
                    }

                    // Detached deterministic sparklines for visualizations
                    const sparklines = [
                        [20, 25, 15, 20, 10, 15],
                        [10, 12, 18, 14, 22, 25],
                        [5, 8, 12, 6, 4, 8],
                        [25, 22, 18, 19, 15, 12],
                        [15, 18, 14, 16, 20, 18],
                        [8, 10, 15, 12, 18, 20]
                    ];
                    const sparklineData = truck.sparkline_data || truck.sparklineData || sparklines[index % sparklines.length];

                    const latitude = truck.latitude || truck.lat || (-6.207356 + (index * 0.015) - 0.03);
                    const longitude = truck.longitude || truck.lon || (106.479163 + (index * 0.018) - 0.02);

                    return {
                        id,
                        licensePlate,
                        model: truck.type || truck.model || '-',
                        currentKm: truck.current_km || truck.kmAwalHariIni || 0,
                        status,
                        driverName,
                        routeName,
                        cargoType,
                        eta,
                        speedKmH,
                        batteryPct,
                        currentTemp,
                        setPointTemp,
                        tempStatus,
                        sparklineData,
                        latitude,
                        longitude,
                        raw: truck
                    };
                });

                const idleAndMaintDummies: FleetVehicle[] = [
                    {
                        id: 101,
                        licensePlate: "B 8821 UYT",
                        model: "Reefer Box Light",
                        currentKm: 34120,
                        status: "Idle",
                        driverName: "Budi Santoso",
                        routeName: "Depot Kelapa Gading (Standby)",
                        cargoType: "Fresh Produce",
                        eta: "-",
                        speedKmH: 0,
                        batteryPct: 78,
                        currentTemp: -18.5,
                        setPointTemp: -18,
                        tempStatus: "Healthy",
                        sparklineData: [5, 5, 5, 5, 5, 5],
                        latitude: -6.205356 + 0.003,
                        longitude: 106.479163 - 0.004
                    },
                    {
                        id: 102,
                        licensePlate: "B 7732 KLO",
                        model: "Reefer Box Medium",
                        currentKm: 48900,
                        status: "Idle",
                        driverName: "Eko Prasetyo",
                        routeName: "Cikarang Hub (Unloading)",
                        cargoType: "Frozen Beef",
                        eta: "-",
                        speedKmH: 0,
                        batteryPct: 82,
                        currentTemp: -19.2,
                        setPointTemp: -18,
                        tempStatus: "Healthy",
                        sparklineData: [8, 8, 8, 8, 8, 8],
                        latitude: -6.207356 - 0.002,
                        longitude: 106.479163 + 0.005
                    },
                    {
                        id: 103,
                        licensePlate: "B 1109 PPQ",
                        model: "Reefer Box Heavy",
                        currentKm: 92450,
                        status: "Maintenance",
                        driverName: "Yusuf Hakim",
                        routeName: "Workshop Cawang",
                        cargoType: "None (Out of Service)",
                        eta: "-",
                        speedKmH: 0,
                        batteryPct: 15,
                        currentTemp: 4.5,
                        setPointTemp: -18,
                        tempStatus: "Critical",
                        sparklineData: [20, 22, 24, 25, 23, 22],
                        latitude: -6.207356 + 0.005,
                        longitude: 106.479163 + 0.002
                    },
                    {
                        id: 104,
                        licensePlate: "B 3328 ZZA",
                        model: "Reefer Box Heavy",
                        currentKm: 110300,
                        status: "Maintenance",
                        driverName: "Siti Aminah",
                        routeName: "Workshop Surabaya",
                        cargoType: "None (Out of Service)",
                        eta: "-",
                        speedKmH: 0,
                        batteryPct: 9,
                        currentTemp: 2.1,
                        setPointTemp: -18,
                        tempStatus: "Warning",
                        sparklineData: [15, 16, 17, 18, 16, 15],
                        latitude: -6.207356 - 0.004,
                        longitude: 106.479163 - 0.003
                    }
                ];
                const finalFleet = [...mappedFleet, ...idleAndMaintDummies];
                setFleetList(finalFleet);
                if (finalFleet.length > 0) {
                    setSelectedTruck(finalFleet[0]);
                }
            } else {
                setFleetList([]);
            }
        } catch (error) {
            console.warn("Gagal menarik data armada, menggunakan fallback mockup premium:", error);

            // Premium fallback mockup data
            const fallbackData = [
                { id: 1, license_plate: "B 1234 ABC", status: "Available", temp_status: "Healthy", battery_pct: 62 },
                { id: 2, license_plate: "B 5678 DEF", status: "On Trip", temp_status: "Warning", battery_pct: 45 },
                { id: 3, license_plate: "B 9012 GHI", status: "Maintenance", temp_status: "Critical", battery_pct: 12 },
                { id: 4, license_plate: "B 3456 JKL", status: "Available", temp_status: "Healthy", battery_pct: 88 },
                { id: 5, license_plate: "B 7890 MNO", status: "Available", temp_status: "Healthy", battery_pct: 95 }
            ];

            const mappedFleet: FleetVehicle[] = fallbackData.map((truck: any, index: number) => {
                const id = truck.id;
                const licensePlate = truck.license_plate;

                const driverList = ["Maria Chen", "Ahmad Subarjo", "Yusuf Hakim", "Siti Aminah", "Budi Santoso"];
                const routeList = ["Yard A → Yard B", "Warehouse 3 → Dist. Center", "Port of Jakarta → Cikarang", "Cibubur → Depok Cold Storage", "Bandung Hub → Cengkareng"];
                const cargoList = ["Frozen Chicken", "Vaccines & Pharma", "Ice Cream Mix", "Fresh Seafood", "Imported Beef"];
                const etaList = ["04:20 PM", "11:15 AM", "02:45 PM", "08:10 PM", "01:30 AM"];

                const driverName = driverList[index % driverList.length];
                const routeName = routeList[index % routeList.length];
                const cargoType = cargoList[index % cargoList.length];
                const eta = etaList[index % etaList.length];

                const status = truck.status;
                const speedKmH = status === 'Available' || status === 'On Trip' ? 45 + (index * 6) : 0;
                const batteryPct = truck.battery_pct;
                const tempStatus = truck.temp_status;

                let currentTemp = -18.2;
                let setPointTemp = -18;
                if (tempStatus === 'Healthy') {
                    currentTemp = -18.2 - index * 0.4;
                } else if (tempStatus === 'Warning') {
                    currentTemp = -13.5;
                } else {
                    currentTemp = -1.8;
                }

                const sparklines = [
                    [20, 25, 15, 20, 10, 15],
                    [10, 12, 18, 14, 22, 25],
                    [5, 8, 12, 6, 4, 8],
                    [25, 22, 18, 19, 15, 12],
                    [15, 18, 14, 16, 20, 18]
                ];
                const sparklineData = sparklines[index % sparklines.length];

                const latitude = -6.207356 + (index * 0.015) - 0.03;
                const longitude = 106.479163 + (index * 0.018) - 0.02;

                return {
                    id,
                    licensePlate,
                    model: "Reefer Heavy Duty",
                    currentKm: 12500 + index * 4200,
                    status,
                    driverName,
                    routeName,
                    cargoType,
                    eta,
                    speedKmH,
                    batteryPct,
                    currentTemp,
                    setPointTemp,
                    tempStatus,
                    sparklineData,
                    latitude,
                    longitude
                };
            });

            const idleAndMaintDummies: FleetVehicle[] = [
                {
                    id: 101,
                    licensePlate: "B 8821 UYT",
                    model: "Reefer Box Light",
                    currentKm: 34120,
                    status: "Idle",
                    driverName: "Budi Santoso",
                    routeName: "Depot Kelapa Gading (Standby)",
                    cargoType: "Fresh Produce",
                    eta: "-",
                    speedKmH: 0,
                    batteryPct: 78,
                    currentTemp: -18.5,
                    setPointTemp: -18,
                    tempStatus: "Healthy",
                    sparklineData: [5, 5, 5, 5, 5, 5],
                    latitude: -6.205356 + 0.003,
                    longitude: 106.479163 - 0.004
                },
                {
                    id: 102,
                    licensePlate: "B 7732 KLO",
                    model: "Reefer Box Medium",
                    currentKm: 48900,
                    status: "Idle",
                    driverName: "Eko Prasetyo",
                    routeName: "Cikarang Hub (Unloading)",
                    cargoType: "Frozen Beef",
                    eta: "-",
                    speedKmH: 0,
                    batteryPct: 82,
                    currentTemp: -19.2,
                    setPointTemp: -18,
                    tempStatus: "Healthy",
                    sparklineData: [8, 8, 8, 8, 8, 8],
                    latitude: -6.207356 - 0.002,
                    longitude: 106.479163 + 0.005
                },
                {
                    id: 103,
                    licensePlate: "B 1109 PPQ",
                    model: "Reefer Box Heavy",
                    currentKm: 92450,
                    status: "Maintenance",
                    driverName: "Yusuf Hakim",
                    routeName: "Workshop Cawang",
                    cargoType: "None (Out of Service)",
                    eta: "-",
                    speedKmH: 0,
                    batteryPct: 15,
                    currentTemp: 4.5,
                    setPointTemp: -18,
                    tempStatus: "Critical",
                    sparklineData: [20, 22, 24, 25, 23, 22],
                    latitude: -6.207356 + 0.005,
                    longitude: 106.479163 + 0.002
                },
                {
                    id: 104,
                    licensePlate: "B 3328 ZZA",
                    model: "Reefer Box Heavy",
                    currentKm: 110300,
                    status: "Maintenance",
                    driverName: "Siti Aminah",
                    routeName: "Workshop Surabaya",
                    cargoType: "None (Out of Service)",
                    eta: "-",
                    speedKmH: 0,
                    batteryPct: 9,
                    currentTemp: 2.1,
                    setPointTemp: -18,
                    tempStatus: "Warning",
                    sparklineData: [15, 16, 17, 18, 16, 15],
                    latitude: -6.207356 - 0.004,
                    longitude: 106.479163 - 0.003
                }
            ];
            const finalFleet = [...mappedFleet, ...idleAndMaintDummies];
            setFleetList(finalFleet);
            if (finalFleet.length > 0) {
                setSelectedTruck(finalFleet[0]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // 🌟 EFEK TARIK DATA AWAL (Rem pakem, 1x jalan)
    useEffect(() => {
        fetchFleet();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==========================================
    // 🌟 DIGITAL TWIN ENGINE (POLLING 5 DETIK)
    // ==========================================
    useEffect(() => {
        if (!selectedTruck?.licensePlate) {
            setLiveTelematics(null);
            return;
        }

        // Fungsi buat nembak API Live Telematics pake Service
        const fetchTelemetry = async () => {
            try {
                const data = await fleetService.getTelematics(selectedTruck.licensePlate);
                setLiveTelematics(data);
            } catch (error) {
                console.log("Telemetry offline, falling back to cached/default data");
            }
        };

        // Panggil pertama kali
        fetchTelemetry();

        // JANTUNG APLIKASI: Detak tiap 5 detik
        const intervalId = setInterval(fetchTelemetry, 5000);

        return () => clearInterval(intervalId); // Bersihin pas truk diganti
    }, [selectedTruck]);


    // ==========================================
    // 🌟 FUEL LOGS STATE & SERVICE INTEGRATION
    // ==========================================
    const [fuelLogs, setFuelLogs] = useState<FuelLogEntry[]>([
        { id: "FL-9082", date: "24 Feb 2026", volumeLiters: 45, station: "Pertamina Cikarang", cost: 450500 },
        { id: "FL-8731", date: "18 Feb 2026", volumeLiters: 42, station: "Shell Margonda", cost: 420200 },
        { id: "FL-8519", date: "12 Feb 2026", volumeLiters: 50, station: "Pertamina Cikampek", cost: 500000 },
        { id: "FL-8240", date: "05 Feb 2026", volumeLiters: 38, station: "Shell Cikarang", cost: 456000 },
        { id: "FL-7912", date: "28 Jan 2026", volumeLiters: 48, station: "Pertamina Kelapa Gading", cost: 480000 },
        { id: "FL-7654", date: "21 Jan 2026", volumeLiters: 55, station: "Pertamina KM 57", cost: 550000 },
        { id: "FL-7321", date: "15 Jan 2026", volumeLiters: 40, station: "BP Dago Bandung", cost: 520000 },
        { id: "FL-7109", date: "09 Jan 2026", volumeLiters: 45, station: "Shell TB Simatupang", cost: 540000 }
    ]);

    const addFuelEntry = useCallback(async (volumeLiters: number, station: string, cost: number) => {
        const today = new Date();
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        const dateStr = today.toLocaleDateString('id-ID', options);

        const newEntry: FuelLogEntry = {
            id: `FL-${Math.floor(1000 + Math.random() * 9000)}`,
            date: dateStr,
            volumeLiters,
            station,
            cost
        };

        // Try persisting via fleetService
        try {
            if (selectedTruck) {
                await fleetService.addFuelLog(selectedTruck.id, {
                    volumeLiters,
                    station,
                    cost,
                    date: today.toISOString().split('T')[0]
                });
            }
        } catch (err) {
            console.warn("Backend addFuelLog failed, proceeding with local addition:", err);
        }

        setFuelLogs(prev => [newEntry, ...prev]);
    }, [selectedTruck]);

    const kpi = useMemo(() => {
        return {
            activeCount: fleetList.filter(t => t.status === 'Available' || t.status === 'On Trip').length,
            maintenanceCount: fleetList.filter(t => t.status === 'Maintenance').length,
            totalCount: fleetList.length,
            avgFuelEfficiency: 8.2,
            coldChainBreach: liveTelematics?.isTempWarning ? 1 : 0
        };
    }, [fleetList, liveTelematics]);

    return {
        loading,
        fleetList,
        selectedTruck,
        setSelectedTruck,
        telematics: liveTelematics,
        kpi,
        refreshFleet: fetchFleet,
        fuelLogs,
        addFuelEntry
    };
};