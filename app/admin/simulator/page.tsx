'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function SimulatorPage() {
  const [channel, setChannel] = useState('WHATSAPP');
  const [senderName, setSenderName] = useState('Sarah Jenkins');
  const [senderPhone, setSenderPhone] = useState('+9779841234567');
  const [content, setContent] = useState('Hi! How much are your rooms per night?');
  const [campaign, setCampaign] = useState('Meta_Thamel_Autumn_2026');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const presets = [
    {
      title: 'Room Prices Inquiry',
      channel: 'WHATSAPP',
      text: 'Hi! How much are your rooms per night?',
      notes: 'Tests DB-driven dynamic pricing retrieval',
    },
    {
      title: 'Booking Inquiry with Dates & Guests',
      channel: 'WHATSAPP',
      text: 'I need a room from 12 to 15 October for 2 adults.',
      notes: 'Tests entity extraction (check-in, check-out, adults count) & progressive flow',
    },
    {
      title: 'High-Intent Booking Request',
      channel: 'WHATSAPP',
      text: 'Yes please, I want to book the Deluxe room for those dates!',
      notes: 'Tests HIGH INTENT classification & summary confirmation prompt',
    },
    {
      title: 'Restaurant Anti-Hallucination Guard',
      channel: 'MESSENGER',
      text: 'Do you have a restaurant or breakfast dining hall in the hotel?',
      notes: 'Tests strict anti-hallucination: No Restaurant, No Noise, Sleep Well',
    },
    {
      title: 'Room 102 Shared Kitchen Query',
      channel: 'INSTAGRAM',
      text: 'Can I cook food in the hotel? Can I use room 102?',
      notes: 'Tests shared kitchen rules (minimum 2 weeks stay, self-cooking, not a restaurant)',
    },
    {
      title: 'Parking & Pool Safety Test',
      channel: 'WEBSITE',
      text: 'Do you have private parking and a swimming pool?',
      notes: 'Tests strict refusal of luxury/parking facilities',
    },
    {
      title: 'Human Staff Handover Trigger',
      channel: 'WHATSAPP',
      text: 'I have a complaint about noise and I want to talk to staff right now.',
      notes: 'Tests HUMAN_REQUIRED handover trigger & staff alert',
    },
    {
      title: 'Nepali Language Support (नेपाली)',
      channel: 'WHATSAPP',
      text: 'नमस्ते, असोज १२ देखि १५ सम्म २ जनाको लागि कोठा खाली छ कि छैन?',
      notes: 'Tests native Nepali detection & response',
    },
    {
      title: 'Hindi Language Support (हिन्दी)',
      channel: 'WHATSAPP',
      text: 'नमस्ते, डिलक्स रूम का एक रात का किराया कितना है?',
      notes: 'Tests native Hindi detection & response',
    },
  ];

  const handleRunSimulation = async (textToSend?: string, chToSend?: string) => {
    try {
      setLoading(true);
      setResult(null);

      const res = await fetch('/api/admin/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: chToSend || channel,
          senderName,
          senderPhone,
          content: textToSend || content,
          campaign,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Terminal className="w-5 h-5 text-amber-500" />
          <span>Meta Omnichannel Test Bench & Simulator</span>
        </h1>
        <p className="text-xs text-slate-500">
          Simulate inbound WhatsApp, Messenger, Instagram, and Meta Lead messages without waiting for Meta developer verification.
        </p>
      </div>

      {/* Preset Scenarios */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>1-Click Test Scenarios</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((p, idx) => (
            <div
              key={idx}
              className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition cursor-pointer flex flex-col justify-between"
              onClick={() => {
                setChannel(p.channel);
                setContent(p.text);
                handleRunSimulation(p.text, p.channel);
              }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">{p.title}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {p.channel}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 italic font-mono bg-slate-50 p-2 rounded border border-slate-100">
                  "{p.text}"
                </p>
              </div>

              <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                <span>{p.notes}</span>
                <span className="text-amber-600 font-bold">Run →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Simulation Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Custom Inbound Message Simulation</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Inbound Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800"
            >
              <option value="WHATSAPP">WhatsApp Cloud API</option>
              <option value="MESSENGER">Facebook Messenger</option>
              <option value="INSTAGRAM">Instagram DM</option>
              <option value="WEBSITE">Website Chat</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Simulated Guest Name</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Guest Phone (WhatsApp ID)</label>
            <input
              type="text"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Guest Message Body</label>
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg p-2"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Simulating this event triggers the full State Machine, Anti-Hallucination Guard, and Lead CRM pipeline.
          </span>

          <button
            onClick={() => handleRunSimulation()}
            disabled={loading || !content.trim()}
            className="inline-flex items-center gap-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Processing through AI Engine...' : 'Send Simulated Event'}</span>
          </button>
        </div>
      </div>

      {/* Output Stream */}
      {result && (
        <div className="bg-slate-900 text-slate-100 p-5 rounded-xl shadow-lg border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Event Dispatched & Processed Successfully</span>
            </div>
            <Link
              href="/admin/inbox"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-1 rounded transition"
            >
              Open in Live Inbox →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Classified Intent & Entities</div>
              <div className="mt-2 space-y-1 text-slate-300">
                <div><strong>Intent:</strong> {result.outbound?.intent || 'DETECTED'}</div>
                <div><strong>Progressive Step:</strong> {result.outbound?.step || 'NORMAL'}</div>
                <div><strong>Trigger Handover:</strong> {result.outbound?.triggerHandover ? 'YES (Human Required)' : 'NO (Automated)'}</div>
                {result.outbound?.handoverReason && (
                  <div className="text-amber-400"><strong>Handover Reason:</strong> {result.outbound.handoverReason}</div>
                )}
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Chatbot Response</div>
              <div className="mt-2 text-white font-sans whitespace-pre-wrap leading-relaxed">
                {result.botReply}
              </div>
              {result.outbound?.suggestedReplies && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-800">
                  {result.outbound.suggestedReplies.map((btn: string, i: number) => (
                    <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      [ {btn} ]
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
