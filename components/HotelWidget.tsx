'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  MessageCircle,
  Sparkles,
  Phone,
  Calendar,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'guest';
  text: string;
  buttons?: string[];
  timestamp: Date;
}

export default function HotelWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: 'Hi! Welcome to Hotel Sherpa Soul 😊\nHow can I help you today?',
      buttons: ['Check Room Availability', 'Room Prices', 'Hotel Information', 'Talk to Staff'],
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const guestMsg: ChatMessage = {
      id: `guest_${Date.now()}`,
      sender: 'guest',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, guestMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          message: textToSend,
        }),
      });

      const data = await res.json();
      if (data.customerId) setCustomerId(data.customerId);

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'Thanks for reaching out. Our front desk will assist you shortly 😊',
        buttons: data.suggestedReplies || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'bot',
          text: 'Thanks for your message. Our front desk will get back to you shortly 😊',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2.5 transition-transform duration-200 hover:scale-105 border border-slate-700"
          aria-label="Open Chat with Hotel Sherpa Soul"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-amber-400" />
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full absolute -top-1 -right-1 border-2 border-slate-900 animate-pulse"></span>
          </div>
          <span className="text-xs font-semibold pr-1">Chat with us</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[390px] h-[540px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                SS
              </div>
              <div>
                <h3 className="font-semibold text-xs text-white">Hotel Sherpa Soul</h3>
                <p className="text-[10px] text-amber-400 font-medium">No Restaurant. No Noise. Sleep Well.</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href="https://wa.me/9779851068219"
                target="_blank"
                rel="noreferrer"
                title="Direct WhatsApp"
                className="p-1.5 rounded-lg bg-emerald-700/60 hover:bg-emerald-600 text-white transition"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick WhatsApp Handoff Strip */}
          <div className="bg-amber-50 text-amber-950 px-3 py-1.5 text-[11px] flex items-center justify-between border-b border-amber-200/60">
            <span>Prefer WhatsApp?</span>
            <a
              href="https://wa.me/9779851068219"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" /> +977 9851068219
            </a>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'guest' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                    m.sender === 'guest'
                      ? 'bg-slate-900 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>

                {/* Suggested reply buttons */}
                {m.buttons && m.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.buttons.map((btn, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(btn)}
                        className="text-[11px] font-medium bg-white hover:bg-amber-50 hover:text-amber-950 text-slate-700 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-full transition shadow-xs"
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white p-2.5 rounded-xl border border-slate-200 w-fit">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce delay-200"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about dates, rooms, or prices..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputValue)}
              className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={loading || !inputValue.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white p-2 rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
