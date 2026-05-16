"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TicketPage() {
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]); // State untuk data asli dari DB
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk mengambil data dari API
  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ticket');
      const data = await res.json();
      // Pastikan data yang diset adalah array
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Gagal mengambil data tiket:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchTickets();
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Ticket Management</h1>
        <Link href="/admin/ticket/new">
          <button className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-orange-600 transition-all cursor-pointer">
            New Ticket
          </button>
        </Link>
      </div>

      {/* OVERVIEW STATS - Menggunakan data real dari length array */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Ticket</h3>
          <div className="flex justify-center my-2 text-green-500">
             <i className="fa-solid fa-database text-2xl"></i>
          </div>
          <p className="text-4xl font-black text-gray-900">{tickets.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center justify-center gap-2">
            <i className="fa-solid fa-user text-sm"></i> Admin 1
          </h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">On Progress Ticket</p>
          <p className="text-4xl font-black text-gray-900 mt-2">24</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center justify-center gap-2">
            <i className="fa-solid fa-user text-sm"></i> Admin 2
          </h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">On Progress Ticket</p>
          <p className="text-4xl font-black text-gray-900 mt-2">24</p>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex flex-wrap lg:flex-nowrap items-end gap-6">
          <div className="flex flex-1 gap-4 min-w-[450px]">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Consent</label>
              <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-200 transition-all">
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
              <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-200 transition-all">
                <option>On Progress</option>
                <option>New</option>
                <option>Closed</option>
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned To</label>
              <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-200 transition-all">
                <option>Admin 1</option>
                <option>Admin 2</option>
              </select>
            </div>
          </div>

          <div className="flex items-end gap-4 w-full lg:w-auto">
            <div className="space-y-2 flex-1 lg:flex-none">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Periode</label>
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                <input type="date" className="bg-transparent text-[10px] font-bold outline-none" />
                <span className="text-[9px] font-black text-gray-300 uppercase">to</span>
                <input type="date" className="bg-transparent text-[10px] font-bold outline-none" />
              </div>
            </div>
            <button className="bg-orange-500 hover:bg-orange-600 text-white h-[48px] px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-orange-100 whitespace-nowrap">
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="space-y-4">
        <div className="grid grid-cols-6 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          <div>Inquiry / Company</div>
          <div className="text-center">Consent</div>
          <div className="text-center">Assigned To</div>
          <div className="text-center">Industry</div>
          <div className="text-center">Requester</div>
          <div className="text-right">Action</div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white p-10 rounded-[24px] text-center font-bold text-gray-400 italic">
              Loading data from database...
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white p-10 rounded-[24px] text-center font-bold text-gray-400 italic">
              No inquiries found in database.
            </div>
          ) : (
            tickets.map((ticket: any) => (
              <div key={ticket.inquiry_id} className="grid grid-cols-6 items-center bg-white p-6 rounded-[24px] border border-orange-50 shadow-sm text-[12px] font-medium text-gray-600 transition-all hover:shadow-md">
                <div className="pr-6">
                  <div className="text-gray-900 font-bold truncate italic">"{ticket.product_inquiry}"</div>
                  <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest mt-1">
                    {ticket.company || "No Company"}
                  </div>
                </div>
                
                <div className={`text-center font-bold ${ticket.consent_to_contact ? 'text-green-500' : 'text-red-400'}`}>
                  {ticket.consent_to_contact ? 'YES' : 'NO'}
                </div>

                <div className="text-center font-bold text-gray-900 uppercase">{ticket.assigned_user_id || '-'}</div>

                <div className="text-center font-bold text-gray-400 uppercase tracking-tighter">{ticket.industry || '-'}</div>
                
                <div className="text-center">
                    <p className="font-bold text-gray-900">{ticket.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{ticket.email}</p>
                </div>
                
                <div className="text-right">
                  <Link href={`/admin/ticket/${ticket.ticket_id}`}>
                      <button className="text-[10px] font-black text-orange-400 hover:text-orange-600 transition-all uppercase tracking-[0.2em]">
                          View Details →
                      </button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}