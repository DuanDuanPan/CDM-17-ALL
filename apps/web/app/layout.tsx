import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CDM 脑图 - 未命名项目',
  description: '可视化脑图应用',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased h-screen overflow-hidden">{children}</body>
    </html>
  );
}
