'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Flame,
  CheckCircle,
  HelpCircle,
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/analytics');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!data) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading analytics...</div>;
  }

  const { metrics, channels, roomPreferences } = data;

  const statCards = [
    { title: 'Total Leads Captured', value: metrics.totalLeads, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'High Intent Leads', value: metrics.highIntentLeads, icon: Flame, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Booking Requests', value: metrics.bookingRequests, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Human Handovers', value: metrics.humanHandovers, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Chatbot & Lead Analytics</h1>
        <p className="text-xs text-slate-500">Real-time performance metrics across all messaging channels.</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</div>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Channel Breakdown & Conversion Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-700" />
            <span>Leads by Inbound Channel</span>
          </h2>

          <div className="space-y-3">
            {Object.entries(channels).map(([ch, count]: any) => {
              const pct = metrics.totalLeads > 0 ? Math.round((count / metrics.totalLeads) * 100) : 0;
              return (
                <div key={ch}>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>{ch}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Preference Inquiries */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-700" />
            <span>Room Type Inquiries</span>
          </h2>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Deluxe Room (USD 20)</span>
                <span>{roomPreferences.deluxe} inquiries</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${metrics.totalLeads > 0 ? (roomPreferences.deluxe / metrics.totalLeads) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Budget Family Room (USD 20)</span>
                <span>{roomPreferences.budgetFamily} inquiries</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${metrics.totalLeads > 0 ? (roomPreferences.budgetFamily / metrics.totalLeads) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Family Room (USD 30)</span>
                <span>{roomPreferences.family} inquiries</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{ width: `${metrics.totalLeads > 0 ? (roomPreferences.family / metrics.totalLeads) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Inquiry to Booking Conversion:</span>
            <span className="font-bold text-emerald-700 text-sm">{metrics.conversionRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
