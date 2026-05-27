// src/features/settings/types.ts

export type SettingsTabId = 'vrp' | 'cost' | 'telematics' | 'alerts' | 'team';

export interface SettingsFormData {
    vrp_start_time: string;
    vrp_end_time: string;
    vrp_base_drop_time_mins: number;
    vrp_var_drop_time_mins: number;
    vrp_capacity_buffer_percent: number;
    
    cost_fuel_per_liter: number;
    cost_avg_km_per_liter: number;
    cost_driver_salary: number;
    cost_overtime_rate: number;
    depo_lat: number;
    depo_lon: number;
    
    api_tomtom_key: string;
    api_gps_webhook: string;
    api_temp_sensor: string;
    sync_interval_sec: number;
    
    alert_max_temp_celsius: number;
    alert_delay_mins: number;
    // Geofence POD (ePOD radius check per toko)
    geofence_radius_meters:    number;
    dwell_time_mins:           number;
    // Geofence jembatan timbang (auto-lock jam pulang driver)
    jembatan_timbang_lat:      number | null;
    jembatan_timbang_lon:      number | null;
    jembatan_timbang_radius_m: number;
}