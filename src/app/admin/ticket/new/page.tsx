"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTicketPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    location: "",
    industry: "",
    industryScale: "",
    type: "",
    productInquiry: "",
    reason: "",
    consent: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClass =
    "h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 placeholder:text-gray-400";

  const selectClass =
  "h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50 px-4 pr-12 text-sm font-bold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100";

  const labelClass =
    "text-[11px] font-black uppercase tracking-widest text-gray-400";

  const sectionTitleClass =
    "border-b border-orange-50 pb-2 text-[10px] font-black uppercase tracking-[0.28em] text-orange-500";

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/admin/ticket");
        router.refresh();
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
    <div className="mx-auto max-w-[980px] space-y-4 px-4 pb-12">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[11px] font-black uppercase tracking-widest text-gray-400 transition hover:text-orange-500"
        >
          ← Back
        </button>

        <h1 className="text-[28px] font-black tracking-tight text-gray-950">
          Create New Ticket
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:p-8"
      >
        <div className="space-y-7">
          <section className="space-y-4">
            <h2 className={sectionTitleClass}>
              Company & Contact Information
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className={labelClass}>Company Name</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Requester Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +62812..."
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className={sectionTitleClass}>
              Market & Industry Detail
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className={labelClass}>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. South Tangerang"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Industry</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="e.g. Food & Beverage"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Industry Scale</label>
                <input
                  type="text"
                  name="industryScale"
                  value={formData.industryScale}
                  onChange={handleChange}
                  placeholder="e.g. Enterprise / UMKM"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className={sectionTitleClass}>
              Inquiry & Reason
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className={labelClass}>Type</label>

                <div className="relative">
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className={selectClass}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Supply">Supply</option>
                  </select>

                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-800"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Reason for Inquiry</label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="e.g. New Project / Price Check"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Product Inquiry</label>
              <textarea
                name="productInquiry"
                value={formData.productInquiry}
                onChange={handleChange}
                rows={3}
                placeholder="What product or chemicals are they looking for?"
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 placeholder:text-gray-400"
              />
            </div>
          </section>

          <div className="flex flex-col gap-4 border-t border-gray-100 pt-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <select
                name="consent"
                value={formData.consent ? "true" : "false"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    consent: e.target.value === "true",
                  }))
                }
                className="h-11 w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 text-[10px] font-black uppercase tracking-widest outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>

              <label className="text-[10px] font-bold uppercase tracking-tight text-gray-400">
                Customer consent status to be contacted
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`h-11 rounded-2xl bg-orange-500 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-orange-100 transition ${
                isSubmitting
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-orange-600"
              }`}
            >
              {isSubmitting ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}