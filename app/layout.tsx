import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KnowledgeLoop',
  description: 'AI insights for e-commerce customer voice and behavior data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
