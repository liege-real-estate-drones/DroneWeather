
"use client"; // Add this directive

import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppProviders from '@/components/AppProviders';
import { useEffect } from 'react';
// import type {Metadata, Viewport} from 'next'; // Removed as they cannot be exported from a client component

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Removed: export const metadata: Metadata = { ... };
// Removed: export const viewport: Viewport = { ... };
// Metadata and Viewport cannot be exported from a Client Component.
// You can define metadata in individual page.tsx files or use alternative methods for global metadata.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        if (registrations.length > 0) {
          console.log('[Dev SW Cleanup] Found active service workers, attempting to unregister...');
          for(let registration of registrations) {
            registration.unregister()
              .then(unregistered => {
                if (unregistered) {
                  console.log('[Dev SW Cleanup] Service worker unregistered successfully. Please reload the page.');
                } else {
                  console.warn('[Dev SW Cleanup] Service worker unregistration reported false, it might not have been active or failed silently.');
                }
              })
              .catch(err => {
                console.error('[Dev SW Cleanup] Service worker unregistration failed:', err);
              });
          }
        }
      }).catch(function(err) {
        console.error('[Dev SW Cleanup] Error during service worker getRegistrations(): ', err);
      });
    }
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <html lang="en">
      <head>
        {/* You can add meta tags directly here if needed, e.g., for theme-color */}
        {/* <meta name="theme-color" content="#66B2FF" /> */}
        {/* next-pwa should handle manifest link based on next.config.js */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
