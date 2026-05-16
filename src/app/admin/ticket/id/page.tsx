"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/ticket/${params.id}`);
        const data = await res.json();
        if (res.ok) {
          setTicket(data);
        } else {
          alert(data.error);
          router.push('/admin/ticket');
        }
      } catch (error) {
        console.error("Gagal load detail:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchDetail();
  }, [params.id]);

  if (loading) return <div className="p-10 font-bold text-gray-400 animate-pulse">MEMUAT DETAIL TICKET...</div>;
  if (!ticket) return <div className="p-10 text-red-500">Data tidak ditemukan.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Tombol Back */}
      <Link href="/admin/ticket" className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-orange-500 transition-all">
        ← Kembali ke List
      </Link>

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Ticket Detail</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">ID: #{ticket.ticket_id}</p>
        </div>
        <div className="flex gap-3">
            <span className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                Status: {ticket.status_id === 1 ? 'New' : 'In Progress'}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Info Utama */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Product Inquiry</label>
              <div className="text-lg font-bold text-gray-900 italic leading-relaxed">
                "{ticket.product_inquiry}"
              </div>
            </div>

            <div className="h-px bg-gray-50 w-full"></div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Reason for Inquiry</label>
              <p className="text-sm text-gray-600 leading-relaxed">
                {ticket.reason_for_inquiry || 'Tidak ada deskripsi alasan.'}
              </p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Info Pengirim */}
        <div className="space-y-6">
          <div className="bg-gray-900 p-8 rounded-[32px] text-white space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">Requester Info</h4>
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Name</p>
                <p className="font-bold">{ticket.name}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Email</p>
                <p className="font-bold text-sm">{ticket.email}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Company</p>
                <p className="font-bold text-orange-400">{ticket.company || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Industry</p>
                <p className="font-bold text-xs uppercase tracking-tight">{ticket.industry} ({ticket.industry_scale})</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 text-center">Assigned Admin</label>
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
                <i className="fa-solid fa-user text-xs"></i>
              </div>
              <span className="font-bold text-gray-900 text-sm">{ticket.assigned_to || 'Unassigned'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}