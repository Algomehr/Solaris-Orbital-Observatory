export interface InstrumentSelection {
  AIA: boolean;
  HMI: boolean;
  GOES: boolean;
}

export interface AiaWavelength {
  name: string;
  temp: string;
  color: string;
  imageUrl: string;
  videoUrl: string;
  sourceId: number;
}

export type ProcessState = 'idle' | 'processing' | 'complete';

export interface GoesDataPoint {
  time: string;
  flux: number;
}

export interface HmiDataPoint {
  region: string;
  spots: number;
}

export interface SolarWindData {
  speed: number;
  density: number;
}

export interface ProtonFluxDataPoint {
  time: string;
  flux: number;
}

export interface KpIndexData {
  value: number;
  level: 'Quiet' | 'Unsettled' | 'Active' | 'Minor Storm' | 'Moderate Storm' | 'Strong Storm' | 'Severe Storm' | 'Extreme Storm';
}

// Types for Coronal Dynamics Tab
export interface CoronalHoleData {
    id: string;
    area: number; // in millionths of a solar hemisphere
    maxWindSpeed: number; // km/s
    path: string; // SVG path data for rendering
}

export interface FilamentData {
    id: string;
    length: number; // in arcseconds
    stability: 'Stable' | 'Unstable' | 'Eruptive';
    path: string; // SVG path data for rendering
}

export interface RadioBurstData {
    time: number; // Minutes into the past 24h
    frequency: number; // MHz
    intensity: number; // SFU (Solar Flux Units)
    type: 'II' | 'III';
}

export interface ImfBzDataPoint {
    time: string;
    bz: number; // in nT (nanoteslas)
}

export interface SimulatedData {
  selections: InstrumentSelection;
  wavelength: AiaWavelength;
  goesData?: GoesDataPoint[];
  hmiData?: HmiDataPoint[];
  summary: string;
  solarWindData?: SolarWindData;
  protonFluxData?: ProtonFluxDataPoint[];
  kpIndexData?: KpIndexData;
  // New data for Coronal Dynamics
  coronalHoleData?: CoronalHoleData[];
  filamentData?: FilamentData[];
  radioBurstData?: RadioBurstData[];
  imfBzData?: ImfBzDataPoint[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  audioData?: string; // Optional: store base64 audio data for model responses
}

// Types for SolarForecast component
export interface ThreatMatrixItem {
    region: string;
    magneticClass: string;
    flareProbability: {
        C: number;
        M: number;
        X: number;
    };
    cmeRisk: 'Low' | 'Moderate' | 'High' | 'Very High';
}

export interface NewsItem {
    title: string;
    uri: string;
    summary: string;
}

export interface SevenDayForecast {
    day: string;
    summary: string;
    auroraChance: string;
}

// Types for MissionControl visual dashboard
export interface DeltaV {
    insertion: number;
    stationKeeping: number;
    returnBurn: number;
}

export interface TelemetryData {
    altitude: number;
    velocity: number;
    signalStrength: number;
    temperature: number;
}

export interface MissionMetrics {
    deltaV: DeltaV;
    fuelConsumption: number;
    maxRadiationExposure: number;
    telemetry: TelemetryData;
}

export interface MissionData {
    log: string;
    metrics: MissionMetrics | null;
}

// Central cache for all AI-generated data
export interface AiDataCache {
  advisorChatHistory: ChatMessage[];
  missionData: MissionData | null;
  stormProbability: number | null;
  threatMatrix: ThreatMatrixItem[] | null;
  newsFeed: NewsItem[] | null;
  sevenDayForecast: string | null;
}