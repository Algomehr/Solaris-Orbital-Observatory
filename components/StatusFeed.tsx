import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface StatusFeedProps {
  messages: string[];
}

export const StatusFeed: React.FC<StatusFeedProps> = ({ messages }) => {
  const feedRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-grow p-4 bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg flex flex-col shadow-lg shadow-cyan-500/10">
      <h3 className="font-orbitron text-cyan-300 border-b-2 border-cyan-500/30 pb-1 mb-3 text-sm tracking-wider uppercase flex-shrink-0">
        {t('statusFeed_title')}
      </h3>
      <div ref={feedRef} className="flex-grow overflow-y-auto pr-2 rtl:pl-2 rtl:pr-0">
        {messages.length === 0 ? (
            <p className="text-gray-500 italic text-sm">{t('statusFeed_awaiting')}</p>
        ) : (
            messages.map((msg, index) => (
                <p key={index} className="text-sm font-mono text-cyan-400/90 leading-relaxed animate-fadeIn">
                    {msg}
                </p>
            ))
        )}
      </div>
    </div>
  );
};
