"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { matchPageAccess } from "@/lib/page-access";

export default function RouteAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { loading, hasAnyPermission } = usePermissions();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    if (loading) return;

    const routeAccess = matchPageAccess(pathname);

    // Kalau route tidak ada di mapping, allow dulu
    // Contoh: page baru yang belum dimapping
    if (!routeAccess) {
      setIsAllowed(true);
      return;
    }

    const hasAccess = hasAnyPermission([...routeAccess.permissions]);

    if (hasAccess) {
      setIsAllowed(true);
      return;
    }

    const fallbackPath =
      routeAccess.redirectTo === pathname
        ? "/admin/profile"
        : routeAccess.redirectTo;

    router.replace(fallbackPath);
  }, [loading, pathname, router, hasAnyPermission]);

  if (loading || !isAllowed) {
    return (
      <div className="p-8 text-sm font-medium text-gray-500">
        Checking access...
      </div>
    );
  }

  return <>{children}</>;
}