"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();

  const { data: session } = useSession();

  const role = String((session?.user as any)?.role_name || "")
    .toLowerCase()
    .trim();

  const isAdmin = role === "admin";

  // DETEKSI ROUTE AKTIF
  const isDashboardActive = pathname === "/admin/dashboard";
  const isTicketsActive = pathname === "/admin/ticket";
  const isReportActive = pathname === "/admin/report";
  const isProfileActive = pathname === "/admin/profile";

  const isUserManagementActive =
    pathname === "/admin/user-management" ||
    pathname === "/admin/branch-industry";

  const isBranchIndustryActive = pathname === "/admin/branch-industry";

  const handleLogout = async () => {
    const confirmLogout = window.confirm(
      "Apakah Anda yakin ingin keluar dari sistem?"
    );

    if (!confirmLogout) return;

    await signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen shrink-0 z-30">
      <div className="p-6">
        <div className="w-full h-32 bg-white border border-gray-100 rounded-[24px] shadow-sm flex items-center justify-center p-4">
          <Image
            src="/logo bahtera.png"
            alt="Logo"
            width={180}
            height={60}
            loading="eager"
            className="object-contain"
          />
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {/* MENU DASHBOARD (BARU) */}
        <Link href="/admin/dashboard">
          <div
            className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
              isDashboardActive
                ? "bg-orange-50 text-orange-500 border border-orange-100"
                : "text-gray-300 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Dashboard
          </div>
        </Link>

        {/* MENU TICKETS */}
        <Link href="/admin/ticket">
          <div
            className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
              isTicketsActive
                ? "bg-orange-50 text-orange-500 border border-orange-100"
                : "text-gray-300 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Tickets
          </div>
        </Link>

        {/* MENU REPORT */}
        <Link href="/admin/report">
          <div
            className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
              isReportActive
                ? "bg-orange-50 text-orange-500 border border-orange-100"
                : "text-gray-300 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Report
          </div>
        </Link>

        {/* MENU USER MANAGEMENT (ADMIN ONLY) */}
        {isAdmin && (
          <div className="space-y-2">
            <Link href="/admin/user-management">
              <div
                className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                  isUserManagementActive
                    ? "bg-orange-50 text-orange-500 border border-orange-100"
                    : "text-gray-300 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                User Management
              </div>
            </Link>

            {isUserManagementActive && (
              <div className="ml-4 pl-4 border-l border-orange-100 space-y-2">
                <Link href="/admin/branch-industry">
                  <div
                    className={`p-3 rounded-xl font-black text-[10px] uppercase tracking-[0.18em] transition-all ${
                      isBranchIndustryActive
                        ? "bg-orange-500 text-white"
                        : "text-gray-400 hover:bg-orange-50 hover:text-orange-500"
                    }`}
                  >
                    Branch &amp; Industry
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* MENU PROFILE */}
        <Link href="/admin/profile">
          <div
            className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
              isProfileActive
                ? "bg-orange-50 text-orange-500 border border-orange-100"
                : "text-gray-300 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Profile
          </div>
        </Link>
      </nav>

      {/* FOOTER LOGOUT */}
      <div className="p-8 border-t border-gray-50">
        <div
          onClick={handleLogout}
          className="text-[10px] font-black text-red-400 uppercase tracking-widest cursor-pointer hover:text-red-600 transition-all"
        >
          Log Out
        </div>
      </div>
    </aside>
  );
}