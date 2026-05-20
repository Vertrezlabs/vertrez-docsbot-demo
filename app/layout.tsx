import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vertrez DocsBot',
  description:
    'A RAG knowledge bot demo by Vertrez — ask questions against uploaded documents, get cited answers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-base text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
