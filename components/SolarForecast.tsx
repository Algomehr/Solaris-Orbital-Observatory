import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { SimulatedData, ProcessState, ThreatMatrixItem, NewsItem } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY! });
const model = 'gemini-2.5-flash';

// A simple markdown renderer
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const htmlContent = content
      .replace(/^### (.*$)/gim, '<h3 class="font-orbitron text-cyan-300 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="font-orbitron text-cyan-200 mt-6 mb-3 border-b border-cyan-500/30 pb-1">$1</h2>')
      .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*$)/gim, (match, p1) => `<li class="ml-4 list-disc">${p1.replace(/<br \/>/g, '')}</li>`)
      .replace(/\n/g, '<br />');
  
    return <div className="prose prose-invert text-cyan-400/90 leading-relaxed space-y-2" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};


const Panel: React.FC<React.PropsWithChildren<{ title: string; icon: React.ReactNode, className?: string }>> = ({ title, icon, className, children }) => (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 shadow-lg shadow-cyan-500/10 flex flex-col ${className}`}>
        <h3 className="font-orbitron text-cyan-300 border-b-2 border-cyan-500/30 pb-1 mb-3 text-sm tracking-wider uppercase flex items-center flex-shrink-0">
            {icon}
            <span className="ml-2">{title}</span>
        </h3>
        <div className="flex-grow overflow-y-auto pr-2 text-sm font-mono text-cyan-400/90 leading-relaxed custom-scrollbar">
            {children}
        </div>
    </div>
);

const Loader: React.FC<{ text: string }> = ({ text }) => (
     <div className="flex flex-col items-center justify-center h-full text-center animate-pulse">
        <svg className="w-12 h-12 text-cyan-400 animate-spin" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3"/>
            <path d="M50 5C25.1472 5 5 25.1472 5 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
        </svg>
        <p className="mt-4 font-orbitron text-md tracking-widest text-cyan-300">{text}</p>
    </div>
);

const StormGauge: React.FC<{ probability: number }> = ({ probability }) => {
    const rotation = -90 + (probability / 100) * 180;
    const color = probability > 75 ? 'text-red-400' : probability > 40 ? 'text-yellow-400' : 'text-green-400';
    return (
        <div className="relative w-48 h-24 overflow-hidden mx-auto">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-700/50 rounded-t-full border-b-0"></div>
            <div className="absolute top-0 left-0 w-full h-full" style={{ transform: `rotate(${rotation}deg)` }}>
                <div className="absolute top-1/2 left-1/2 w-2 h-24 -mt-1 -ml-1 bg-cyan-300 rounded-full origin-bottom" style={{ transform: 'rotate(0deg)' }}></div>
            </div>
            <div className={`absolute bottom-0 w-full text-center ${color}`}>
                <span className="font-orbitron text-4xl">{probability}</span>
                <span className="font-orbitron text-2xl">%</span>
            </div>
        </div>
    );
};

export const SolarForecast: React.FC<{ data: SimulatedData | null; processState: ProcessState; }> = ({ data, processState }) => {
    const [stormProbability, setStormProbability] = useState<number | null>(null);
    const [threatMatrix, setThreatMatrix] = useState<ThreatMatrixItem[] | null>(null);
    const [newsFeed, setNewsFeed] = useState<NewsItem[] | null>(null);
    const [sevenDayForecast, setSevenDayForecast] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState({ probability: false, matrix: false, news: false, sevenDay: false });
    const [error, setError] = useState({ probability: '', matrix: '', news: '', sevenDay: '' });
    
    const fetchPredictionData = useCallback(async (summary: string) => {
        setIsLoading(prev => ({ ...prev, probability: true, matrix: true }));
        setError(prev => ({ ...prev, probability: '', matrix: '' }));

        const systemInstruction = `You are a space weather forecasting AI. Analyze the provided solar data summary and return a JSON object with two keys: 'stormProbability' and 'threatMatrix'.
        - 'stormProbability': A number (0-100) representing the percentage chance of a G1 or greater geomagnetic storm in the next 48 hours.
        - 'threatMatrix': An array of objects for each active region mentioned. Each object should have: 'region' (string), 'magneticClass' (string, e.g., 'Beta-Gamma'), 'flareProbability' (object with C, M, X keys and number values 0-100), and 'cmeRisk' (string: 'Low', 'Moderate', 'High', or 'Very High').
        Base your forecast on the provided data. If no active regions are mentioned, return an empty array for 'threatMatrix'.`;
        
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: `Analyze this data: ${summary}`,
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            stormProbability: { type: Type.INTEGER },
                            threatMatrix: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        region: { type: Type.STRING },
                                        magneticClass: { type: Type.STRING },
                                        flareProbability: {
                                            type: Type.OBJECT,
                                            properties: {
                                                C: { type: Type.INTEGER },
                                                M: { type: Type.INTEGER },
                                                X: { type: Type.INTEGER },
                                            },
                                        },
                                        cmeRisk: { type: Type.STRING },
                                    }
                                }
                            }
                        }
                    },
                },
            });

            const parsed = JSON.parse(response.text);
            setStormProbability(parsed.stormProbability);
            setThreatMatrix(parsed.threatMatrix);

        } catch (err) {
            console.error("Error fetching prediction data:", err);
            setError(prev => ({...prev, probability: 'Forecast Error', matrix: 'Forecast Error' }));
        } finally {
            setIsLoading(prev => ({ ...prev, probability: false, matrix: false }));
        }

    }, []);

    const fetchNewsFeed = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, news: true }));
        setError(prev => ({ ...prev, news: '' }));
        
        try {
            const response = await ai.models.generateContent({
                model,
                contents: "Summarize the top 3 latest news or official reports about solar flares, CMEs, or significant solar activity. Provide a title, a short summary for each, and the source URI.",
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            const newsItems: NewsItem[] = [];
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (chunks) {
                for (const chunk of chunks) {
                    if (chunk.web) {
                        newsItems.push({
                            title: chunk.web.title || 'Untitled',
                            uri: chunk.web.uri,
                            summary: 'AI summary based on the source content will be generated here. For now, please refer to the source.' // Placeholder for summary, as generateContent doesn't directly provide per-source summaries in this format.
                        });
                    }
                }
            }
             // We'll use the main text as the summary if available
            const textResponse = response.text;
            // This is a simplified way to connect summaries to links. A more robust solution would be needed for production.
            if(newsItems.length > 0 && textResponse) {
                const summaries = textResponse.split(/\n\s*\n/); // Split by double newline
                summaries.forEach((summary, index) => {
                    if(newsItems[index]) {
                        newsItems[index].summary = summary.replace(/^\d+\.\s\*\*(.*)\*\*\s-/, ''); // clean up formatting
                    }
                });
            }

            setNewsFeed(newsItems.slice(0, 3)); // Ensure we only show top 3
        } catch(err) {
            console.error("Error fetching news feed:", err);
            setError(prev => ({ ...prev, news: 'Failed to fetch live solar feed.' }));
        } finally {
            setIsLoading(prev => ({ ...prev, news: false }));
        }
    }, []);

    const fetchSevenDayForecast = async () => {
        if (!data?.summary) return;
        setIsLoading(prev => ({ ...prev, sevenDay: true }));
        setError(prev => ({ ...prev, sevenDay: '' }));
        setSevenDayForecast(null);

         const systemInstruction = `You are a senior space weather forecaster. Based on the current solar data, generate a 7-day forecast.
         The output should be in Markdown format.
         For each day, provide a brief summary of expected solar activity, geomagnetic conditions, and potential for aurora sightings.
         Start with "## 7-Day Solar Weather Outlook". For each day use a "### Day X: [Date]" format.`;
        try {
            const response = await ai.models.generateContent({
                model,
                contents: `Current data: ${data.summary}`,
                config: { systemInstruction },
            });
            setSevenDayForecast(response.text);
        } catch (err) {
            console.error("Error fetching 7-day forecast:", err);
            setError(prev => ({ ...prev, sevenDay: 'Failed to generate forecast.' }));
        } finally {
            setIsLoading(prev => ({ ...prev, sevenDay: false }));
        }
    };


    useEffect(() => {
        if (processState === 'complete' && data?.summary) {
            fetchPredictionData(data.summary);
        } else {
            setStormProbability(null);
            setThreatMatrix(null);
        }
    }, [data, processState, fetchPredictionData]);

    useEffect(() => {
        fetchNewsFeed();
    }, [fetchNewsFeed]);


    if (processState === 'idle' || processState === 'processing') {
        return (
             <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 gap-6 animate-fadeIn">
                 <p className="font-orbitron text-lg text-cyan-400">Engage observatory sensors to generate a forecast.</p>
                 <p className="text-gray-500">Awaiting data stream from the main observatory...</p>
             </div>
        );
    }
    
    return (
        <div className="w-full h-full flex flex-col p-4 gap-6 animate-fadeIn">
             <header className="text-center">
                <h2 className="font-orbitron text-2xl text-cyan-200 tracking-widest">
                    SOLAR FORECAST & THREAT ANALYSIS
                </h2>
                <p className="text-cyan-400/80">
                   AI-powered predictions based on real-time simulated data and live web reports.
                </p>
            </header>
             <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <Panel title="Geomagnetic Storm Probability" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}>
                        {isLoading.probability ? <Loader text="ANALYZING..." /> : stormProbability !== null ? <StormGauge probability={stormProbability} /> : <p>{error.probability || "Awaiting data..."}</p>}
                    </Panel>
                    <Panel title="Live Solar Events Feed" className="flex-grow" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2H12a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.293l.94-1.594a1 1 0 011.728 1.02l-.939 1.594m7.562 0l.94 1.594a1 1 0 01-1.728 1.02l-.94-1.594M12 18a6 6 0 00-6-6h12a6 6 0 00-6 6z" /></svg>}>
                        {isLoading.news ? <Loader text="SCANNING WEB..." /> : error.news ? <p className="text-red-400">{error.news}</p> : (
                            <div className="space-y-4">
                                {newsFeed && newsFeed.length > 0 ? newsFeed.map((item, i) => (
                                    <div key={i}>
                                        <a href={item.uri} target="_blank" rel="noopener noreferrer" className="font-bold text-cyan-200 hover:underline">{item.title}</a>
                                        <p className="text-cyan-400/80 text-xs mt-1">{item.summary}</p>
                                    </div>
                                )) : <p>No recent major events found.</p>}
                            </div>
                        )}
                    </Panel>
                </div>
                 <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
                    <Panel title="Active Region Threat Matrix" className="flex-grow" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}>
                         {isLoading.matrix ? <Loader text="ASSESSING THREATS..." /> : error.matrix ? <p className="text-red-400">{error.matrix}</p> : threatMatrix && threatMatrix.length > 0 ? (
                            <table className="w-full text-left text-xs">
                                <thead className="text-cyan-300 uppercase">
                                    <tr>
                                        <th className="p-2">Region</th>
                                        <th className="p-2">Class</th>
                                        <th className="p-2 text-center">Flare Prob. (C/M/X)%</th>
                                        <th className="p-2">CME Risk</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cyan-800/60">
                                    {threatMatrix.map(item => (
                                        <tr key={item.region}>
                                            <td className="p-2 font-bold">{item.region}</td>
                                            <td className="p-2">{item.magneticClass}</td>
                                            <td className="p-2 text-center">{item.flareProbability.C}/{item.flareProbability.M}/{item.flareProbability.X}</td>
                                            <td className="p-2 font-bold">{item.cmeRisk}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         ) : <p>No significant active regions detected.</p>}
                    </Panel>
                     <div className="flex-shrink-0">
                        <button onClick={fetchSevenDayForecast} disabled={isLoading.sevenDay} className="w-full mt-2 py-3 font-orbitron text-lg rounded-md border-2 transition-all duration-300 bg-cyan-500/20 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900 hover:shadow-lg hover:shadow-cyan-400/50 active:scale-95 disabled:bg-gray-600/30 disabled:border-gray-500 disabled:text-gray-500">
                             {isLoading.sevenDay ? 'GENERATING...' : 'GENERATE 7-DAY FORECAST'}
                        </button>
                         {isLoading.sevenDay && <div className="p-4 mt-4 bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg"><Loader text="GENERATING LONG-RANGE FORECAST..." /></div>}
                         {error.sevenDay && <p className="text-red-400 mt-4">{error.sevenDay}</p>}
                         {sevenDayForecast && (
                            <Panel title="7-Day Solar Weather Outlook" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} className="mt-4">
                                <MarkdownRenderer content={sevenDayForecast} />
                            </Panel>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};
