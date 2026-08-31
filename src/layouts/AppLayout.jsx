import React from 'react';
import { Sidebar } from '../components/Sidebar';

export function AppLayout({ children, adminHeader = false }) {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <main className="box-border w-full min-h-screen overflow-x-hidden px-margin-mobile pb-20 pt-16 md:pb-12 md:pl-[300px] md:pr-margin-desktop md:pt-0">
        {children}
      </main>
    </div>
  );
}
