import "./globals.css";
import { Header } from "../components/Header.jsx";
import { Toaster } from "../components/ui/toaster.jsx";
import { ThemeProvider } from "../components/theme-provider.jsx";
import { AuthProvider } from "../lib/auth-context.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";

export const metadata = {
  title: "TimeTrack — Office Time Tracking",
  description: "Personal office time tracking app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TimeTrack",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body bg-background text-foreground antialiased transition-colors duration-300" suppressHydrationWarning>
        <GoogleOAuthProvider clientId="524897655485-cd7nacqqelvpk5jlvc9c7uei083hqife.apps.googleusercontent.com">
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <div className="flex flex-col min-h-screen">
                <Header />
                <div className="flex-1">
                  {children}
                </div>
              </div>
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
