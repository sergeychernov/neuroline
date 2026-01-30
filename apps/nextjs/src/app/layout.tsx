import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from './providers';
import { SiteHeader } from './components/SiteHeader';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Neuroline Demo',
  description: 'Демонстрация библиотек Neuroline и Neuroline-UI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={jetbrainsMono.variable}>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider>
            <SiteHeader />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
