// components/tickettable.tsx

export default function TicketTable({ tickets }: { tickets: any[] }) {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-5 p-6 bg-gray-50/50 border-b border-gray-100">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User / Session</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Message</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</span>
      </div>

      <div className="divide-y divide-gray-50">
        {tickets && tickets.length > 0 ? (
          tickets.map((chat, index) => (
            <div key={index} className="grid grid-cols-5 p-6 items-center hover:bg-gray-50/50 transition-colors cursor-pointer">
              {/* Kolom User */}
              <span className="text-xs font-bold text-gray-700">{chat.requester_name || chat.session_id.slice(0,8)}</span>
              
              {/* Kolom Pesan Terakhir */}
              <span className="text-xs text-gray-500 italic truncate pr-4">
                "{chat.inquiry_preview || 'No message'}"
              </span>
              
              {/* Kolom Platform/Industry */}
              <span className="text-[10px] font-black text-blue-500 uppercase">{chat.industry || 'Web'}</span>
              
              {/* Kolom Waktu */}
              <span className="text-xs text-gray-400">
                {new Date(chat.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>

              {/* Kolom Status */}
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                  chat.status === 'active' ? 'bg-green-50 text-green-500' : 'bg-gray-50 text-gray-400'
                }`}>
                  {chat.status || 'Ended'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-20 text-center">
            <p className="text-xs font-black text-gray-300 uppercase tracking-[0.3em]">No Chat Sessions</p>
          </div>
        )}
      </div>
    </div>
  );
}