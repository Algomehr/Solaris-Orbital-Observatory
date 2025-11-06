
import React, { useState, useEffect } from 'react';

const StatusIndicator: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div className="flex items-center space-x-2">
    <div className={`w-2 h-2 rounded-full ${color} animate-pulse`}></div>
    <span className="text-xs uppercase tracking-widest">{label}</span>
  </div>
);

export const Header: React.FC = () => {
  const [utcTime, setUtcTime] = useState(new Date().toUTCString().slice(17, 25));

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10">
      <h1 className="font-orbitron text-2xl lg:text-3xl text-cyan-300 tracking-widest">
        SOLARIS ORBITAL OBSERVATORY
      </h1>
      <div className="flex items-center space-x-4 md:space-x-6 mt-4 md:mt-0 text-cyan-400">
        <StatusIndicator label="DSN Link" color="bg-green-500" />
        <StatusIndicator label="System" color="bg-green-500" />
        <div className="text-sm font-bold tracking-widest">UTC {utcTime}</div>
      </div>
    </header>
  );
};
