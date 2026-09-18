'use client';

import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  DollarSign,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Save,
  Info,
} from 'lucide-react';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [savingType, setSavingType] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/rooms');
      const data = await res.json();
      if (data.rooms) {
        setRooms(data.rooms);
        setRoomTypes(data.roomTypes);
        const rateMap: Record<string, number> = {};
        data.roomTypes.forEach((rt: any) => {
          rateMap[rt.id] = rt.basePriceUsd;
        });
        setRates(rateMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleUpdateRate = async (roomTypeId: string) => {
    try {
      setSavingType(roomTypeId);
      await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_rate',
          roomTypeId,
          basePriceUsd: rates[roomTypeId],
        }),
      });
      fetchRooms();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingType(null);
    }
  };

  const handleUpdateRoomStatus = async (roomId: string, newStatus: string) => {
    try {
      await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_room',
          roomId,
          status: newStatus,
        }),
      });
      fetchRooms();
    } catch (err) {
      console.error(err);
    }
  };

  const floor2Rooms = rooms.filter((r) => r.floor === 2);
  const floor3Rooms = rooms.filter((r) => r.floor === 3);
  const room102 = rooms.find((r) => r.roomNumber === '102');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          6-Room Inventory & Dynamic Pricing
        </h1>
        <p className="text-xs text-slate-500">
          Hotel Sherpa Soul strictly maintains 6 sellable guest rooms (Floors 2 & 3). Room 102 is the shared kitchen facility.
        </p>
      </div>

      {/* Dynamic Pricing Editor Cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-500" />
          <span>Active Room Rates (Database-Driven — Updates Chatbot Instantly)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roomTypes.map((rt) => (
            <div key={rt.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-sm">{rt.name}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    Max {rt.maxAdults} adults {rt.maxChildren ? `+ ${rt.maxChildren} child` : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">{rt.description}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">USD $</span>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    value={rates[rt.id] ?? rt.basePriceUsd}
                    onChange={(e) => setRates({ ...rates, [rt.id]: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 text-sm font-bold border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                  />
                  <span className="text-xs text-slate-400">/ night</span>
                </div>

                <button
                  onClick={() => handleUpdateRate(rt.id)}
                  disabled={savingType === rt.id}
                  className="inline-flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingType === rt.id ? 'Saving...' : 'Update'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Room Inventory Floors */}
      <div className="space-y-6">
        {/* Third Floor */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">Third Floor (Rooms 301, 302, 303)</h3>
            </div>
            <span className="text-xs text-slate-400">3 Sellable Rooms</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {floor3Rooms.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-slate-900">Room {r.roomNumber}</span>
                    <div className="text-xs text-slate-600 font-medium">{r.roomType?.name}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    r.status === 'AVAILABLE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.status === 'OCCUPIED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {r.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Quick Status:</span>
                  <select
                    value={r.status}
                    onChange={(e) => handleUpdateRoomStatus(r.id, e.target.value)}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Second Floor */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">Second Floor (Rooms 201, 202, 203)</h3>
            </div>
            <span className="text-xs text-slate-400">3 Sellable Rooms</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {floor2Rooms.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-slate-900">Room {r.roomNumber}</span>
                    <div className="text-xs text-slate-600 font-medium">{r.roomType?.name}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    r.status === 'AVAILABLE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.status === 'OCCUPIED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {r.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Quick Status:</span>
                  <select
                    value={r.status}
                    onChange={(e) => handleUpdateRoomStatus(r.id, e.target.value)}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* First Floor: Room 102 Shared Kitchen (Strictly Non-Sellable) */}
        {room102 && (
          <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-amber-700" />
                <h3 className="font-bold text-amber-950 text-sm">Room 102 — Shared Kitchen Facility</h3>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                  Non-Sellable
                </span>
              </div>
              <span className="text-xs text-amber-800 font-medium">Minimum Stay: 2 Weeks</span>
            </div>

            <p className="text-xs text-amber-900/80 leading-relaxed">
              {room102.notes}
            </p>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded-lg">
              <Info className="w-3.5 h-3.5 shrink-0 text-amber-700" />
              <span>
                <strong>System Safety Rule:</strong> Chatbot will never sell Room 102 as a guest room and will never refer to it as a restaurant or dining hall. Room 101 does not exist.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
