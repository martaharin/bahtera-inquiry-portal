import React from "react";
import Sidebar from "../components/sidebar";
import SessionProviderClient from "../components/session-provider";
import RouteAccessGuard from "../components/RouteAccessGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProviderClient>
      <div className="flex min-h-dvh bg-[#f9fafb] overflow-hidden text-gray-900">
        {/* SIDEBAR */}
        <div className="hidden sm:flex shrink-0">
          <Sidebar />
        </div>

        {/* MAIN CONTENT AREA */}
        <main className="flex min-w-0 flex-1 flex-col h-dvh">
          {/* HEADER */}
          <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 lg:px-10 sticky top-0 z-20 shrink-0">
            <div className="min-w-0">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] truncate">
                Inquiry Management
              </h2>
            </div>
          </header>

          {/* CONTENT AREA */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <div className="w-full max-w-[1440px] mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
              <RouteAccessGuard>
                <div className="min-w-0 overflow-x-auto">
                  {children}
                </div>
              </RouteAccessGuard>
            </div>
          </div>
        </main>
      </div>
    </SessionProviderClient>
  );
}