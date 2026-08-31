import React from 'react';
import { Navbar } from '../components/Navbar';

export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar showUserProfile={false} showLinks={false} forceLight />
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-fixed opacity-20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary-fixed opacity-10 blur-[120px] rounded-full"></div>
      </div>
      <main className="relative z-10 mt-16 flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-x-hidden overflow-y-auto px-margin-mobile">
        {children}
      </main>
    </div>
  );
}
