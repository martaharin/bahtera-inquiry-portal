import React from 'react';
import Sidebar from '../components/sidebar'; 
// Import provider-mu (sesuaikan path jika berbeda, misal '../components/session-provider')
import SessionProviderClient from '../components/session-provider'; 

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProviderClient>
      {/* Pastikan ada h-screen agar tidak scroll satu halaman penuh, tapi per bagian */}
      <div className="flex h-screen bg-[#f9fafb] overflow-hidden text-gray-900">
        
        {/* SIDEBAR - Pastikan lebar tetap (shrink-0) */}
        <Sidebar />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 h-full">
          
          {/* HEADER */}
          <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-20 shrink-0">
            <div>
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                Inquiry Management
              </h2>
            </div>
          </header>
          
          {/* AREA KONTEN - Beri scroll internal di sini */}
          <div className="flex-1 overflow-y-auto p-10">
            <div className="max-w-[1440px] mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SessionProviderClient>
  );
}