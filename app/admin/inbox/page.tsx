'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Phone,
  Mail,
  Calendar,
  Bed,
  CheckCircle,
  AlertTriangle,
  Bot,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface ConversationItem {
  id: string;
  customerId: string;
  channel: string;
  status: string;
  mode: string;
  language: string;
  lastMessageAt: string;
  unreadStaff: boolean;
  summary?: string;
  customer: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  state?: {
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
    roomType?: string;
    roomsCount?: number;
  };
  messages: {
    content: string;
    direction: string;
    createdAt: string;
  }[];
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Quick reply templates
  const quickReplies = [
    { title: 'Room Prices', text: 'Our starting rates are Deluxe Room ($20/night), Budget Family ($20/night), and Family Room ($30/night). Would you like to check availability for your dates?' },
    { title: 'No Restaurant Info', text: 'At Hotel Sherpa Soul, our motto is "No Restaurant. No Noise. Sleep Well." We do not have an on-site restaurant to keep rooms peaceful, but dozens of top cafes & bakeries are within a 1-2 min walk in Thamel!' },
    { title: 'Location & Taxi', text: 'We are located at 26 Thamel Bhagwati Marg, central Thamel. We can assist in arranging airport taxi pickup at standard local rates. What is your flight arrival time?' },
    { title: 'Shared Kitchen', text: 'Our Room 102 shared kitchen is available for guests staying 2 weeks or more. It has 2 mini fridges, oven, tables, and dining space for self-cooking.' },
    { title: 'Check-in Policy', text: 'Standard check-in is from 12:00 PM (noon) and check-out is by 11:00 AM. Free luggage storage is available if you arrive early!' },
  ];

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedChannel !== 'ALL') params.set('channel', selectedChannel);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/conversations?${params.toString()}`);
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        if (!selectedId && data.conversations.length > 0) {
          setSelectedId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/conversations/${id}`);
      const data = await res.json();
      if (data.conversation) {
        setActiveConv(data.conversation);
      }
    } catch (err) {
      console.error('Error loading details:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [selectedChannel, selectedStatus]);

  useEffect(() => {
    if (selectedId) {
      fetchActiveConversation(selectedId);
    }
  }, [selectedId]);

  const handleTakeover = async () => {
    if (!selectedId) return;
    await fetch(`/api/admin/conversations/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'takeover' }),
    });
    fetchActiveConversation(selectedId);
    fetchConversations();
  };

  const handleResumeBot = async () => {
    if (!selectedId) return;
    await fetch(`/api/admin/conversations/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume_bot' }),
    });
    fetchActiveConversation(selectedId);
    fetchConversations();
  };

  const handleSendReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    try {
      setSending(true);
      await fetch(`/api/admin/conversations/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', message: replyText.trim() }),
      });
      setReplyText('');
      fetchActiveConversation(selectedId);
      fetchConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedId) return;
    await fetch(`/api/admin/conversations/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_status', status: newStatus }),
    });
    fetchActiveConversation(selectedId);
    fetchConversations();
  };

  const handleAddNote = async () => {
    if (!selectedId || !internalNote.trim()) return;
    await fetch(`/api/admin/conversations/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_note', note: internalNote.trim() }),
    });
    setInternalNote('');
    fetchActiveConversation(selectedId);
  };

  const channels = ['ALL', 'WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'WEBSITE'];
  const statuses = ['ALL', 'HIGH_INTENT', 'HUMAN_REQUIRED', 'BOOKING_REQUEST', 'OPEN', 'CONFIRMED', 'CLOSED'];

  return (
    <div className="space-y-4">
      {/* Search & Channel Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {channels.map((ch) => (
            <button
              key={ch}
              onClick={() => setSelectedChannel(ch)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                selectedChannel === ch
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {ch === 'ALL' ? 'All Channels' : ch}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search guest or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
              className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 w-48"
            />
          </div>

          <button
            onClick={fetchConversations}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Inbox Layout: Left List + Right Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px]">
        {/* Left Column: Conversation List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Status Pills */}
          <div className="p-2 border-b border-slate-100 flex gap-1 overflow-x-auto">
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition ${
                  selectedStatus === st
                    ? 'bg-amber-100 text-amber-900 font-semibold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No conversations found.</div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedId === conv.id;
                const lastMsg = conv.messages?.[0]?.content || 'New inquiry';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`p-3 cursor-pointer transition flex flex-col gap-1 text-left ${
                      isSelected ? 'bg-amber-50/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900">
                          {conv.customer?.name || 'Guest'}
                        </span>
                        {conv.unreadStaff && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1">{lastMsg}</p>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {conv.channel}
                      </span>

                      {conv.status === 'HIGH_INTENT' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 flex items-center gap-0.5">
                          🔥 HIGH INTENT
                        </span>
                      )}

                      {conv.status === 'HUMAN_REQUIRED' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 flex items-center gap-0.5">
                          ⚠️ HUMAN
                        </span>
                      )}

                      {conv.mode === 'HUMAN' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          Staff Handling
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Window & Customer Drawer */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900 text-sm">
                      {activeConv.customer?.name || 'Guest'}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">
                      {activeConv.channel}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      activeConv.mode === 'HUMAN' ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {activeConv.mode === 'HUMAN' ? '👤 Staff Mode' : '🤖 Bot Mode'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                    {activeConv.customer?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {activeConv.customer.phone}
                      </span>
                    )}
                    {activeConv.customer?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" /> {activeConv.customer.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Takeover / Resume Bot toggle */}
                  {activeConv.mode === 'BOT' ? (
                    <button
                      onClick={handleTakeover}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
                    >
                      Take Over
                    </button>
                  ) : (
                    <button
                      onClick={handleResumeBot}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                    >
                      Resume Bot
                    </button>
                  )}

                  {/* Status Dropdown */}
                  <select
                    value={activeConv.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="OPEN">Open</option>
                    <option value="HIGH_INTENT">🔥 High Intent</option>
                    <option value="HUMAN_REQUIRED">⚠️ Human Required</option>
                    <option value="BOOKING_REQUEST">📅 Booking Request</option>
                    <option value="CONFIRMED">✅ Confirmed</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>

              {/* Guest Profile Banner (Extracted dates & summary) */}
              <div className="bg-amber-50/60 border-b border-amber-200/60 p-2.5 px-4 flex flex-wrap items-center justify-between text-xs text-amber-950">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>
                      <strong>Dates:</strong> {activeConv.state?.checkIn || 'Not specified'}{' '}
                      {activeConv.state?.checkOut ? `→ ${activeConv.state.checkOut}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-700" />
                    <span>
                      <strong>Guests:</strong> {activeConv.state?.adults || 1} adult(s)
                      {activeConv.state?.children ? `, ${activeConv.state.children} child` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-amber-700" />
                    <span>
                      <strong>Room:</strong> {activeConv.state?.roomType || 'Undecided'}
                    </span>
                  </div>
                </div>

                {activeConv.summary && (
                  <div className="text-[11px] text-amber-900 font-medium italic mt-1 sm:mt-0">
                    "{activeConv.summary}"
                  </div>
                )}
              </div>

              {/* Message Transcript Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                {activeConv.messages?.map((msg: any) => {
                  const isInbound = msg.direction === 'INBOUND';
                  const isSystem = msg.messageType === 'SYSTEM';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center my-2">
                        <span className="text-[11px] bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                        <span>{isInbound ? activeConv.customer?.name || 'Guest' : msg.isStaffReply ? 'Staff (You)' : 'Sherpa Bot'}</span>
                        <span>•</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-[75%] p-3 rounded-2xl text-xs shadow-sm whitespace-pre-wrap ${
                          isInbound
                            ? 'bg-white text-slate-900 border border-slate-200 rounded-tl-sm'
                            : msg.isStaffReply
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : 'bg-slate-900 text-slate-50 rounded-tr-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Replies Tray */}
              <div className="p-2 border-t border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-1 whitespace-nowrap">
                  Quick:
                </span>
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    onClick={() => setReplyText(qr.text)}
                    className="text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-950 px-2.5 py-1 rounded-md transition whitespace-nowrap border border-slate-200"
                  >
                    {qr.title}
                  </button>
                ))}
              </div>

              {/* Reply Input Bar */}
              <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  placeholder={
                    activeConv.mode === 'BOT'
                      ? 'Type to reply directly (will send via ' + activeConv.channel + ')...'
                      : 'Staff mode active — reply to guest...'
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white p-2.5 rounded-lg transition flex items-center justify-center shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
              Select a conversation to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
