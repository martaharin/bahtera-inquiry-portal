import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  color: string;
}

// Kemudian kita pakai di sini:
export default function StatCard({ title, value, color }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm shadow-gray-200/20 hover:shadow-md transition-all">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      <h3 className={`text-3xl font-black mt-2 ${color}`}>{value}</h3>
    </div>
  );
}