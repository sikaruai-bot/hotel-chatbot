import type { Metadata } from 'next';
import './globals.css';
import HotelWidget from '@/components/HotelWidget';

export const metadata: Metadata = {
  title: 'Hotel Sherpa Soul | Thamel, Kathmandu, Nepal',
  description: 'Clean, comfortable and peaceful budget hotel in Thamel, Kathmandu. "No Restaurant. No Noise. Sleep Well."',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
        <HotelWidget />
      </body>
    </html>
  );
}
