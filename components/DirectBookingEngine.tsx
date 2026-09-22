'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Bed,
  Phone,
  Mail,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  Loader2,
  Clock,
  Send,
} from 'lucide-react';

interface DirectBookingEngineProps {
  initialRoomType?: string;
}

export default function DirectBookingEngine({ initialRoomType }: DirectBookingEngineProps) {
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [checkIn, setCheckIn] = useState(getTodayStr());
  const [checkOut, setCheckOut] = useState(getTomorrowStr());
  const [roomType, setRoomType] = useState(initialRoomType || 'Deluxe Room');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomsRequested, setRoomsRequested] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  // Listen to custom room selection events from room cards
  useEffect(() => {
    const handleSelectRoom = (e: any) => {
      if (e.detail?.roomType) {
        setRoomType(e.detail.roomType);
        const formElem = document.getElementById('booking-engine');
        if (formElem) {
          formElem.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('select-hotel-room', handleSelectRoom);
    return () => window.removeEventListener('select-hotel-room', handleSelectRoom);
  }, []);

  // Compute nights
  const computeNights = () => {
    try {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  const nights = computeNights();

  // Price calculations
  const getBaseRate = () => {
    const lower = roomType.toLowerCase();
    if (lower.includes('family') && !lower.includes('budget')) {
      return 30;
    }
    return 20; // Deluxe ($20) or Budget Family ($20)
  };

  const baseRate = getBaseRate();
  const subtotal = baseRate * nights * roomsRequested;
  const directDiscount = Math.round(subtotal * 0.1);
  const totalPrice = subtotal - directDiscount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!guestName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('Please enter your WhatsApp or mobile number.');
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setErrorMsg('Check-out date must be after check-in date.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/bookings/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn,
          checkOut,
          roomType,
          adults: Number(adults),
          children: Number(children),
          roomsRequested: Number(roomsRequested),
          guestName: guestName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          specialRequests: specialRequests.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit booking inquiry');
      }

      setSuccessData({
        inquiryCode: data.inquiryCode,
        guestName,
        phone,
        roomType,
        checkIn,
        checkOut,
        nights,
        totalPrice,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="booking-engine" className="w-full max-w-5xl mx-auto my-6 px-4">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Direct Website Booking Engine • Instant 10% Off</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Book Your Quiet Stay in Thamel
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Zero booking fees • No advance deposit needed • Pay comfortably at check-in (Cash, Card, QR)
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-right hidden sm:block">
              <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                Direct Booking Perk
              </div>
              <div className="text-lg font-extrabold text-white flex items-center gap-1">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>10% OFF</span>
              </div>
              <div className="text-[10px] text-slate-400">Guaranteed lowest rate</div>
            </div>
          </div>
        </div>

        {/* Form Body or Success Confirmation */}
        {successData ? (
          <div className="p-8 sm:p-12 text-center space-y-6 bg-slate-50/50">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Inquiry Received • Awaiting Staff Approval
              </span>
              <h3 className="text-2xl font-bold text-slate-900">
                Thank you, {successData.guestName}!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your direct booking request has been sent to Hotel Sherpa Soul's front desk. Our staff will review room availability and confirm your reservation shortly via WhatsApp.
              </p>
            </div>

            {/* Inquiry Voucher Card */}
            <div className="max-w-md mx-auto bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-left text-xs space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-400 font-semibold">Inquiry Ref Code</span>
                <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {successData.inquiryCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[11px]">Room</span>
                  <span className="font-semibold text-slate-900">{successData.roomType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Duration</span>
                  <span className="font-semibold text-slate-900">
                    {successData.nights} night(s)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Dates</span>
                  <span className="font-semibold text-slate-900">
                    {successData.checkIn} to {successData.checkOut}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Total with 10% Discount</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    USD ${successData.totalPrice}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Our front desk is checking room status and will reply to <strong>{successData.phone}</strong>.</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition"
              >
                Submit Another Request
              </button>
              <a
                href={`https://wa.me/9779818259472?text=Namaste!%20I%20just%20submitted%20booking%20request%20${successData.inquiryCode}%20on%20your%20website.`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5"
              >
                <span>Chat with Front Desk on WhatsApp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-xl border border-red-200 font-medium">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Travel Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Check-In */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Check-In Date</span>
                </label>
                <input
                  type="date"
                  min={getTodayStr()}
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  required
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900 shadow-xs"
                />
              </div>

              {/* Check-Out */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Check-Out Date</span>
                </label>
                <input
                  type="date"
                  min={checkIn || getTomorrowStr()}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  required
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900 shadow-xs"
                />
              </div>

              {/* Room Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-slate-400" />
                  <span>Room Category</span>
                </label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900 shadow-xs"
                >
                  <option value="Deluxe Room">Deluxe Room (AC, $20/nt)</option>
                  <option value="Budget Family Room">Budget Family Room (Non-AC, $20/nt)</option>
                  <option value="Family Room">Family Room (AC Spacious, $30/nt)</option>
                </select>
              </div>

              {/* Guests */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Guests & Rooms</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-1/2 text-xs font-semibold px-2.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 shadow-xs"
                  >
                    <option value={1}>1 Adult</option>
                    <option value={2}>2 Adults</option>
                    <option value={3}>3 Adults</option>
                    <option value={4}>4 Adults</option>
                  </select>

                  <select
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-1/2 text-xs font-semibold px-2.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 shadow-xs"
                  >
                    <option value={0}>0 Child</option>
                    <option value={1}>1 Child</option>
                    <option value={2}>2 Children</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Guest Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe / Ram Thapa"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>WhatsApp / Mobile Number <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-emerald-700 font-semibold">For confirmation</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="e.g. +977 98XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Special Request */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Special Requests or Arrival Notes <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Arriving late night from Lukla, airport taxi needed, high floor requested..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Price Breakdown & Submission Footer */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>{nights} night(s) × ${baseRate} / night:</span>
                  <span className="line-through text-slate-400">${subtotal}</span>
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                    10% Direct Discount (-${directDiscount})
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-slate-600 font-medium">Estimated Total:</span>
                  <span className="text-2xl font-extrabold text-slate-900">
                    USD ${totalPrice}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">
                    (Approx. NPR {(totalPrice * 135).toLocaleString()})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Booking Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Guarantee Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>No Advance Payment Needed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Free 24/7 Luggage Storage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Room 102 Shared Kitchen (2+ wks)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>24/7 Front Desk in Thamel</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
