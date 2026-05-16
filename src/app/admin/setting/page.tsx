import Link from 'next/link';
      icon: 'fa-user',
    },
    {
      title: 'User Management',
      description:
        'Add, update, and manage portal user accounts.',
      href: '/admin/settings/users',
      icon: 'fa-users',
    },
    {
      title: 'Role & Permission',
      description:
        'Manage role access and permission visibility.',
      href: '/admin/settings/roles',
      icon: 'fa-shield-halved',
    },
  ];

  return (
    <div className="space-y-6">

      {/* TOP CARD */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-[32px] p-8 text-white shadow-xl shadow-orange-100">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.3em] font-black text-orange-100 mb-3">
            Portal Administration
          </p>

          <h2 className="text-3xl font-black leading-tight">
            Configure Your Portal Settings
          </h2>

          <p className="mt-4 text-sm text-orange-50 leading-relaxed">
            Manage users, role permissions, profile settings, and portal access
            configuration for your CRM and ticketing system.
          </p>
        </div>
      </div>

      {/* SETTINGS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {settingCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full">

              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 mb-5">
                <i className={`fa-solid ${card.icon} text-xl`}></i>
              </div>

              <h3 className="text-lg font-black text-gray-900 mb-2">
                {card.title}
              </h3>

              <p className="text-sm text-gray-400 leading-relaxed">
                {card.description}
              </p>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-400">
                  Open Settings
                </span>

                <i className="fa-solid fa-arrow-right text-orange-400"></i>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}