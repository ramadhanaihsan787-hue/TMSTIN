// ===== INTERFACES =====
export interface CustomerDrop {
    name: string;
    lat: number;
    lon: number;
    weightKg: number;
    timeWindow: string;
    delivered: boolean;
}

export interface TruckTracking {
    id: string;
    driver: string;
    plate: string;
    zone: string;
    status: 'in-transit' | 'delayed' | 'idle';
    lat: number;
    lon: number;
    speed: number;
    heading: number;
    loadKg: number;
    capacityKg: number;
    eta: string;
    color: string;
    customers: CustomerDrop[];
}

export interface ZonePolygon {
    name: string;
    color: string;
    coordinates: [number, number][]; // [lon, lat] for Mapbox
}

// ===== CONSTANTS =====
export const DEPO_LON = 106.479163;
export const DEPO_LAT = -6.207356;

// ===== HELPER: Generate circle polygon coordinates =====
export const generateCircleCoords = (
    centerLon: number,
    centerLat: number,
    radiusKm: number,
    points: number = 64
): [number, number][] => {
    const coords: [number, number][] = [];
    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const dx = (radiusKm / (111.32 * Math.cos(centerLat * Math.PI / 180))) * Math.cos(angle);
        const dy = (radiusKm / 110.574) * Math.sin(angle);
        coords.push([centerLon + dx, centerLat + dy]);
    }
    return coords;
};

// ===== ZONE POLYGONS (Mapbox [lon, lat] format) =====
export const zonePolygons: ZonePolygon[] = [
    {
        name: 'Kelapa Gading',
        color: '#FF7A00',
        coordinates: [[106.89, -6.14], [106.92, -6.14], [106.92, -6.17], [106.89, -6.17], [106.89, -6.14]]
    },
    {
        name: 'Bekasi / Cikarang',
        color: '#3B82F6',
        coordinates: [[107.00, -6.23], [107.15, -6.23], [107.15, -6.35], [107.00, -6.35], [107.00, -6.23]]
    },
    {
        name: 'Serpong / Tangerang',
        color: '#64748B',
        coordinates: [[106.60, -6.20], [106.70, -6.20], [106.70, -6.30], [106.60, -6.30], [106.60, -6.20]]
    }
];

// ===== BUILD GEOJSON HELPERS =====
export const buildRoutesGeoJSON = (fleet: TruckTracking[], selectedTruckId: string | null) => ({
    type: 'FeatureCollection' as const,
    features: fleet.map(truck => ({
        type: 'Feature' as const,
        properties: {
            color: truck.color,
            opacity: selectedTruckId && selectedTruckId !== truck.id ? 0.1 : 0.85,
            width: selectedTruckId === truck.id ? 5 : 3
        },
        geometry: {
            type: 'LineString' as const,
            coordinates: [
                [DEPO_LON, DEPO_LAT],
                ...truck.customers.map(c => [c.lon, c.lat])
            ]
        }
    }))
});

export const buildGeofencesGeoJSON = (fleet: TruckTracking[], selectedTruckId: string | null) => ({
    type: 'FeatureCollection' as const,
    features: [
        {
            type: 'Feature' as const,
            properties: { color: '#e11d48', opacity: 0.06, strokeOpacity: 0.3 },
            geometry: {
                type: 'Polygon' as const,
                coordinates: [generateCircleCoords(DEPO_LON, DEPO_LAT, 5)]
            }
        },
        ...fleet.map(truck => ({
            type: 'Feature' as const,
            properties: {
                color: truck.color,
                opacity: selectedTruckId && selectedTruckId !== truck.id ? 0.01 : 0.08,
                strokeOpacity: selectedTruckId && selectedTruckId !== truck.id ? 0.05 : 0.4
            },
            geometry: {
                type: 'Polygon' as const,
                coordinates: [generateCircleCoords(truck.lon, truck.lat, 2)]
            }
        }))
    ]
});

export const buildZonesGeoJSON = () => ({
    type: 'FeatureCollection' as const,
    features: zonePolygons.map(zone => ({
        type: 'Feature' as const,
        properties: { color: zone.color, name: zone.name },
        geometry: {
            type: 'Polygon' as const,
            coordinates: [zone.coordinates]
        }
    }))
});