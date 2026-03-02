// Library imports
import type { Metadata, Viewport } from 'next';
// Custom imports
import AuthProvider from "@/components/AuthProvider";
import "@/styles/fonts.css";
import "@/styles/globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1  
};
export const metadata: Metadata = {
    title: 'TeacherCollab',
    description: 'Collaborative sense-making around student dialogues',
};

/**
 * Root layout component that wraps the entire application.
 * Sets up the base HTML structure, includes global styles, and applies the
 * Inter font.
 * 
 * @param {React.ReactNode} children - Child components to be rendered within
 *                                     the layout
 * 
 * @returns JSX element representing the root layout structure
 */ 
export default function RootLayout({children} : {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.png" />
        
        {/* Preload Inter-Regular.woff2 font for better performance */}
        <link rel ="preload" 
              href="/fonts/inter/Inter-Regular.woff2" 
              as  ="font" 
              type="font/woff2" 
              crossOrigin="anonymous" 
        />
        {/* Preload Inter-Bold.woff2 font for better performance */}
        <link rel ="preload" 
              href="/fonts/inter/Inter-Bold.woff2" 
              as  ="font" 
              type="font/woff2" 
              crossOrigin="anonymous" 
        />
      </head>
      
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
};

