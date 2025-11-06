import type { AiaWavelength } from './types';

export const AIA_WAVELENGTHS: AiaWavelength[] = [
  { name: '94', temp: '6,300,000 K', color: 'teal', imageUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0094.jpg', videoUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_1024_0094.mp4', sourceId: 8 },
  { name: '131', temp: '10,000,000 K', color: 'green', imageUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0131.jpg', videoUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_1024_0131.mp4', sourceId: 9 },
  { name: '171', temp: '630,000 K', color: 'gold', imageUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0171.jpg', videoUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_1024_0171.mp4', sourceId: 10 },
  { name: '193', temp: '1,250,000 K', color: 'bronze', imageUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg', videoUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_1024_0193.mp4', sourceId: 11 },
  { name: '211', temp: '2,000,000 K', color: 'purple', imageUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0211.jpg', videoUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_1024_0211.mp4', sourceId: 12 },
  { name: '304', temp: '50,000 K', color: 'red', imageUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0304.jpg', videoUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_1024_0304.mp4', sourceId: 13 },
  { name: '335', temp: '2,500,000 K', color: 'blue', imageUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0335.jpg', videoUrl: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_1024_0335.mp4', sourceId: 14 },
];

export const HMI_IMAGE_URL = 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_hmimag.jpg';

export const INSTRUMENTS = [
  { id: 'AIA', name: 'AIA', description: 'Atmospheric Imaging Assembly' },
  { id: 'HMI', name: 'HMI', description: 'Helioseismic and Magnetic Imager' },
  { id: 'GOES', name: 'GOES', description: 'Geostationary Operational Environmental Satellite' },
] as const;