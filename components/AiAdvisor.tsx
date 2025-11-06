import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getAiAdvisorResponse } from '../services/geminiService';
import { generateSpeech, decode, decodeAudioData } from '../services/ttsService';

interface AiAdvisorProps {
  dataSummary: string;
}

const AudioControlButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode; ariaLabel: string;}> = ({ onClick, disabled, children, ariaLabel }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="p-2 rounded-full border-2 border-cyan-600/50 text-cyan-300 transition-colors duration-200 enabled:hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-wait"
    >
      {children}
    </button>
);


export const AiAdvisor: React.FC<AiAdvisorProps> = ({ dataSummary }) => {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Audio State
  const [isAudioGenerating, setIsAudioGenerating] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsAudioPlaying(false);
  }, []);

  const generateAndSetAudio = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsAudioGenerating(true);
    setAudioBuffer(null);
    try {
      const base64Audio = await generateSpeech(text);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const decodedBytes = decode(base64Audio);
      const buffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
      setAudioBuffer(buffer);
    } catch (err) {
      console.error("Failed to generate audio briefing:", err);
      setError(prev => `${prev}\nAudio generation failed.`);
    } finally {
      setIsAudioGenerating(false);
    }
  }, []);

  const handleQuery = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setResponse('');
    stopPlayback();
    setAudioBuffer(null);
    setIsAudioGenerating(false);

    try {
      const stream = await getAiAdvisorResponse(dataSummary);
      let fullText = '';
      for await (const chunk of stream) {
        const textChunk = chunk.text;
        fullText += textChunk;
        setResponse(prev => prev + textChunk);
      }
      await generateAndSetAudio(fullText);
    } catch (err) {
      setError('Connection to AI Advisor failed. Check console for details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [dataSummary, stopPlayback, generateAndSetAudio]);
  
  useEffect(() => {
    handleQuery();
  }, [handleQuery]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stopPlayback]);

  const playAudio = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return;
    
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    
    stopPlayback();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      setIsAudioPlaying(false);
      audioSourceRef.current = null;
    };
    source.start(0);
    audioSourceRef.current = source;
    setIsAudioPlaying(true);
  }, [audioBuffer, stopPlayback]);

  const handlePlayPauseToggle = () => {
    if (isAudioPlaying) {
      stopPlayback();
    } else {
      playAudio();
    }
  };


  return (
    <div className="p-4 bg-black/30 rounded-lg border border-cyan-800/60 min-h-[16rem] flex flex-col">
      <h4 className="font-orbitron text-sm text-cyan-300 mb-2">AI MISSION ADVISOR</h4>
      <div className="flex-grow overflow-y-auto text-sm text-gray-300 leading-relaxed font-mono pr-2">
        {isLoading && !response && <p className="text-cyan-400 animate-pulse">Receiving transmission...</p>}
        {error && <p className="text-red-400 whitespace-pre-wrap">{error}</p>}
        {response && (
          <div className="whitespace-pre-wrap">
            {response}
            {!isLoading && <span className="inline-block w-2 h-4 bg-cyan-300 ml-1 animate-pulse"></span>}
          </div>
        )}
        {!isLoading && !response && !error && (
            <div className="text-gray-500 italic">Advisor standing by...</div>
        )}
      </div>
      
      {(response || isAudioGenerating) && (
        <div className="mt-4 pt-2 border-t border-cyan-800/60 flex items-center justify-center gap-4">
            <AudioControlButton onClick={handlePlayPauseToggle} disabled={isAudioGenerating || !audioBuffer} ariaLabel={isAudioPlaying ? "Pause analysis" : "Play analysis"}>
                {isAudioGenerating ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : isAudioPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                )}
            </AudioControlButton>

            <AudioControlButton onClick={playAudio} disabled={isAudioGenerating || !audioBuffer} ariaLabel="Replay analysis">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
            </AudioControlButton>
        </div>
      )}
    </div>
  );
};