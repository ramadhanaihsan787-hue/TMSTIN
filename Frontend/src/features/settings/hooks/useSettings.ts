// src/features/settings/hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService';
import type { SettingsFormData, SettingsTabId } from '../types';

const defaultSettings: SettingsFormData = {
    vrp_start_time: "06:00",
    vrp_end_time: "20:00",
    vrp_base_drop_time_mins: 15,
    vrp_var_drop_time_mins: 1,
    vrp_capacity_buffer_percent: 90,
    cost_fuel_per_liter: 12500,
    cost_avg_km_per_liter: 5,
    cost_driver_salary: 4500000,
    cost_overtime_rate: 25000,
    depo_lat: -6.207356,
    depo_lon: 106.479163,
    api_tomtom_key: import.meta.env.VITE_TOMTOM_API_KEY || "",  // dari .env
    api_gps_webhook: "",
    api_temp_sensor: "",
    sync_interval_sec: 60,
    alert_max_temp_celsius: 4.0,
    alert_delay_mins: 30,
    // Jembatan timbang WH Cikupa (koordinat default)
    jembatan_timbang_lat:      -6.206353,
    jembatan_timbang_lon:      106.480681,
    jembatan_timbang_radius_m: 30,
};

export const useSettings = () => {
    const [activeTab, setActiveTab] = useState<SettingsTabId>('vrp');
    const [formData, setFormData] = useState<SettingsFormData>(defaultSettings);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

    // 🌟 NARIK DATA DARI DATABASE PAS HALAMAN DIBUKA
    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const resData = await settingsService.getSettings();
            // Jaga-jaga kalau format backend berubah
            const actualData = resData?.data?.data || resData?.data || resData; 
            
            if (actualData && typeof actualData === 'object') {
                setFormData(prev => ({ ...prev, ...actualData }));
            }
        } catch (err) {
            console.error("Gagal narik setting:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Obat anti kedap-kedip API
    useEffect(() => {
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 🌟 FUNGSI NANGKEP KETIKAN MANAJER
    const handleChange = (field: keyof SettingsFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // 🌟 FUNGSI SAVE KE DATABASE
    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus(null);
        try {
            const result = await settingsService.updateSettings(formData);
            
            if (result && (result.status === 'success' || result.data)) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus(null), 3000); // Ilangin notif sukses setelah 3 detik
            } else {
                setSaveStatus('error');
            }
        } catch (err) {
            console.error("Gagal save setting:", err);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return {
        activeTab,
        setActiveTab,
        formData,
        isLoading,
        isSaving,
        saveStatus,
        handleChange,
        handleSave,
        refreshData: fetchSettings
    };
};