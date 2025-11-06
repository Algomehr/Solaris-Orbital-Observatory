import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { AiAdvisor } from './AiAdvisor';
import type { ProcessState, SimulatedData, KpIndexData, SolarWindData } from '../types';

const ChartContainer: React.FC<React.PropsWithChildren<{ title: string; className?: string }>> = ({ title, className, children }) => (
  <div className={`p-4 bg-black/30 rounded-lg border border-cyan-800/60 flex flex-col ${className}`}>
    <h4 className="font-orbitron text-sm text-cyan-300 mb-2">{title}</h4>
    <div className="flex-grow text-xs">
      {children}
    </div>
  </div>
);

const GoesChart: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#083344" />
      <XAxis dataKey="time" stroke="#0e7490" tick={{ fill: '#a5f3fc' }} />
      <YAxis 
        scale="log" 
        domain={['auto', 'auto']} 
        stroke="#0e7490" 
        tick={{ fill: '#a5f3fc' }} 
        tickFormatter={(tick) => tick.toExponential(0)} 
      />
      <Tooltip
        contentStyle={{
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          borderColor: '#0891b2',
          color: '#e0f2fe'
        }}
        formatter={(value: number) => [value.toExponential(2), "Flux (W/m²)"]}
      />
      <Line type="monotone" dataKey="flux" stroke="#22d3ee" strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

const HmiChart: React.FC<{ data: any[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#083344" />
            <XAxis dataKey="region" stroke="#0e7490" tick={{ fill: '#a5f3fc' }} />
            <YAxis stroke="#0e7490" tick={{ fill: '#a5f3fc' }} />
            <Tooltip
                contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.8)',
                    borderColor: '#0891b2',
                    color: '#e0f2fe'
                }}
                labelStyle={{ color: '#67e8f9' }}
            />
            <Bar dataKey="spots" fill="#22d3ee" />
        </BarChart>
    </ResponsiveContainer>
);

const ProtonFluxChart: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#083344" />
      <XAxis dataKey="time" stroke="#0e7490" tick={{ fill: '#a5f3fc' }} />
      <YAxis
        scale="log"
        domain={['auto', 'auto']}
        stroke="#0e7490"
        tick={{ fill: '#a5f3fc' }}
        tickFormatter={(tick) => tick.toExponential(0)}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          borderColor: '#f472b6',
          color: '#e0f2fe'
        }}
        formatter={(value: number) => [value.toExponential(2), "Flux (pfu)"]}
      />
      <Line type="monotone" dataKey="flux" stroke="#f472b6" strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

const KpIndexIndicator: React.FC<{ data: KpIndexData }> = ({ data }) => {
    const levels = [
        { level: 0, color: 'bg-green-600' }, { level: 1, color: 'bg-green-500' }, { level: 2, color: 'bg-green-400' },
        { level: 3, color: 'bg-yellow-500' }, { level: 4, color: 'bg-yellow-400' }, { level: 5, color: 'bg-orange-500' },
        { level: 6, color: 'bg-red-500' }, { level: 7, color: 'bg-red-600' }, { level: 8, color: 'bg-red-700' },
    ];
    const activeColor = levels.find(l => l.level === data.value)?.color.replace('bg-', 'text-') || 'text-gray-400';

    return (
        <div className="text-center h-full flex flex-col justify-around">
            <div>
              <p className={`font-orbitron text-3xl ${activeColor}`}>{data.value}</p>
              <p className="text-xs uppercase tracking-wider text-cyan-400/80">{data.level}</p>
            </div>
            <div className="flex justify-center items-end gap-1 h-8 w-full">
                {levels.map(({ level, color }) => (
                    <div 
                        key={level} 
                        className={`w-full rounded-sm transition-all duration-300 ${level <= data.value ? color : 'bg-gray-700'}`}
                        style={{ height: `${25 + level * 7.5}%`}}
                    ></div>
                ))}
            </div>
        </div>
    );
};

const SolarWindDisplay: React.FC<{ data: SolarWindData }> = ({ data }) => (
    <div className="flex justify-around items-center text-center h-full">
        <div>
            <p className="font-orbitron text-3xl text-cyan-200">{data.speed.toFixed(0)}</p>
            <p className="text-xs uppercase tracking-wider text-cyan-400/80">Wind Speed (km/s)</p>
        </div>
         <div className="border-l-2 border-cyan-700/50 h-12"></div>
        <div>
            <p className="font-orbitron text-3xl text-cyan-200">{data.density.toFixed(1)}</p>
            <p className="text-xs uppercase tracking-wider text-cyan-400/80">Density (p/cm³)</p>
        </div>
    </div>
);


export const DataDashboard: React.FC<{ processState: ProcessState; data: SimulatedData | null }> = ({ processState, data }) => {
  const renderContent = () => {
    switch (processState) {
      case 'idle':
        return <div className="text-center text-gray-500">Awaiting data processing...</div>;
      case 'processing':
        return <div className="text-center text-cyan-400 animate-pulse">Analyzing data stream...</div>;
      case 'complete':
        if (!data) return <div className="text-center text-red-500">Data processing failed.</div>;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ChartContainer title="Solar Wind" className="h-36">
                  {data.solarWindData && <SolarWindDisplay data={data.solarWindData} />}
              </ChartContainer>
              <ChartContainer title="Geomagnetic Activity (Kp)" className="h-36">
                  {data.kpIndexData && <KpIndexIndicator data={data.kpIndexData} />}
              </ChartContainer>
            </div>

            {data.protonFluxData && (
              <ChartContainer title="Proton Flux (>10 MeV)" className="h-64">
                <ProtonFluxChart data={data.protonFluxData} />
              </ChartContainer>
            )}

            {data.selections.GOES && data.goesData && (
              <ChartContainer title="GOES X-Ray Flux (24h)" className="h-64">
                <GoesChart data={data.goesData} />
              </ChartContainer>
            )}
            {data.selections.HMI && data.hmiData && (
              <ChartContainer title="HMI Active Sunspot Regions" className="h-64">
                <HmiChart data={data.hmiData} />
              </ChartContainer>
            )}
            <AiAdvisor dataSummary={data.summary} />
          </div>
        );
    }
  };

  return (
    <div className="p-4 bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg h-full shadow-lg shadow-cyan-500/10 flex flex-col">
      <h2 className="font-orbitron text-lg text-center mb-4 text-cyan-200 tracking-widest flex-shrink-0">DATA ANALYSIS</h2>
      <div className="flex-grow overflow-y-auto pr-2">
        {renderContent()}
      </div>
    </div>
  );
};