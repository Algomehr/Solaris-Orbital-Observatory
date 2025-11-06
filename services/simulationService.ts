import type { InstrumentSelection, AiaWavelength, GoesDataPoint, HmiDataPoint, SolarWindData, ProtonFluxDataPoint, KpIndexData } from '../types';

const GOES_DATA_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json';

/**
 * Fetches and processes near-real-time GOES X-ray flux data from NOAA.
 * @returns {Promise<GoesDataPoint[]>} A promise that resolves to an array of data points for the chart.
 */
export const fetchGoesData = async (): Promise<GoesDataPoint[]> => {
  const response = await fetch(GOES_DATA_URL);
  if (!response.ok) {
    throw new Error(`NOAA API request failed with status ${response.status}`);
  }
  const rawData: { time_tag: string; flux: number }[] = await response.json();
  
  // Data is per-minute for 24h, which is ~1440 points. This is too much for the chart to render smoothly.
  // We'll sample the data, taking every 15th point to get about 96 points.
  const sampledData = rawData.filter((_, index) => index % 15 === 0);

  return sampledData.map(d => ({
      time: d.time_tag.substring(11, 16), // Format to "HH:MM"
      flux: d.flux,
  }));
};

/**
 * Generates plausible but random HMI sunspot data.
 * NOTE: This part remains a simulation as a consistent, real-time public API for 
 * detailed sunspot counts per active region is not readily available for this dashboard.
 * @returns {HmiDataPoint[]} An array of simulated sunspot data points.
 */
export const generateHmiData = (): HmiDataPoint[] => {
  const data: HmiDataPoint[] = [];
  const activeRegions = Math.floor(Math.random() * 5) + 2;
  for (let i = 0; i < activeRegions; i++) {
    const regionId = 3700 + Math.floor(Math.random() * 50);
    data.push({
      region: `AR${regionId}`,
      spots: Math.floor(Math.random() * 30) + 1,
    });
  }
  return data;
};

/**
 * Generates simulated solar wind data.
 * @returns {SolarWindData} Simulated solar wind speed and density.
 */
export const generateSolarWindData = (): SolarWindData => {
  const speed = 300 + Math.random() * 500; // 300-800 km/s
  const density = 1 + Math.random() * 9;   // 1-10 protons/cm^3
  return { speed, density };
};

/**
 * Generates simulated proton flux data for the last 24 hours.
 * @returns {ProtonFluxDataPoint[]} An array of simulated proton flux data points.
 */
export const generateProtonFluxData = (): ProtonFluxDataPoint[] => {
  const data: ProtonFluxDataPoint[] = [];
  const now = new Date();
  for (let i = 0; i < 96; i++) { // 96 points for 24h (every 15 mins)
    const time = new Date(now.getTime() - (96 - i) * 15 * 60 * 1000);
    const baseFlux = 1e-1;
    const spike = Math.random() > 0.95 ? Math.random() * 100 : 1;
    data.push({
      time: time.toISOString().substring(11, 16),
      flux: baseFlux * (1 + Math.random() * 0.5) * spike,
    });
  }
  return data;
};

/**
 * Generates a simulated planetary K-index value.
 * @returns {KpIndexData} The simulated Kp-index value and corresponding activity level.
 */
export const generateKpIndexData = (): KpIndexData => {
  const value = Math.floor(Math.random() * 10); // 0-9
  let level: KpIndexData['level'];
  if (value <= 2) level = 'Quiet';
  else if (value <= 3) level = 'Unsettled';
  else if (value <= 4) level = 'Active';
  else if (value === 5) level = 'Minor Storm';
  else if (value === 6) level = 'Moderate Storm';
  else if (value === 7) level = 'Strong Storm';
  else if (value === 8) level = 'Severe Storm';
  else level = 'Extreme Storm';
  return { value, level };
};


/**
 * Generates a summary string based on the collected data.
 * @returns {string} A composite summary string for the AI advisor.
 */
export const generateSummary = (
    selections: InstrumentSelection, 
    aiaWavelength: AiaWavelength, 
    hmiData?: HmiDataPoint[], 
    goesData?: GoesDataPoint[],
    solarWindData?: SolarWindData,
    protonFluxData?: ProtonFluxDataPoint[],
    kpIndexData?: KpIndexData
): string => {
    let summaryParts: string[] = [];
    
    if(selections.AIA) {
        summaryParts.push(`AIA imaging at ${aiaWavelength.name}Å indicates standard coronal activity for a temperature of ~${aiaWavelength.temp}.`);
    }
    if(selections.HMI && hmiData) {
        const totalSpots = hmiData.reduce((acc, curr) => acc + curr.spots, 0);
        summaryParts.push(`HMI magnetogram shows ${hmiData.length} active regions with a total of ${totalSpots} sunspots (simulated).`);
    }
    if(selections.GOES && goesData) {
        if (goesData.length > 0) {
            const maxFlux = Math.max(...goesData.map(d => d.flux));
            let flareClass = 'A';
            if (maxFlux >= 1e-4) flareClass = 'X';
            else if (maxFlux >= 1e-5) flareClass = 'M';
            else if (maxFlux >= 1e-6) flareClass = 'C';
            else if (maxFlux >= 1e-7) flareClass = 'B';
            summaryParts.push(`Live GOES satellite data reports a peak 24-hour X-ray flux of ${maxFlux.toExponential(2)}, corresponding to a ${flareClass}-class solar flare event.`);
        } else {
             summaryParts.push(`Live GOES satellite data is currently unavailable or shows no significant events.`);
        }
    }

    if(solarWindData) {
        summaryParts.push(`Solar wind measured at ${solarWindData.speed.toFixed(0)} km/s with a density of ${solarWindData.density.toFixed(1)} p/cm³.`);
    }
    if(kpIndexData) {
        summaryParts.push(`Current planetary K-index is ${kpIndexData.value}, indicating ${kpIndexData.level} geomagnetic activity.`);
    }
    if(protonFluxData) {
        const maxFlux = Math.max(...protonFluxData.map(d => d.flux));
        if (maxFlux > 10) {
             summaryParts.push(`Elevated proton flux detected, peaking at ${maxFlux.toExponential(1)} pfu, indicating a potential Solar Radiation Storm.`);
        }
    }


    if (summaryParts.length === 0) {
        return "No data selected for analysis.";
    }

    return summaryParts.join(' ');
}