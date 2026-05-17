"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation'; // 💡 1. Tambahkan import useRouter

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter(); // 💡 2. Inisialisasi hook router

  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Tickets', href: '/admin/ticket' },
    { name: 'Report', href: '/admin/report' },
    { name: 'Profile', href: '/admin/profile' },
  ];

  // 💡 3. Buat fungsi eksekutor logout
  const handleLogout = async () => {
  const confirmLogout = window.confirm(
    "Apakah Anda yakin ingin keluar dari sistem?"
  );

  if (!confirmLogout) return;

  try {
    const response = await fetch("/api/logout", {
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      localStorage.removeItem("user");

      console.log("=== LOGOUT SUCCESSFUL ===");

      router.replace("/auth/login");
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
};

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen shrink-0 z-30">
      {/* LOGO BOX */}
      <div className="p-6">
        <div className="w-full h-32 bg-white border border-gray-100 rounded-[24px] shadow-sm flex items-center justify-center p-4">
          <Image 
            src="/logo bahtera.png" 
            alt="Logo" 
            width={180} 
            height={60} 
            className="object-contain"
          />
        </div>
      </div>

      {/* MENU */}
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} className="block">
              <div className={`p-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                isActive 
                ? 'bg-orange-50 text-orange-500 border border-orange-100' 
                : 'text-gray-300 hover:bg-gray-50 hover:text-gray-900'
              }`}>
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <div className="p-8 border-t border-gray-50">
        {/* 💡 4. Pasang event onClick ke elemen text Log Out */}
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