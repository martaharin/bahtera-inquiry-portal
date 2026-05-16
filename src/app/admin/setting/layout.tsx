"use client";
      <div>
        <h1 className="text-3xl font-black text-gray-900">
          Settings
        </h1>

        <p className="text-sm text-gray-400 mt-2 font-medium">
          Manage portal settings, users, profile, and role permissions.
        </p>
      </div>

      {/* SETTINGS CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

        {/* SIDEBAR */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-5 h-fit sticky top-6">

          <div className="mb-4 px-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Settings Menu
            </p>
          </div>

          <div className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer
                      ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-100'
                          : 'hover:bg-orange-50 text-gray-600'
                      }
                    `}
                  >
                    <i className={`fa-solid ${item.icon} text-sm`}></i>

                    <span className="text-sm font-bold">
                      {item.name}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}