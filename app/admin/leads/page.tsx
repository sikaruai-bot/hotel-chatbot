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
  Check,
  X,
  Sparkles,
  BedDouble,
  ShieldCheck,
  Loader2,
  ExternalLink,
  DollarSign,
} from 'lucide-react';

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<'LEADS' | 'BOOKINGS'>('LEADS');
  const [leads, setLeads] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modal state for approving an inquiry
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [modalGuestName, setModalGuestName] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalCheckIn, setModalCheckIn] = useState('');
  const [modalCheckOut, setModalCheckOut] = useState('');
  const [modalRoomTypeId, setModalRoomTypeId] = useState('');
  const [modalRoomId, setModalRoomId] = useState('');
  const [modalAdults, setModalAdults] = useState(1);
  const [modalChildren, setModalChildren] = useState(0);
  const [modalPrice, setModalPrice] = useState(20);
  const [modalNotes, setModalNotes] = useState('');
  const [modalSendWhatsApp, setModalSendWhatsApp] = useState(true);
  const [approvingLoading, setApprovingLoading] = useState(false);
  const [approvalSuccessMsg, setApprovalSuccessMsg] = useState('');

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

  const fetchReservations = async () => {
    try {
      const res = await fetch('/api/admin/bookings');
      const data = await res.json();
      if (data.reservations) setReservations(data.reservations);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoomsAndTypes = async () => {
    try {
      const res = await fetch('/api/admin/rooms');
      const data = await res.json();
      if (data.rooms) setRooms(data.rooms);
      if (data.roomTypes) setRoomTypes(data.roomTypes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchReservations();
    fetchRoomsAndTypes();
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

  // Open Approval Modal
  const handleOpenApproveModal = (lead: any) => {
    setSelectedLead(lead);
    setModalGuestName(lead.name || lead.customer?.name || '');
    setModalPhone(lead.phone || lead.customer?.phone || '');
    setModalEmail(lead.email || lead.customer?.email || '');

    // Format dates (default to today / tomorrow if not valid date)
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setModalCheckIn(lead.checkIn && lead.checkIn.length >= 8 ? lead.checkIn : today);
    setModalCheckOut(lead.checkOut && lead.checkOut.length >= 8 ? lead.checkOut : tomorrow);

    // Pick room type
    const matchedRt = roomTypes.find((rt) =>
      lead.roomType ? rt.name.toLowerCase().includes(lead.roomType.toLowerCase()) : false
    );
    setModalRoomTypeId(matchedRt?.id || roomTypes[0]?.id || '');

    // Find available room
    const sellableRooms = rooms.filter((r) => r.isSellable);
    setModalRoomId(sellableRooms[0]?.id || '');

    setModalAdults(lead.adults || 1);
    setModalChildren(lead.children || 0);

    // Estimated price
    setModalPrice(lead.estimatedValue || 20);
    setModalNotes(lead.notes || `Approved from ${lead.channel || 'Website'} inquiry`);
    setModalSendWhatsApp(Boolean(lead.phone));
    setApprovalSuccessMsg('');
    setApprovalModalOpen(true);
  };

  // Submit Approval & Create Reservation
  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalGuestName || !modalCheckIn || !modalCheckOut) return;

    try {
      setApprovingLoading(true);
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead?.id,
          customerId: selectedLead?.customerId,
          guestName: modalGuestName,
          guestPhone: modalPhone,
          guestEmail: modalEmail,
          roomTypeId: modalRoomTypeId,
          roomId: modalRoomId,
          checkInDate: modalCheckIn,
          checkOutDate: modalCheckOut,
          adults: Number(modalAdults),
          children: Number(modalChildren),
          totalPriceUsd: Number(modalPrice),
          sendWhatsAppNotification: modalSendWhatsApp,
          notes: modalNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve booking');
      }

      setApprovalSuccessMsg(
        `🎉 Successfully created Booking #${data.bookingCode}! ${
          data.whatsappSent ? 'Confirmation sent to guest via WhatsApp.' : ''
        }`
      );

      // Refresh both lists
      fetchLeads();
      fetchReservations();

      setTimeout(() => {
        setApprovalModalOpen(false);
        setActiveTab('BOOKINGS');
      }, 1800);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error creating booking');
    } finally {
      setApprovingLoading(false);
    }
  };

  const statuses = [
    'ALL',
    'BOOKING_REQUEST',
    'HIGH_INTENT',
    'NEW',
    'QUALIFIED',
    'CONTACTED',
    'CONFIRMED',
    'CLOSED',
  ];

  const channels = ['ALL', 'WEBSITE', 'WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'META_LEAD_ADS'];

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

  const filteredReservations = reservations.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.bookingCode?.toLowerCase().includes(q) ||
      r.guestName?.toLowerCase().includes(q) ||
      r.guestPhone?.toLowerCase().includes(q) ||
      r.room?.roomNumber?.toLowerCase().includes(q) ||
      r.roomType?.name?.toLowerCase().includes(q)
    );
  });

  const pendingInquiriesCount = leads.filter(
    (l) => l.leadStatus === 'BOOKING_REQUEST' || l.leadStatus === 'HIGH_INTENT'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Quick Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Inquiries & Booking Management
          </h1>
          <p className="text-xs text-slate-500">
            Review website & WhatsApp inquiries, assign rooms (201–303), and approve confirmed bookings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Pending Requests</div>
              <div className="text-sm font-bold text-slate-900">{pendingInquiriesCount}</div>
            </div>
          </div>

          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Confirmed Bookings</div>
              <div className="text-sm font-bold text-slate-900">{reservations.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('LEADS')}
          className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'LEADS'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Inquiries & Leads</span>
          {pendingInquiriesCount > 0 && (
            <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
              {pendingInquiriesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('BOOKINGS')}
          className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'BOOKINGS'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          <span>Confirmed Reservations</span>
          <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
            {reservations.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {activeTab === 'LEADS' ? (
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
                {st === 'ALL'
                  ? 'All Leads'
                  : st === 'BOOKING_REQUEST'
                  ? '🔔 Booking Requests'
                  : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Official Hotel Sherpa Soul Reservations</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {activeTab === 'LEADS' && (
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
            >
              {channels.map((ch) => (
                <option key={ch} value={ch}>
                  {ch === 'ALL' ? 'All Channels' : ch}
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'LEADS' ? 'Search guest, phone...' : 'Search booking code, guest...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 w-52"
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: LEADS & INQUIRIES */}
      {activeTab === 'LEADS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Channel & Source</th>
                  <th className="py-3 px-4">Travel Dates</th>
                  <th className="py-3 px-4">Room Preference</th>
                  <th className="py-3 px-4">Intent & Status</th>
                  <th className="py-3 px-4 text-right">Approve & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No inquiries found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isRequest =
                      lead.leadStatus === 'BOOKING_REQUEST' || lead.leadStatus === 'HIGH_INTENT';
                    const isConfirmed = lead.leadStatus === 'CONFIRMED';

                    return (
                      <tr
                        key={lead.id}
                        className={`transition ${
                          isRequest ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {lead.name || lead.customer?.name || 'Anonymous Guest'}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {lead.phone && <span>{lead.phone}</span>}
                            {lead.email && <span>{lead.email}</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              lead.channel === 'WEBSITE'
                                ? 'bg-blue-100 text-blue-800'
                                : lead.channel === 'WHATSAPP'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {lead.channel}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[130px]">
                            {lead.source || 'Direct'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {lead.checkIn ? (
                            <div className="flex items-center gap-1 font-medium text-slate-900">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {lead.checkIn} {lead.checkOut ? `– ${lead.checkOut}` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Dates pending</span>
                          )}
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {lead.adults ? `${lead.adults} adult(s)` : '1 adult'}
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
                            <span className="text-slate-400 italic">General Inquiry</span>
                          )}
                          {lead.estimatedValue ? (
                            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                              Est: ${lead.estimatedValue}
                            </div>
                          ) : null}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {isRequest ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                🔔 {lead.leadStatus.replace('_', ' ')}
                              </span>
                            ) : isConfirmed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✅ CONFIRMED
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-medium">
                                {lead.leadStatus}
                              </span>
                            )}
                          </div>
                          {lead.notes && (
                            <div className="text-[10px] text-slate-500 mt-1 line-clamp-1 max-w-[160px]">
                              {lead.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2">
                          {!isConfirmed ? (
                            <button
                              onClick={() => handleOpenApproveModal(lead)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Approve & Book</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                              <Check className="w-3.5 h-3.5" />
                              <span>Booked</span>
                            </span>
                          )}

                          {lead.phone && (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: CONFIRMED RESERVATIONS */}
      {activeTab === 'BOOKINGS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Booking Code</th>
                  <th className="py-3 px-4">Guest Details</th>
                  <th className="py-3 px-4">Assigned Room</th>
                  <th className="py-3 px-4">Check-In / Out</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No confirmed reservations yet.
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-1 rounded">
                          {res.bookingCode}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(res.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{res.guestName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {res.guestPhone && <span>{res.guestPhone}</span>}
                          {res.guestEmail && <span>{res.guestEmail}</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Bed className="w-3.5 h-3.5 text-amber-500" />
                          <span>{res.room ? `Room ${res.room.roomNumber}` : 'Unassigned'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{res.roomType?.name}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(res.checkInDate).toISOString().split('T')[0]} to{' '}
                            {new Date(res.checkOutDate).toISOString().split('T')[0]}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {res.adults} adult(s){res.children ? `, ${res.children} child` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-700 text-sm">
                        ${res.totalPriceUsd}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {res.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {res.guestPhone ? (
                          <a
                            href={`https://wa.me/${res.guestPhone.replace(/[^0-9]/g, '')}`}
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
      )}

      {/* APPROVAL & BOOKING CREATION MODAL */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Approve Inquiry & Confirm Booking
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Assign a room (Floors 2 & 3) and generate an official reservation code.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setApprovalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {approvalSuccessMsg ? (
              <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="text-sm font-bold text-emerald-900">{approvalSuccessMsg}</div>
                <p className="text-xs text-emerald-700">Redirecting to reservations view...</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmApproval} className="space-y-4 text-xs">
                {/* Guest Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Guest Full Name</label>
                    <input
                      type="text"
                      value={modalGuestName}
                      onChange={(e) => setModalGuestName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Guest WhatsApp / Phone
                    </label>
                    <input
                      type="tel"
                      value={modalPhone}
                      onChange={(e) => setModalPhone(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Check-in Date</label>
                    <input
                      type="date"
                      value={modalCheckIn}
                      onChange={(e) => setModalCheckIn(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Check-out Date</label>
                    <input
                      type="date"
                      value={modalCheckOut}
                      onChange={(e) => setModalCheckOut(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Room Category & Room Number Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Room Category</label>
                    <select
                      value={modalRoomTypeId}
                      onChange={(e) => setModalRoomTypeId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                    >
                      {roomTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name} (${rt.basePriceUsd}/nt)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Assign Room (Floor 2/3)
                    </label>
                    <select
                      value={modalRoomId}
                      onChange={(e) => setModalRoomId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                    >
                      {rooms
                        .filter((r) => r.isSellable)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            Room {r.roomNumber} ({r.roomType?.name || 'Room'}, Floor {r.floor}) - {r.status}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Guests & Total Amount */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Adults</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={modalAdults}
                      onChange={(e) => setModalAdults(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Children</label>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={modalChildren}
                      onChange={(e) => setModalChildren(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Total Price (USD)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={modalPrice}
                      onChange={(e) => setModalPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-800 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Special Requests / Staff Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Instructions</label>
                  <input
                    type="text"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="e.g. Flight arrival 10 PM, luggage storage requested"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                {/* WhatsApp Notification Checkbox */}
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="sendWa"
                    checked={modalSendWhatsApp}
                    onChange={(e) => setModalSendWhatsApp(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="sendWa" className="font-semibold text-emerald-950 cursor-pointer">
                    📲 Send official booking confirmation voucher to guest on WhatsApp
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setApprovalModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={approvingLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {approvingLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Confirming...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Confirm & Allocate Room</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
