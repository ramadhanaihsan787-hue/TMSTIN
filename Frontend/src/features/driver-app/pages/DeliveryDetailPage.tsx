import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import Header from '../../../shared/components/Header';

const DriverDeliveryDetail: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

    const isLast = searchParams.get('isLast') === 'true';

    const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

    React.useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDark(document.documentElement.classList.contains('dark'));
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    // Destination: RS Mitra Keluarga Cikarang
    const destination = {
        longitude: 107.144415,
        latitude: -6.326354,
        name: "RS Mitra Keluarga Cikarang"
    };

    const [viewState, setViewState] = useState({
        longitude: destination.longitude,
        latitude: destination.latitude,
        zoom: 14
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#1a1c1e] font-sans transition-colors duration-300 text-slate-900 dark:text-white">
            <Header title="Stop Detail" />

            <main className="max-w-md mx-auto px-4 py-6 flex flex-col min-h-[calc(100vh-80px)]">
                <div className="bg-white dark:bg-[#2c2e33] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Customer Name</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{destination.name}</h3>
                    </div>

                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Address</p>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                            Jl. Raya Industri No. 100, <br />
                            Cikarang Selatan, Bekasi, <br />
                            Jawa Barat 17530
                        </p>
                    </div>

                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">PIC Name</p>
                        <p className="text-base font-bold text-slate-900 dark:text-white">Bapak Budi Santoso</p>
                    </div>

                    <button className="w-full h-12 bg-primary/20 text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/30 transition-all active:scale-[0.98]">
                        <span className="material-symbols-outlined text-lg">call</span>
                        Call PIC
                    </button>

                    <div className="aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner relative">
                        <Map
                            {...viewState}
                            onMove={evt => setViewState(evt.viewState)}
                            style={{ width: '100%', height: '100%' }}
                            mapStyle={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
                            mapboxAccessToken={mapboxToken}
                        >
                            <Marker longitude={destination.longitude} latitude={destination.latitude}>
                                <span className="material-symbols-outlined text-primary bg-white rounded-full p-1 text-sm shadow-md">location_on</span>
                            </Marker>
                        </Map>
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-black/50 px-2 py-1 rounded shadow-sm">Destinasi</span>
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-8 space-y-4 pb-8">
                    {isLast && (
                        <button
                            onClick={() => navigate('/driver/summary')}
                            className="w-full h-14 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-all active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-xl">replay</span>
                            KIRIM ULANG
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/driver/navigation')}
                        className="w-full h-14 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-xl">navigation</span>
                        MULAI NAVIGASI
                    </button>

                    <button
                        onClick={() => navigate('/driver/pod')}
                        className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-wide"
                    >
                        SAYA SUDAH TIBA
                    </button>
                </div>
            </main>
        </div>
    );
};

export default DriverDeliveryDetail;
