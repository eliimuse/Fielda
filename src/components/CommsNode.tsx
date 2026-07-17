import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Badge } from './SharedPrimitives';
import { CommsMessage } from '../types';
import { MessageSquare, Globe, Send, RefreshCw, Volume2, Trash2 } from 'lucide-react';

export const CommsNode: React.FC = () => {
  const [messages, setMessages] = useState<CommsMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [inputChannel, setInputChannel] = useState('operations');
  const [sourceLang, setSourceLang] = useState('es');
  const [targetLang, setTargetLang] = useState('en');
  const [isLoading, setIsLoading] = useState(false);

  const loadMessages = async () => {
    const { data } = await supabase.from('comms_messages').select().order('created_at', { ascending: false });
    if (data) setMessages(data);
  };

  useEffect(() => {
    loadMessages();
    const sub = supabase.subscribe('comms_messages', loadMessages);
    return () => sub.unsubscribe();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);

    try {
      // 1. Call real server endpoint for translation
      const response = await fetch('/api/gemini/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          targetLang: targetLang
        })
      });

      const result = await response.json();
      const translated = result.translatedText || inputText;

      // 2. Log in simulated database
      const newMessage = {
        channel: inputChannel,
        original_text: inputText,
        original_lang: sourceLang,
        translated_text: translated,
        translated_lang: targetLang,
        sender: 'Operations Center (Dispatch)',
      };

      await supabase.from('comms_messages').insert(newMessage);
      setInputText('');
      loadMessages();
    } catch (err) {
      console.error('Translation or insert error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const speakMessage = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech not supported on this browser.');
    }
  };

  const handleClearAll = async () => {
    try {
      await supabase.from('comms_messages').delete();
      setMessages([]);
    } catch (err) {
      console.error('Error clearing communications:', err);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
            <Globe className="text-[#CCFF00] animate-spin-slow" size={24} />
            Comms & Translation Node
          </h2>
          <p className="text-xs text-white/50 font-mono uppercase mt-1">Cross-Lingual Realtime Dispatcher Network</p>
        </div>
        <div>
          <Button
            onClick={handleClearAll}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:border-red-500 hover:text-white dark:hover:bg-red-500/10 min-h-[44px]"
          >
            <Trash2 size={14} />
            Clear All Comms
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form Panel: Dispatch Broadcast */}
        <div className="space-y-4">
          <Card className="space-y-4">
            <h3 className="text-sm font-display font-bold text-[#CCFF00] uppercase tracking-wider border-b border-white/5 pb-2">
              Broadcast Dispatch Alert
            </h3>

            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Target Radio Channel</label>
                <select
                  value={inputChannel}
                  onChange={(e) => setInputChannel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-xs text-white rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                >
                  <option value="operations" className="bg-[#0A0A0B] text-white">Main Operations Channel</option>
                  <option value="zone-A" className="bg-[#0A0A0B] text-white">Gate A Marshals</option>
                  <option value="zone-B" className="bg-[#0A0A0B] text-white">Concourse West Responders</option>
                  <option value="medical" className="bg-[#0A0A0B] text-white">Emergency Medical Units</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">Source Language</label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-xs text-white rounded-sm p-2 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                  >
                    <option value="en" className="bg-[#0A0A0B] text-white">English (US/UK)</option>
                    <option value="es" className="bg-[#0A0A0B] text-white">Español (MX/ES)</option>
                    <option value="ja" className="bg-[#0A0A0B] text-white">日本語 (JP)</option>
                    <option value="pt" className="bg-[#0A0A0B] text-white">Português (BR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">Target Language</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-xs text-white rounded-sm p-2 focus:outline-none focus:ring-1 focus:ring-[#CCFF00]"
                  >
                    <option value="en" className="bg-[#0A0A0B] text-white">English (US/UK)</option>
                    <option value="es" className="bg-[#0A0A0B] text-white">Español (MX/ES)</option>
                    <option value="ja" className="bg-[#0A0A0B] text-white">日本語 (JP)</option>
                    <option value="pt" className="bg-[#0A0A0B] text-white">Português (BR)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Original Text Message</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type dispatch alert (e.g., 'Volunteers needed for wheelchair assistance at Gate A entrance.')"
                  className="w-full bg-white/5 border border-white/10 text-xs text-white rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-[#CCFF00] h-24 resize-none"
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <RefreshCw className="animate-spin" size={14} />
                ) : (
                  <Send size={14} />
                )}
                Translate & Broadcast
              </Button>
            </form>
          </Card>

          {/* Quick templates */}
          <Card className="bg-white/5 border-white/5">
            <h4 className="text-xs font-mono uppercase text-white/40 mb-2">Pre-tested Stadium Triggers</h4>
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  setInputText('Hay una congestión severa en la entrada oeste. Necesitamos tres auxiliares adicionales.');
                  setSourceLang('es');
                  setTargetLang('en');
                }}
                className="w-full text-left px-2.5 py-2 rounded-sm bg-[#0A0A0B] text-[10px] text-white/80 hover:text-[#CCFF00] border border-white/5 hover:border-[#CCFF00]/30 block truncate cursor-pointer transition-all"
              >
                🇪🇸 "Hay una congestión severa en la entrada..."
              </button>
              <button
                onClick={() => {
                  setInputText('First aid unit dispatched to Section 120 for minor heat exhaustion.');
                  setSourceLang('en');
                  setTargetLang('es');
                }}
                className="w-full text-left px-2.5 py-2 rounded-sm bg-[#0A0A0B] text-[10px] text-white/80 hover:text-[#CCFF00] border border-white/5 hover:border-[#CCFF00]/30 block truncate cursor-pointer transition-all"
              >
                🇺🇸 "First aid unit dispatched to Section 120..."
              </button>
            </div>
          </Card>
        </div>

        {/* Right Grid: Live Audio Feed & Multi-lingual Message Stream */}
        <div className="lg:col-span-2 flex flex-col h-[550px]">
          <div className="border-b border-white/5 pb-2 flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-white">
              Tactical Communications Feed
            </h3>
            <span className="text-[10px] font-mono text-white/40 uppercase">Auto-Translates incoming feeds</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 ? (
              <div className="border border-white/5 rounded-sm p-12 text-center text-white/40 font-mono text-xs uppercase bg-white/5">
                No active transmissions. Operations channels quiet.
              </div>
            ) : (
              messages.map((msg) => {
                const date = new Date(msg.created_at);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const actualTargetLang = msg.translated_lang || (msg.original_lang === 'en' ? 'es' : 'en');
                
                return (
                  <div 
                    key={msg.id}
                    className="p-3.5 rounded-sm border border-white/5 bg-white/5 hover:bg-white/10 transition-colors space-y-2.5"
                  >
                    {/* Message Header */}
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-[#CCFF00]">#{msg.channel}</span>
                        <span className="text-xs font-semibold text-white">{msg.sender}</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/40">{timeStr}</span>
                    </div>

                    {/* Dual translation block */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      
                      {/* Original text block */}
                      <div className="bg-[#0A0A0B] p-2.5 rounded-sm border border-white/5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-1.5">
                          <span className="text-[9px] font-mono font-bold text-white/40 uppercase">Original ({msg.original_lang})</span>
                          <button 
                            onClick={() => speakMessage(msg.original_text, msg.original_lang)}
                            className="text-white/40 hover:text-white transition-colors cursor-pointer"
                            title="Speak Original Text"
                          >
                            <Volume2 size={12} />
                          </button>
                        </div>
                        <p className="text-xs text-white/80 italic">"{msg.original_text}"</p>
                      </div>

                      {/* Translated text block */}
                      <div className="bg-[#CCFF00]/10 p-2.5 rounded-sm border border-[#CCFF00]/20">
                        <div className="flex items-center justify-between border-b border-[#CCFF00]/10 pb-1 mb-1.5">
                          <span className="text-[9px] font-mono font-bold text-[#CCFF00] uppercase">AI Translate ({actualTargetLang})</span>
                          <button 
                            onClick={() => speakMessage(msg.translated_text, actualTargetLang)}
                            className="text-[#CCFF00] hover:text-white transition-colors cursor-pointer"
                            title="Speak Translation"
                          >
                            <Volume2 size={12} />
                          </button>
                        </div>
                        <p className="text-xs text-white font-medium">"{msg.translated_text}"</p>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
