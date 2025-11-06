import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { OrbitalMap } from './OrbitalMap';
import type { MissionData, MissionMetrics, TelemetryData, AiDataCache } from '../types';
import { useLanguage } from '../contexts/LanguageContext';


const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });
const model = 'gemini-2.5-flash';

// A simple markdown renderer
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const { language } = useLanguage();
    const htmlContent = content
      .replace(/^### (.*$)/gim, '<h3 class="font-orbitron text-cyan-300 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="font-orbitron text-cyan-200 mt-6 mb-3 border-b border-cyan-500/30 pb-1">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="font-orbitron text-xl text-cyan-100 mt-8 mb-4">$1</h1>')
      .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800/50 text-amber-400 px-1 py-0.5 rounded-sm">$1</code>')
      .replace(/^- (.*$)/gim, `<li class="${language === 'fa' ? 'mr-4' : 'ml-4'} list-disc">$1</li>`)
      .replace(/\n/g, '<br />');
  
    return <div className="prose prose-invert text-cyan-400/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

const Panel: React.FC<React.PropsWithChildren<{ title: string, className?: string }>> = ({ title, className, children }) => (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 shadow-lg shadow-cyan-500/10 flex flex-col ${className}`}>
        <h3 className="font-orbitron text-cyan-300 border-b-2 border-cyan-500/30 pb-1 mb-2 text-xs tracking-wider uppercase flex-shrink-0">
            {title}
        </h3>
        <div className="flex-grow">
            {children}
        </div>
    </div>
);

const TelemetryDisplay: React.FC<{ telemetry: TelemetryData | null }> = ({ telemetry }) => {
    const { t } = useLanguage();
    const [currentTelemetry, setCurrentTelemetry] = useState(telemetry);

    useEffect(() => {
        setCurrentTelemetry(telemetry);
        if (!telemetry) return;

        const interval = setInterval(() => {
            setCurrentTelemetry(prev => {
                if (!prev) return null;
                return {
                    altitude: prev.altitude + (Math.random() - 0.5) * 5,
                    velocity: prev.velocity + (Math.random() - 0.5) * 10,
                    signalStrength: Math.max(-120, prev.signalStrength + (Math.random() - 0.5) * 2),
                    temperature: prev.temperature + (Math.random() - 0.5) * 0.5,
                };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [telemetry]);

    if (!currentTelemetry) {
        return <div className="text-gray-500 text-xs italic">Awaiting telemetry...</div>;
    }

    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <p>{t('missionControl_telemetryAlt')} <span className="font-bold text-cyan-200">{currentTelemetry.altitude.toFixed(0)} km</span></p>
            <p>{t('missionControl_telemetryVel')} <span className="font-bold text-cyan-200">{currentTelemetry.velocity.toFixed(2)} km/s</span></p>
            <p>{t('missionControl_telemetrySig')} <span className="font-bold text-cyan-200">{currentTelemetry.signalStrength.toFixed(1)} dBm</span></p>
            <p>{t('missionControl_telemetryTemp')} <span className="font-bold text-cyan-200">{currentTelemetry.temperature.toFixed(1)} °C</span></p>
        </div>
    );
};


const MissionDashboard: React.FC<{ data: MissionData | null; isLoading: boolean; error: string; trajectory: string; isManeuvering: boolean; }> = ({ data, isLoading, error, trajectory, isManeuvering }) => {
    const { t } = useLanguage();
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <svg className="w-16 h-16 text-cyan-400 animate-spin mx-auto" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3"/>
                        <path d="M50 5C25.1472 5 5 25.1472 5 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                    <p className="mt-4 font-orbitron text-lg tracking-widest text-cyan-300">{t('missionControl_calculatingTrajectory')}</p>
                </div>
            </div>
        );
    }

    if (error) return <p className="text-red-400 p-4">{error}</p>;
    if (!data || !data.metrics) return <p className="text-gray-500 italic p-4">{t('missionControl_awaitingParams')}</p>;
    
    const deltaVData = [
        { name: 'Insert', dv: data.metrics.deltaV.insertion },
        { name: 'Keep', dv: data.metrics.deltaV.stationKeeping },
        { name: 'Return', dv: data.metrics.deltaV.returnBurn },
    ];
    const fuelData = [
        { name: 'Used', value: data.metrics.fuelConsumption },
        { name: 'Remaining', value: 100 - data.metrics.fuelConsumption }
    ];
    const COLORS = ['#f97316', '#374151'];


    return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-4 font-mono">
            <div className="col-span-3 row-span-2 rounded-lg bg-black/30 border border-cyan-800/60 p-2 relative">
                 <OrbitalMap trajectoryType={trajectory} isManeuvering={isManeuvering} />
                 <p className="absolute top-2 left-3 rtl:left-auto rtl:right-3 font-orbitron text-sm text-cyan-300">{t('missionControl_mapTitle')}</p>
            </div>
            <div className="col-span-1 row-span-1 grid grid-cols-2 gap-4">
                 <Panel title={t('missionControl_fuel')}>
                    <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie data={fuelData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={20} outerRadius={30} paddingAngle={5}>
                                {fuelData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', borderColor: '#0891b2' }}/>
                        </PieChart>
                    </ResponsiveContainer>
                 </Panel>
                 <Panel title={t('missionControl_telemetry')}>
                    <TelemetryDisplay telemetry={data.metrics.telemetry} />
                 </Panel>
            </div>
             <Panel title={t('missionControl_deltaV')} className="col-span-2 row-span-1">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deltaVData} margin={{ top: 5, right: 10, left: -25, bottom: -5 }}>
                        <XAxis dataKey="name" stroke="#0e7490" tick={{ fill: '#a5f3fc', fontSize: 10 }} />
                        <YAxis stroke="#0e7490" tick={{ fill: '#a5f3fc', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', borderColor: '#0891b2' }}/>
                        <Bar dataKey="dv" fill="#22d3ee" />
                    </BarChart>
                </ResponsiveContainer>
             </Panel>
        </div>
    );
};

const MissionLog: React.FC<{ log: string }> = ({ log }) => {
    const { t } = useLanguage();
    return (
        <div className="p-4 bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg h-full shadow-lg shadow-cyan-500/10 flex flex-col">
            <h3 className="font-orbitron text-cyan-300 border-b-2 border-cyan-500/30 pb-1 mb-3 text-sm tracking-wider uppercase flex-shrink-0">
                {t('missionControl_logTitle')}
            </h3>
            <div className="flex-grow overflow-y-auto pr-2 rtl:pl-2 rtl:pr-0 font-mono">
                 {log ? <MarkdownRenderer content={log} /> : <p className="text-gray-500 italic">{t('missionControl_logAwaiting')}</p>}
            </div>
        </div>
    );
}


export const MissionControl: React.FC<{ 
  missionData: MissionData | null | undefined; 
  updateAiCache: (updates: Partial<AiDataCache>) => void; 
}> = ({ missionData, updateAiCache }) => {
    const { t } = useLanguage();
    const [missionName, setMissionName] = useState('Solar Flare Observation Alpha');
    const [missionType, setMissionType] = useState('Solar Flare Observation');
    const [duration, setDuration] = useState(12);
    const [trajectory, setTrajectory] = useState('Heliostationary');
    const [notes, setNotes] = useState('Prioritize observation of active region AR3745.');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isManeuvering, setIsManeuvering] = useState(false);
    
    useEffect(() => {
        // Trigger animation if data is loaded from cache
        if (missionData) {
            setIsManeuvering(true);
        }
    }, [missionData]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setIsManeuvering(false);
        // Clear previous mission data from cache while generating a new one
        updateAiCache({ missionData: null });

        const systemInstruction = `
            You are 'SOLARIS', an AI Mission Advisor. Your task is to generate a flight plan and key mission metrics for a solar observatory satellite.
            
            The response MUST be a single JSON object. This object should contain two top-level keys: "flightPlanLog" and "missionMetrics".
            
            1.  "flightPlanLog": A string containing a detailed, realistic flight plan in Markdown format. The plan should include these sections: ## Mission Overview, ## Flight Plan Details (with phases for burn, station keeping, etc.), and ## Risk Assessment.
            
            2.  "missionMetrics": A JSON object with the following structure:
                -   "deltaV": An object with "insertion", "stationKeeping", and "returnBurn" keys, each with a numerical value in m/s.
                -   "fuelConsumption": A number representing the total percentage of fuel used.
                -   "maxRadiationExposure": A number in mSv.
                -   "telemetry": An object with baseline "altitude" (km), "velocity" (km/s), "signalStrength" (dBm), and "temperature" (°C).
        `;

        const userPrompt = `
            Generate the mission data for the following parameters:
            - Mission Name: ${missionName}
            - Mission Type: ${missionType}
            - Duration: ${duration} hours
            - Orbital Trajectory: ${trajectory}
            - Mission Notes: ${notes}
        `;

        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: userPrompt,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: 'application/json',
                },
            });

            // Clean the response text before parsing
            const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(cleanedText);
            
            updateAiCache({
                missionData: {
                    log: parsedData.flightPlanLog,
                    metrics: parsedData.missionMetrics,
                }
            });
            // isManeuvering will be set by the useEffect watching missionData prop

        } catch (err) {
            console.error("Error generating flight plan:", err);
            setError("Failed to generate flight plan. The AI Advisor might be offline or returned an invalid format.");
        } finally {
            setIsLoading(false);
        }
    };
    

    return (
        <div className="w-full h-full flex flex-col p-4 gap-6 animate-fadeIn">
            <header className="text-center">
                <h2 className="font-orbitron text-2xl text-cyan-200 tracking-widest">
                    {t('missionControl_title')}
                </h2>
                <p className="text-cyan-400/80">
                    {t('missionControl_subtitle')}
                </p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                <aside className="lg:col-span-3 flex flex-col">
                     <form onSubmit={handleSubmit} className="p-4 bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg h-full shadow-lg shadow-cyan-500/10 flex flex-col">
                        <h3 className="font-orbitron text-cyan-300 border-b-2 border-cyan-500/30 pb-1 mb-4 text-sm tracking-wider uppercase flex-shrink-0">
                            {t('missionControl_paramsTitle')}
                        </h3>
                        <div className="flex-grow space-y-4 overflow-y-auto pr-2 rtl:pl-2 rtl:pr-0">
                            <div>
                                <label htmlFor="missionName" className="block text-xs font-bold text-cyan-300 mb-1">{t('missionControl_missionName')}</label>
                                <input type="text" id="missionName" value={missionName} onChange={(e) => setMissionName(e.target.value)} className="w-full bg-gray-900/70 border border-cyan-700/60 rounded-md px-2 py-1 text-sm text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                            </div>
                             <div>
                                <label htmlFor="missionType" className="block text-xs font-bold text-cyan-300 mb-1">{t('missionControl_missionType')}</label>
                                <select id="missionType" value={missionType} onChange={(e) => setMissionType(e.target.value)} className="w-full bg-gray-900/70 border border-cyan-700/60 rounded-md px-2 py-1 text-sm text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400">
                                    <option>Solar Flare Observation</option>
                                    <option>Coronal Loop Analysis</option>
                                    <option>Solar Wind Sampling</option>
                                    <option>Magnetic Field Mapping</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="duration" className="block text-xs font-bold text-cyan-300 mb-1">{t('missionControl_duration', { duration })}</label>
                                <input type="range" id="duration" min="1" max="24" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-cyan-300 mb-2">{t('missionControl_trajectory')}</label>
                                <div className="flex gap-4 text-sm">
                                    <label className="flex items-center"><input type="radio" name="trajectory" value="Heliostationary" checked={trajectory === 'Heliostationary'} onChange={(e) => setTrajectory(e.target.value)} className="ml-2 rtl:mr-2 rtl:ml-0" /> {t('missionControl_heliostationary')}</label>
                                    <label className="flex items-center"><input type="radio" name="trajectory" value="Polar Orbit" checked={trajectory === 'Polar Orbit'} onChange={(e) => setTrajectory(e.target.value)} className="ml-2 rtl:mr-2 rtl:ml-0" /> {t('missionControl_polarOrbit')}</label>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="notes" className="block text-xs font-bold text-cyan-300 mb-1">{t('missionControl_notes')}</label>
                                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-gray-900/70 border border-cyan-700/60 rounded-md px-2 py-1 text-sm text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"></textarea>
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full mt-6 py-3 font-orbitron text-lg rounded-md border-2 transition-all duration-300 bg-cyan-500/20 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900 hover:shadow-lg hover:shadow-cyan-400/50 active:scale-95 disabled:bg-gray-600/30 disabled:border-gray-500 disabled:text-gray-500">
                            {isLoading ? t('missionControl_calculating') : t('missionControl_calculate')}
                        </button>
                    </form>
                </aside>
                <main className="lg:col-span-9 flex flex-col min-h-0 gap-4">
                    <div className="flex-[2_2_0%] min-h-0">
                       <MissionDashboard data={missionData} isLoading={isLoading} error={error} trajectory={trajectory} isManeuvering={isManeuvering} />
                    </div>
                     <div className="flex-1 min-h-0">
                        <MissionLog log={missionData?.log ?? ''} />
                     </div>
                </main>
            </div>
        </div>
    );
};
