import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HealthAI — Your AI-powered health companion',
  description: 'AI-powered healthcare management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
