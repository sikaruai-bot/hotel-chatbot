import React from 'react';
import Link from 'next/link';
import {
  Moon,
  Sparkles,
  Wifi,
  ShowerHead,
  MapPin,
  UtensilsCrossed,
  ShieldCheck,
  MessageCircle,
  Phone,
  Mail,
  ChevronRight,
  Bed,
  Users,
} from 'lucide-react';
import HotelWidget from '@/components/HotelWidget';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Announcement Bar */}
      <div className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>26 Thamel Bhagwati Marg, Kathmandu 44600, Nepal</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a href="tel:+97714530311" className="hover:text-white transition flex items-center gap-1">
              <Phone className="w-3 h-3" /> +977-1-4530311
            </a>
            <a href="https://wa.me/9779818259472" target="_blank" rel="noreferrer" className="hover:text-emerald-400 text-emerald-500 font-medium transition flex items-center gap-1">
              <MessageCircle className="w-3 h-3" /> WhatsApp
            </a>
            <Link
              href="/admin/inbox"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded font-bold text-[11px] transition shadow-xs"
            >
              Staff Dashboard →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-base shadow-sm">
              SS
            </div>
            <div>
              <div className="font-bold text-slate-950 text-base tracking-tight leading-tight">
                Hotel Sherpa Soul
              </div>
              <p className="text-[11px] text-amber-700 font-semibold tracking-wide uppercase">
                Thamel • Kathmandu
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#philosophy" className="hover:text-slate-950 transition">Our USP</a>
            <a href="#rooms" className="hover:text-slate-950 transition">Rooms & Rates</a>
            <a href="#kitchen" className="hover:text-slate-950 transition">Shared Kitchen (102)</a>
            <a href="#location" className="hover:text-slate-950 transition">Location</a>
          </nav>

          <a
            href="https://wa.me/9779818259472"
            target="_blank"
            rel="noreferrer"
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Book via WhatsApp</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 rounded-full text-xs font-medium text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>A Clean, Comfortable and Peaceful Budget Hotel in Thamel</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-slate-50">
            "No Restaurant. No Noise. Sleep Well."
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Unlike noisy hotels with busy restaurants, Hotel Sherpa Soul is purpose-built for restful sleep. Situated in a quiet side street in the heart of Thamel, we offer clean rooms, solar hot showers, and high-speed Wi-Fi with dozens of top cafes just outside our door.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#rooms"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-3 rounded-xl transition shadow-md"
            >
              Explore 6 Quiet Rooms
            </a>
            <a
              href="https://wa.me/9779818259472"
              target="_blank"
              rel="noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold px-5 py-3 rounded-xl transition border border-slate-700 flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Inquire on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* USP Feature Strip */}
      <section id="philosophy" className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">Zero Kitchen Noise</h3>
              <p className="text-xs text-slate-500 mt-1">
                No on-site restaurant or dining hall means no morning kitchen clatter or late-night kitchen fumes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
              <ShowerHead className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">24/7 Hot Showers</h3>
              <p className="text-xs text-slate-500 mt-1">
                Reliable solar heating with 24-hour backup ensures powerful hot showers after your trek.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 shrink-0">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">High-Speed Fiber Wi-Fi</h3>
              <p className="text-xs text-slate-500 mt-1">
                Dedicated Wi-Fi access points on every floor for remote workers, video calls, and travel planning.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">Central Thamel</h3>
              <p className="text-xs text-slate-500 mt-1">
                Walking distance to Garden of Dreams, Kathmandu Durbar Square, trekking gear shops, and top cafes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Room Inventory & Pricing Section */}
      <section id="rooms" className="py-14 max-w-6xl mx-auto px-4 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Our 6 Guest Rooms</h2>
          <p className="text-xs text-slate-500 mt-2">
            Exactly 6 peaceful rooms located on the 2nd and 3rd floors (Rooms 201–203, 301–303).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Deluxe Room */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                  Deluxe
                </span>
                <span className="text-lg font-extrabold text-slate-900">USD $20 <span className="text-xs font-normal text-slate-500">/ night</span></span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-3">Deluxe Room</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Comfortable, peaceful room with private bathroom, 24/7 hot water, high-speed Wi-Fi, and plush clean bedding.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Max: 2 adults + 1 child</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rooms: 201, 202, 301</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <a
                href="https://wa.me/9779818259472?text=Hi!%20I%20would%20like%20to%20inquire%20about%20the%20Deluxe%20Room."
                target="_blank"
                rel="noreferrer"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <span>Check Availability</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Budget Family Room */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                  Value Choice
                </span>
                <span className="text-lg font-extrabold text-slate-900">USD $20 <span className="text-xs font-normal text-slate-500">/ night</span></span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-3">Budget Family Room</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Spacious value-oriented option suited for small families or trekking companions looking for budget comfort.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Max: 3 adults + 1 child</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rooms: 203, 302</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <a
                href="https://wa.me/9779818259472?text=Hi!%20I%20would%20like%20to%20inquire%20about%20the%20Budget%20Family%20Room."
                target="_blank"
                rel="noreferrer"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <span>Check Availability</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Family Room */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                  Spacious
                </span>
                <span className="text-lg font-extrabold text-slate-900">USD $30 <span className="text-xs font-normal text-slate-500">/ night</span></span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-3">Family Room</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Our largest room offering generous space, quiet atmosphere, and full private bathroom amenities.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Max: 3 adults + 1 child</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="w-3.5 h-3.5 text-slate-400" />
                  <span>Room: 303</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <a
                href="https://wa.me/9779818259472?text=Hi!%20I%20would%20like%20to%20inquire%20about%20the%20Family%20Room."
                target="_blank"
                rel="noreferrer"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <span>Check Availability</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Room 102 Shared Kitchen Feature */}
      <section id="kitchen" className="py-12 bg-amber-50/50 border-t border-b border-amber-200/60">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Room 102 — Shared Kitchen Facility</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Self-Cooking Facility for Long-Stay Guests (2+ Weeks)
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl mx-auto leading-relaxed">
            Staying in Kathmandu for volunteering, studying, or extended trekking preparation? Long-stay guests (minimum 2 weeks stay) enjoy access to Room 102: equipped with 2 mini fridges, 1 oven, storage racks, dining tables, chairs, and wash basin.
          </p>

          <p className="text-[11px] text-amber-800 font-medium mt-3 italic">
            *Please note: Room 102 is reserved exclusively for long-stay guests' self-cooking. We do not operate a commercial restaurant or dining hall.
          </p>
        </div>
      </section>

      {/* Location & Policies */}
      <section id="location" className="py-12 max-w-6xl mx-auto px-4 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>Location & Getting Here</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Address:</strong> 26 Thamel Bhagwati Marg, Kathmandu 44600, Nepal.<br />
              Located in central Thamel, steps away from supermarkets, currency exchanges, trekking agencies, and cafes.<br />
              <strong>Airport Taxi:</strong> Tribhuvan International Airport is approx 6 km away. Our front desk can assist in coordinating private airport taxi transfers at local standard rates.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Important Policies</span>
            </h3>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li>• <strong>Check-in:</strong> 12:00 PM (Noon) | <strong>Check-out:</strong> 11:00 AM</li>
              <li>• <strong>Quiet Hours:</strong> 10:00 PM – 7:00 AM (strictly enforced for restful sleep)</li>
              <li>• <strong>No Private Parking:</strong> Paid public parking lots are nearby outside the pedestrian zone.</li>
              <li>• <strong>No Pool / No Gym:</strong> Pure focus on peaceful, clean, and budget accommodation.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 px-4 border-t border-slate-800 text-xs mt-auto">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-white font-bold">Hotel Sherpa Soul</div>
            <p className="text-[11px] text-slate-500">"No Restaurant. No Noise. Sleep Well." • 26 Thamel Bhagwati Marg, Kathmandu</p>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>info@hotelsherpasoul.com</span>
            <span>+977-1-4530311</span>
            <Link href="/admin/inbox" className="text-amber-400 hover:underline">
              Staff Portal
            </Link>
          </div>
        </div>
      </footer>

      {/* Embedded Live Hotel Chat Widget */}
      <HotelWidget />
    </div>
  );
}
