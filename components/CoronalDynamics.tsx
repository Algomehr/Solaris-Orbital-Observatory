import React, { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import type { ProcessState, SimulatedData, CoronalHoleData, FilamentData, ImfBzDataPoint, RadioBurstData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const Panel: React.FC<React.PropsWithChildren<{ title: string; icon: React.ReactNode, className?: string }>> = ({ title, icon, className, children }) => (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 shadow-lg shadow-cyan-500/10 flex flex-col ${className}`}>
        <h3 className="font-orbitron text-cyan-300 border-b-2 border-cyan-500/30 pb-1 mb-3 text-sm tracking-wider uppercase flex items-center flex-shrink-0">
            {icon}
            <span className="ml-2 rtl:mr-2 rtl:ml-0">{title}</span>
        </h3>
        <div className="flex-grow overflow-hidden">
            {children}
        </div>
    </div>
);

const CoronalStructureView: React.FC<{ holes: CoronalHoleData[], filaments: FilamentData[] }> = ({ holes, filaments }) => {
    const { t } = useLanguage();
    const [selectedFeature, setSelectedFeature] = useState<any>(null);

    return (
        <div className="w-full h-full relative flex items-center justify-center">
             <img src="https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg" alt="AIA 193 Angstrom" className="rounded-full opacity-80" />
             <svg viewBox="0 0 512 512" className="absolute w-full h-full">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                 {holes.map(hole => (
                    <path 
                        key={hole.id} 
                        d={hole.path} 
                        fill="rgba(0,0,0,0.6)" 
                        stroke="#8b5cf6" 
                        strokeWidth="2"
                        className="cursor-pointer transition-all duration-200 hover:fill-purple-500/50"
                        onClick={() => setSelectedFeature({ type: t('coronalDynamics_hole'), data: hole })}
                    />
                 ))}
                 {filaments.map(filament => (
                     <path 
                        key={filament.id}
                        d={filament.path}
                        fill="none"
                        stroke={filament.stability === 'Unstable' ? '#f97316' : '#f59e0b'}
                        strokeWidth="3"
                        className="cursor-pointer transition-all duration-200 hover:stroke-white"
                        style={{ filter: 'url(#glow)' }}
                        onClick={() => setSelectedFeature({ type: t('coronalDynamics_filament'), data: filament })}
                    />
                 ))}
             </svg>
             {selectedFeature && (
                <div className="absolute bottom-2 left-2 rtl:left-auto rtl:right-2 bg-black/80 p-2 rounded-md text-xs font-mono border border-cyan-700/50 animate-fadeIn">
                    <p className="font-bold text-cyan-200">{selectedFeature.type}: {selectedFeature.data.id}</p>
                    {selectedFeature.data.maxWindSpeed && <p>{t('coronalDynamics_windSpeed')}: {selectedFeature.data.maxWindSpeed} km/s</p>}
                    {selectedFeature.data.stability && <p>{t('coronalDynamics_stability')}: <span className={selectedFeature.data.stability === 'Unstable' ? 'text-orange-400' : 'text-yellow-400'}>{selectedFeature.data.stability}</span></p>}
                </div>
             )}
        </div>
    );
};

const RadioSpectrogramChart: React.FC<{ data: RadioBurstData[] }> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { t } = useLanguage();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;
        
        // Draw background noise
        const imageData = ctx.createImageData(width, height);
        const buffer = new Uint32Array(imageData.data.buffer);
        for (let i = 0; i < buffer.length; i++) {
            const noise = Math.random() * 50;
            buffer[i] = (255 << 24) | (noise * 1.5 << 16) | (noise * 2 << 8) | (10 + noise * 3); // Blueish noise
        }
        ctx.putImageData(imageData, 0, 0);

        // Draw bursts
        data.forEach(burst => {
            const x = (burst.time / 1440) * width; // 1440 minutes in a day
            const y = height - (burst.frequency / 500) * height; // Max frequency 500 MHz
            const intensity = burst.intensity / 10000; // Normalize intensity
            
            const color = burst.type === 'II' ? `rgba(255, 120, 0, ${intensity * 0.8})` : `rgba(255, 200, 0, ${intensity * 0.6})`;
            
            ctx.beginPath();
            ctx.arc(x, y, intensity * 2 + 1, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        });

    }, [data]);
    
    return (
        <div className="w-full h-full relative">
            <canvas ref={canvasRef} className="w-full h-full rounded-md" width="500" height="300"></canvas>
            <p className="absolute top-1 left-2 rtl:right-2 rtl:left-auto text-xs text-cyan-400/70">{t('coronalDynamics_frequency')}</p>
        </div>
    );
};

const ImfChart: React.FC<{ data: ImfBzDataPoint[] }> = ({ data }) => {
    const { t } = useLanguage();
    const gradientOffset = () => {
        const dataMax = Math.max(...data.map((i) => i.bz));
        const dataMin = Math.min(...data.map((i) => i.bz));
      
        if (dataMax <= 0) return 0;
        if (dataMin >= 0) return 1;
        return dataMax / (dataMax - dataMin);
    };
    const off = gradientOffset();

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#083344" />
                <XAxis dataKey="time" stroke="#0e7490" tick={{ fill: '#a5f3fc' }} />
                <YAxis stroke="#0e7490" tick={{ fill: '#a5f3fc' }} unit=" nT" />
                <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', borderColor: '#0891b2' }}
                    labelStyle={{ color: '#67e8f9' }}
                />
                <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="2 2" />
                <defs>
                    <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset={off} stopColor="#22c55e" stopOpacity={1} />
                        <stop offset={off} stopColor="#ef4444" stopOpacity={1} />
                    </linearGradient>
                </defs>
                <Line type="monotone" dataKey="bz" stroke="url(#splitColor)" strokeWidth={2} dot={false} />
                 <text x="15%" y="98%" textAnchor="middle" fill="#22c55e" fontSize="10">{t('coronalDynamics_imfNorth')}</text>
                 <text x="85%" y="98%" textAnchor="middle" fill="#ef4444" fontSize="10">{t('coronalDynamics_imfSouth')}</text>
            </LineChart>
        </ResponsiveContainer>
    );
};

export const CoronalDynamics: React.FC<{ processState: ProcessState, data: SimulatedData | null }> = ({ processState, data }) => {
    const { t } = useLanguage();
    if (processState !== 'complete' || !data) {
        return (
             <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 gap-6 animate-fadeIn">
                 <p className="font-orbitron text-lg text-cyan-400">{t('coronalDynamics_engagePrompt')}</p>
                 <p className="text-gray-500">{t('coronalDynamics_awaitingStream')}</p>
             </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col p-4 gap-6 animate-fadeIn">
            <header className="text-center">
                <h2 className="font-orbitron text-2xl text-cyan-200 tracking-widest">{t('coronalDynamics_title')}</h2>
                <p className="text-cyan-400/80">{t('coronalDynamics_subtitle')}</p>
            </header>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <Panel 
                    title={t('coronalDynamics_structuresTitle')} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.022 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" /></svg>}
                >
                    <CoronalStructureView holes={data.coronalHoleData || []} filaments={data.filamentData || []} />
                </Panel>

                <div className="flex flex-col gap-6">
                    <Panel
                        title={t('coronalDynamics_radioTitle')}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                        className="flex-1"
                    >
                         <RadioSpectrogramChart data={data.radioBurstData || []} />
                    </Panel>
                    <Panel
                        title={t('coronalDynamics_imfTitle')}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                        className="flex-1"
                    >
                        <ImfChart data={data.imfBzData || []} />
                    </Panel>
                </div>
            </div>
        </div>
    );
};
