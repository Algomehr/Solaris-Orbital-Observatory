
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

export interface SimulatedData {
  selections: InstrumentSelection;
  wavelength: AiaWavelength;
  goesData?: GoesDataPoint[];
  hmiData?: HmiDataPoint[];
  summary: string;
  solarWindData?: SolarWindData;
  protonFluxData?: ProtonFluxDataPoint[];
  kpIndexData?: KpIndexData;
}