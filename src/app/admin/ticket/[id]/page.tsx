"use client";

import React, { useEffect, useState } from "react";

interface TicketData {
  ticket_id: string;
  status: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  industry: string;
  product_inquiry: string;
  created_at: string;
  assigned_to: string | null;
}

export default function DetailTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTicketDetail() {
      try {
        // 1. Un-wrap params yang berupa Promise
        const { id } = await params;

        // 2. Ambil data dari API Route yang tadi sudah berhasil dibuat
        const res = await fetch(`/api/ticket/${id}`);
        const result = await res.json();

        if (result.success) {
          setTicket(result.data);
        } else {
          setError(result.error || "Gagal mengambil data tiket");
        }
      } catch (err) {
        setError("Terjadi kesalahan koneksi ke server");
      } finally {
        setLoading(false);
      }
    }

    fetchTicketDetail();
  }, [params]);

  if (loading) return <div className="p-8">Memuat detail tiket...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!ticket) return <div className="p-8">Tiket tidak ditemukan</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white rounded-xl shadow-sm border mt-6">
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <div>
          <span className="text-xs text-gray-500">ID TIKET: {ticket.ticket_id}</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">
            Inquiry: {ticket.product_inquiry}
          </h1>
        </div>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
          Status: {ticket.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informasi Pelapor */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-700">Contact Information</h3>
          <p><span className="text-gray-500">Name:</span> {ticket.name}</p>
          <p><span className="text-gray-500">Email:</span> {ticket.email}</p>
          <p><span className="text-gray-500">Phone:</span> {ticket.phone}</p>
          <p><span className="text-gray-500">Location:</span> {ticket.location}</p>
        </div>

        {/* Informasi Perusahaan */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-700">Detail Perusahaan</h3>
          <p><span className="text-gray-500">Company:</span> {ticket.company}</p>
          <p><span className="text-gray-500">Industry:</span> {ticket.industry}</p>
          <p>
            <span className="text-gray-500">Created at:</span>{" "}
            {new Date(ticket.created_at).toLocaleDateString("id-ID")}
          </p>
          <p>
            <span className="text-gray-500">Assigned to:</span>{" "}
            {ticket.assigned_to || ""}
          </p>
        </div>
      </div>
    </div>
  );
}