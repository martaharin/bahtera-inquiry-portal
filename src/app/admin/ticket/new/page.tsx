"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTicketPage() {
  const router = useRouter();

  // State untuk menampung data form
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    location: '',
    industry: '',
    industryScale: '',
    productInquiry: '',
    reason: '',
    consent: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fungsi untuk menghandle perubahan input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fungsi untuk mengirim data ke API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        // Jika sukses, balik ke halaman tabel tiket
        router.push('/admin/ticket');
        router.refresh(); // Supaya data terbaru langsung muncul
      } else {
        alert("Gagal membuat tiket. Coba cek koneksi database.");
      }
    } catch (error) {
      console.error("Submit Error:", error);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-orange-500 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create New Ticket</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-sm space-y-10">
        
        {/* SECTION 1: COMPANY & CONTACT */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] border-b border-orange-50 pb-2">
            Company & Contact Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Company Name</label>
              <input 
                type="text" 
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Enter company name" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all" 
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Requester Name</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all" 
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all" 
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
              <input 
                type="text" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +62812..." 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all" 
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: INDUSTRY & LOCATION */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] border-b border-orange-50 pb-2">
            Market & Industry Detail
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Location</label>
              <input 
                type="text" 
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. South Tangerang" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Industry</label>
              <input 
                type="text" 
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="e.g. Food & Beverage" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Industry Scale</label>
              <input 
                type="text" 
                name="industryScale"
                value={formData.industryScale}
                onChange={handleChange}
                placeholder="e.g. Enterprise / UMKM" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all" 
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: INQUIRY DETAIL */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] border-b border-orange-50 pb-2">
            Inquiry & Reason
          </h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Inquiry</label>
              <textarea 
                name="productInquiry"
                value={formData.productInquiry}
                onChange={handleChange}
                rows={3} 
                placeholder="What product or chemicals are they looking for?" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all resize-none"
              ></textarea>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Inquiry</label>
              <input 
                type="text" 
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="e.g. New Project / Price Check" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all" 
              />
            </div>
          </div>
        </div>

        {/* CONSENT & SUBMIT */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              name="consent"
              value={formData.consent}
              onChange={handleChange}
              placeholder="Consent (Yes/No)" 
              className="w-40 p-3 bg-gray-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all" 
            />
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
              Customer consent status to be contacted
            </label>
          </div>
          
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full md:w-auto px-12 py-4 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-100 transition-all ${isSubmitting ? 'opacity-50' : 'hover:bg-orange-600 hover:-translate-y-1'}`}
          >
            {isSubmitting ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>

      </form>
    </div>
  );
}