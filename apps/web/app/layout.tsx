import type { Metadata } from 'next';
import './globals.css';
import '@antv/x6-plugin-minimap/es/index.css';
import { Providers } from './providers';

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
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased h-screen overflow-hidden" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
