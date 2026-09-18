'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  Bed,
  Tag,
  MessageCircle,
  TrendingUp,
  Flame,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (channelFilter !== 'ALL') params.set('channel', channelFilter);

      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      const data = await res.json();
      if (data.leads) setLeads(data.leads);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, channelFilter]);

  const updateLeadStatus = async (id: string, newStatus: string) => {
    try {
      await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, leadStatus: newStatus }),
      });
      fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const statuses = [
    'ALL',
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'HIGH_INTENT',
    'BOOKING_REQUEST',
    'CONFIRMED',
    'LOST',
    'CLOSED',
  ];

  const channels = ['ALL', 'WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'WEBSITE', 'META_LEAD_ADS'];

  const filteredLeads = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.campaign?.toLowerCase().includes(q) ||
      l.roomType?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Lead CRM & Inquiries</h1>
          <p className="text-xs text-slate-500">Track and convert inquiries across all channels into direct hotel bookings.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">High Intent</div>
              <div className="text-sm font-bold text-slate-900">
                {leads.filter((l) => l.leadStatus === 'HIGH_INTENT').length}
              </div>
            </div>
          </div>

          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Requests / Confirmed</div>
              <div className="text-sm font-bold text-slate-900">
                {leads.filter((l) => l.leadStatus === 'BOOKING_REQUEST' || l.leadStatus === 'CONFIRMED').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Leads' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            {channels.map((ch) => (
              <option key={ch} value={ch}>{ch === 'ALL' ? 'All Channels' : ch}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, phone, campaign..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 w-52"
            />
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Guest</th>
                <th className="py-3 px-4">Channel & Source</th>
                <th className="py-3 px-4">Travel Dates</th>
                <th className="py-3 px-4">Room Preference</th>
                <th className="py-3 px-4">Intent & Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{lead.name || 'Anonymous Guest'}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {lead.phone && <span>{lead.phone}</span>}
                        {lead.email && <span>{lead.email}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {lead.channel}
                      </span>
                      {lead.campaign && (
                        <div className="text-[10px] text-amber-700 mt-1 font-medium truncate max-w-[140px]">
                          📢 {lead.campaign}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {lead.checkIn ? (
                        <div className="flex items-center gap-1 font-medium text-slate-900">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.checkIn} {lead.checkOut ? `– ${lead.checkOut}` : ''}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {lead.adults ? `${lead.adults} adult(s)` : ''}
                        {lead.children ? `, ${lead.children} child` : ''}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {lead.roomType ? (
                        <div className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.roomType}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Inquiring</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-[200px]">
                      {lead.leadStatus === 'HIGH_INTENT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          🔥 HIGH
                        </span>
                      ) : lead.leadStatus === 'QUALIFIED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-900">
                          QUALIFIED
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
                          NORMAL
                        </span>
                      )}
                      {lead.scoreReason && (
                        <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          {lead.scoreReason}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={lead.leadStatus}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        {statuses.filter((s) => s !== 'ALL').map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {lead.phone ? (
                        <a
                          href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No phone</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
