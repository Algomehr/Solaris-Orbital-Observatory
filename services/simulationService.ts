import type { InstrumentSelection, AiaWavelength, GoesDataPoint, HmiDataPoint, SolarWindData, ProtonFluxDataPoint, KpIndexData, CoronalHoleData, FilamentData, RadioBurstData, ImfBzDataPoint } from '../types';

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
 * Generates simulated coronal hole data with SVG paths.
 * @returns {CoronalHoleData[]} An array of simulated coronal hole data.
 */
export const generateCoronalHoleData = (): CoronalHoleData[] => {
    return [
        {
            id: 'CH101',
            area: 45000,
            maxWindSpeed: 750,
            path: "M 150 100 Q 180 80 220 110 T 250 150 Q 230 190 190 200 T 150 180 Q 130 160 140 130 T 150 100 Z"
        }
    ];
};

/**
 * Generates simulated solar filament data with SVG paths.
 * @returns {FilamentData[]} An array of simulated filament data.
 */
export const generateFilamentData = (): FilamentData[] => {
    return [
        {
            id: 'F203A',
            length: 250,
            stability: 'Unstable',
            path: "M 300 320 Q 350 300 400 330 T 480 350"
        },
        {
            id: 'F204B',
            length: 180,
            stability: 'Stable',
            path: "M 250 450 Q 280 480 340 470"
        }
    ];
};

/**
 * Generates simulated radio burst data, potentially correlated with GOES flares.
 * @param {GoesDataPoint[]} [goesData] - Optional GOES data to correlate events.
 * @returns {RadioBurstData[]} An array of simulated radio burst data points.
 */
export const generateRadioBurstData = (goesData?: GoesDataPoint[]): RadioBurstData[] => {
    const bursts: RadioBurstData[] = [];
    const maxFlux = goesData ? Math.max(...goesData.map(d => d.flux)) : 1e-7;
    
    // If a significant flare happened, generate a Type II and Type III burst
    if (maxFlux > 1e-5) { 
        const eventTime = 1440 * (Math.random() * 0.2 + 0.7); // Occurs in last 20% of the day
        // Type III (fast, wide frequency)
        for (let i = 0; i < 100; i++) {
            bursts.push({
                time: eventTime + i * 0.05,
                frequency: 500 - i * 4.8, // Drifts down in freq
                intensity: Math.random() * 8000 + 2000,
                type: 'III'
            });
        }
        // Type II (slower, narrower)
         for (let i = 0; i < 150; i++) {
            bursts.push({
                time: eventTime + 5 + i * 0.1, // Starts a bit later
                frequency: 100 - i * 0.4, // Drifts slower
                intensity: Math.random() * 5000 + 5000,
                type: 'II'
            });
        }
    }
    return bursts;
};

/**
 * Generates simulated Interplanetary Magnetic Field (IMF) Bz component data.
 * @returns {ImfBzDataPoint[]} An array of simulated IMF Bz data points.
 */
export const generateImfBzData = (): ImfBzDataPoint[] => {
    const data: ImfBzDataPoint[] = [];
    const now = new Date();
    let bz = (Math.random() - 0.5) * 10;
    for (let i = 0; i < 96; i++) { // 96 points for 24h (every 15 mins)
        const time = new Date(now.getTime() - (96 - i) * 15 * 60 * 1000);
        bz += (Math.random() - 0.5) * 4;
        // Introduce a chance for a strong southward event
        if (Math.random() > 0.95) {
             bz = -15 - Math.random() * 10;
        } else if (Math.random() < 0.05) {
            bz = 10 + Math.random() * 10;
        }
        if (Math.abs(bz) > 25) bz = Math.sign(bz) * 25;

        data.push({
            time: time.toISOString().substring(11, 16),
            bz: parseFloat(bz.toFixed(1)),
        });
    }
    return data;
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
    kpIndexData?: KpIndexData,
    coronalHoleData?: CoronalHoleData[],
    filamentData?: FilamentData[],
    imfBzData?: ImfBzDataPoint[]
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
     if(imfBzData && imfBzData.length > 0) {
        const lastBz = imfBzData[imfBzData.length - 1].bz;
        const direction = lastBz < 0 ? `southward at ${lastBz} nT` : `northward at ${lastBz} nT`;
        summaryParts.push(`The Interplanetary Magnetic Field (IMF) Bz component is currently oriented ${direction}.`);
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
    if(coronalHoleData && coronalHoleData.length > 0) {
        const hole = coronalHoleData[0];
        summaryParts.push(`A coronal hole (${hole.id}) is present, which is a source of a high-speed solar wind stream, estimated up to ${hole.maxWindSpeed} km/s.`);
    }
    if(filamentData && filamentData.length > 0) {
        const unstableFilaments = filamentData.filter(f => f.stability !== 'Stable');
        if (unstableFilaments.length > 0) {
            summaryParts.push(`${unstableFilaments.length} unstable or eruptive filaments detected, posing a risk for Coronal Mass Ejections.`);
        }
    }


    if (summaryParts.length === 0) {
        return "No data selected for analysis.";
    }

    return summaryParts.join(' ');
}