// Driver feature types
export interface DriverData {
  id: string;
  name: string;
  avatar?: string;
  status: string;
  score?: number;
  ontime?: number;
  doSuccess?: number;
  truck?: string;
  distanceToday?: number;
  doCompleted?: number;
  doTotal?: number;
  lastLocation?: string;
  lastUpdate?: string;
}