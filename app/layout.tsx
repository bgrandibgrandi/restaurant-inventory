import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nigiri Vibes - Restaurant Inventory Management',
  description: 'Modern inventory management for restaurants. Track stock, reduce waste, and manage costs across multiple venues.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
