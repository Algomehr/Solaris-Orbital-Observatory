import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Chat } from '@google/genai';
import { initializeChat, sendMessage } from '../services/geminiService';
import { generateSpeech, decode, decodeAudioData } from '../services/ttsService';
import type { ChatMessage, AiDataCache } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AiAdvisorProps {
  dataSummary: string;
  chatHistory: ChatMessage[] | undefined;
  updateAiCache: (updates: Partial<AiDataCache>) => void;
}

const AudioPlayer: React.FC<{ textContent: string; language: 'en' | 'fa' }> = ({ textContent, language }) => {
  const { t } = useLanguage();
  const [isAudioGenerating, setIsAudioGenerating] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [error, setError] = useState('');

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

  const generateAndPlay = useCallback(async () => {
    if (isAudioPlaying) {
      stopPlayback();
      return;
    }

    if (audioBuffer) {
       if (!audioContextRef.current) return;
       if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
       }
       const source = audioContextRef.current.createBufferSource();
       source.buffer = audioBuffer;
       source.connect(audioContextRef.current.destination);
       source.onended = () => setIsAudioPlaying(false);
       source.start(0);
       audioSourceRef.current = source;
       setIsAudioPlaying(true);
       return;
    }

    setIsAudioGenerating(true);
    setError('');
    try {
      const base64Audio = await generateSpeech(textContent, language);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const decodedBytes = decode(base64Audio);
      const buffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
      setAudioBuffer(buffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsAudioPlaying(false);
      source.start(0);
      audioSourceRef.current = source;
      setIsAudioPlaying(true);
    } catch (err) {
      console.error("Failed to generate audio:", err);
      setError(t('aiAdvisor_audioFailed'));
    } finally {
      setIsAudioGenerating(false);
    }
  }, [textContent, audioBuffer, isAudioPlaying, stopPlayback, t, language]);

  useEffect(() => {
      return () => {
        stopPlayback();
      }
  }, [stopPlayback]);
   
  const Icon = () => {
    if (isAudioGenerating) return <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
    if (isAudioPlaying) return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>;
  };
  
  return (
    <button
      onClick={generateAndPlay}
      disabled={isAudioGenerating}
      aria-label={isAudioPlaying ? t('aiAdvisor_stop') : t('aiAdvisor_listen')}
      className="p-1.5 rounded-full text-cyan-400/70 transition-colors duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 disabled:opacity-50 disabled:cursor-wait absolute top-1 right-1 rtl:left-1 rtl:right-auto"
    >
      <Icon />
    </button>
  );
};


export const AiAdvisor: React.FC<AiAdvisorProps> = ({ dataSummary, chatHistory, updateAiCache }) => {
  const { t, language } = useLanguage();
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleInitialQuery = useCallback(async (summary: string) => {
    setIsLoading(true);
    setError('');
    
    const session = initializeChat(t('aiAdvisor_systemInstruction'));
    setChatSession(session);
    
    try {
      const stream = await sendMessage(session, t('aiAdvisor_initialPrompt', { summary }));
      
      let currentResponse = '';
      updateAiCache({ advisorChatHistory: [{ role: 'model', parts: [{ text: '' }] }] });

      for await (const chunk of stream) {
        const textChunk = chunk.text;
        currentResponse += textChunk;
        updateAiCache({ advisorChatHistory: [{ role: 'model', parts: [{ text: currentResponse }] }] });
      }
    } catch (err) {
      setError('Connection to AI Advisor failed. Check console for details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [updateAiCache, t]);
  
  useEffect(() => {
    // Only fetch initial analysis if a summary is provided and no chat history exists
    if (dataSummary && (!chatHistory || chatHistory.length === 0)) {
        handleInitialQuery(dataSummary);
    } else if (!dataSummary) {
        // If there's no data summary, we shouldn't have a chat session.
        setChatSession(null);
    } else if (dataSummary && !chatSession) {
        // Re-initialize session if summary exists but session doesn't (e.g., after cache reset)
        setChatSession(initializeChat(t('aiAdvisor_systemInstruction')));
    }
  }, [dataSummary, chatHistory, handleInitialQuery, t]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !chatSession) return;

    const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: userInput }] };
    const historyWithUserMsg = [...(chatHistory || []), newUserMessage];
    updateAiCache({ advisorChatHistory: historyWithUserMsg });

    setUserInput('');
    setIsLoading(true);

    try {
        const stream = await sendMessage(chatSession, userInput);
        let currentResponse = '';
        
// Fix: Explicitly type the new message object to prevent type widening of the 'role' property.
const placeholderMessage: ChatMessage = { role: 'model', parts: [{ text: '' }] };
const historyWithPlaceholder = [...historyWithUserMsg, placeholderMessage];
        updateAiCache({ advisorChatHistory: historyWithPlaceholder });

        for await (const chunk of stream) {
            const textChunk = chunk.text;
            currentResponse += textChunk;
            // Fix: Explicitly type the new message object to prevent type widening.
const newModelMessage: ChatMessage = { role: 'model', parts: [{ text: currentResponse }] };
const newHistory = [...historyWithUserMsg, newModelMessage];
            updateAiCache({ advisorChatHistory: newHistory });
        }
    } catch (err) {
        setError('Connection to AI Advisor failed.');
        console.error(err);
        const currentHistoryOnError = chatHistory || [];
        // Fix: Explicitly type the new error message object.
const errorResponseMessage: ChatMessage = { role: 'model', parts: [{ text: 'Error: Could not retrieve response.' }] };
updateAiCache({ advisorChatHistory: [...currentHistoryOnError, errorResponseMessage] });
    } finally {
        setIsLoading(false);
    }
  };


  return (
    <div className="p-4 bg-black/30 rounded-lg border border-cyan-800/60 min-h-[16rem] flex flex-col">
      <h4 className="font-orbitron text-sm text-cyan-300 mb-2">{t('aiAdvisor_title')}</h4>
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto text-sm text-gray-300 leading-relaxed font-mono pr-2 rtl:pl-2 rtl:pr-0 space-y-4">
        {(chatHistory || []).map((msg, index) => (
           <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg max-w-sm relative ${msg.role === 'user' ? 'bg-cyan-900/50' : 'bg-gray-800/50'}`}>
                    <div className="whitespace-pre-wrap">
                        {msg.parts[0].text}
                        {isLoading && index === (chatHistory?.length ?? 0) - 1 && <span className="inline-block w-2 h-4 bg-cyan-300 ml-1 rtl:mr-1 animate-pulse"></span>}
                    </div>
                    {msg.role === 'model' && !isLoading && msg.parts[0].text && <AudioPlayer textContent={msg.parts[0].text} language={language} />}
                </div>
           </div>
        ))}
         {(!chatHistory || chatHistory.length === 0) && isLoading && <p className="text-cyan-400 animate-pulse">{t('aiAdvisor_receiving')}</p>}
         {error && <p className="text-red-400 whitespace-pre-wrap">{error}</p>}
      </div>
      
      <div className="mt-4 pt-2 border-t border-cyan-800/60">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input 
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={t('aiAdvisor_placeholder')}
                disabled={isLoading || !chatSession}
                className="w-full bg-gray-900/70 border border-cyan-700/60 rounded-md px-3 py-2 text-sm text-cyan-200 placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-200"
            />
            <button
                type="submit"
                disabled={isLoading || !userInput.trim() || !chatSession}
                className="px-4 py-2 font-orbitron text-sm rounded-md border-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500/20 border-cyan-400 text-cyan-300 hover:enabled:bg-cyan-400 hover:enabled:text-gray-900"
            >
                {t('aiAdvisor_send')}
            </button>
        </form>
      </div>
    </div>
  );
};