import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Pulse CRM — AI-Native Marketing Platform',
  description: 'Segment audiences, generate AI campaign copy, and track multi-channel delivery in real-time.',
  keywords: 'CRM, marketing, D2C, AI, campaign, segmentation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-navy-900 text-gray-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
