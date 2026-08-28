import './globals.css';
import './landing.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = {
  title: 'IntelliSDLC AI | AI-Powered Requirements Engineering Platform',
  description: 'Enterprise AI platform for requirements elicitation, extraction, analysis, exact-template SRS generation, traceability, and continuous version control.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500/30 selection:text-brand-200">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
