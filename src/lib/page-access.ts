export const PAGE_ACCESS = [
  {
    path: "/admin/ticket",
    permissions: ["ticket.view_all", "ticket.view_team", "ticket.view_own"],
    redirectTo: "/admin/ticket",
  },
  {
    path: "/admin/ticket/new",
    permissions: ["ticket.create"],
    redirectTo: "/admin/ticket",
  },
  {
    path: "/admin/ticket/[id]",
    permissions: ["ticket.detail.view"],
    redirectTo: "/admin/ticket",
  },
  {
    path: "/admin/report",
    permissions: ["report.view"],
    redirectTo: "/admin/ticket",
  },
  {
    path: "/admin/profile",
    permissions: ["profile.view"],
    redirectTo: "/admin/ticket",
  },
  {
    path: "/admin/user-management",
    permissions: ["user.view"],
    redirectTo: "/admin/ticket",
  },
  {
    path: "/admin/branch-industry",
    permissions: ["branch_industry.view"],
    redirectTo: "/admin/ticket",
  },
  {
    path: "/admin/role-management",
    permissions: ["role.view"],
    redirectTo: "/admin/ticket",
  },
  {
    path: "/admin/role-setting",
    permissions: ["role.edit"],
    redirectTo: "/admin/role-management",
  },
] as const;

export function matchPageAccess(pathname: string) {
  return PAGE_ACCESS.find((route) => {
    if (route.path.includes("[id]")) {
      const routePattern = route.path.replace("[id]", "[^/]+");
      const regex = new RegExp(`^${routePattern}$`);

      return regex.test(pathname);
    }

    return route.path === pathname;
  });
}