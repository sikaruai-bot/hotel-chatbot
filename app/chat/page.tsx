'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  MessageCircle,
  Phone,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'guest';
  text: string;
  buttons?: string[];
  timestamp: Date;
}

export default function StandaloneChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: 'Namaste! Welcome to Hotel Sherpa Soul, Thamel 😊\n\nHow can I help you today? You can ask about room prices, check availability, or learn about our quiet rooms.',
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
  }, [messages]);

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
        text: data.reply || 'Thanks for reaching out! Our front desk will assist you shortly 😊',
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
          text: 'Thank you for reaching out! You can also connect directly with our front desk team on WhatsApp (+977-9818259472).',
          buttons: ['Talk to Staff'],
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-slate-950/90 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Go to Homepage"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm shadow-sm">
              SS
            </div>
            <div>
              <h1 className="font-bold text-white text-sm sm:text-base leading-tight">
                Hotel Sherpa Soul Assistant
              </h1>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Online • 26 Thamel Bhagwati Marg</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://wa.me/9779818259472"
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <a
              href="tel:+97714530311"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Call Front Desk</span>
            </a>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
          {/* Intro Notice */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-300 flex items-start gap-2.5 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Peaceful Budget Stay in Thamel:</strong>
              <p className="text-[11px] text-slate-400 mt-0.5">
                "No Restaurant. No Noise. Sleep Well." Instant responses 24/7 for availability, room rates, and reservations.
              </p>
            </div>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'guest' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'guest'
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-br-xs shadow-md'
                    : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-xs shadow-sm'
                }`}
              >
                {msg.text}
              </div>

              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>

              {/* Quick Reply Chips */}
              {msg.buttons && msg.buttons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                  {msg.buttons.map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(btn)}
                      className="bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-amber-400 text-xs font-semibold py-1.5 px-3 rounded-full border border-amber-500/30 transition shadow-sm"
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-800/60 w-max px-3 py-2 rounded-xl border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Hotel Sherpa Soul is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2 flex items-center gap-2 shadow-lg">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputValue)}
            placeholder="Ask about rooms, prices, or dates..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || loading}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>
    </div>
  );
}
