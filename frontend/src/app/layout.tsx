import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Disaster-Response Intelligence Console | Team CafeTerminal',
  description:
    'Tactical flood disaster response and environmental hazard intelligence platform for Pune District, Maharashtra. PCCOE HackMatrix 5.0.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#FAF8F3] text-[#273038]">
        {children}
      </body>
    </html>
  );
}
