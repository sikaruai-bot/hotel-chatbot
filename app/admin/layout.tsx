'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Users,
  BedDouble,
  BookOpen,
  BarChart3,
  Terminal,
  ExternalLink,
  Hotel,
  Bell,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/inbox', label: 'Inbox', icon: MessageSquare },
    { href: '/admin/leads', label: 'Lead CRM', icon: Users },
    { href: '/admin/rooms', label: 'Rooms & PMS', icon: BedDouble },
    { href: '/admin/knowledge', label: 'Knowledge Base', icon: BookOpen },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/simulator', label: 'Meta Simulator', icon: Terminal },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-slate-950 text-lg shadow-sm">
              <Hotel className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-semibold tracking-tight text-white flex items-center gap-2">
                <span>Hotel Sherpa Soul</span>
                <span className="text-xs bg-slate-800 text-amber-400 font-normal px-2 py-0.5 rounded border border-slate-700">
                  CRM & Chatbot
                </span>
              </div>
              <p className="text-xs text-slate-400">26 Thamel Bhagwati Marg, Kathmandu</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md border border-slate-700 transition"
            >
              <span>Guest Site & Widget</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                <span className="w-1.5 h-1.5 mr-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Bot Active
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="bg-slate-950 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex space-x-1 overflow-x-auto py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
