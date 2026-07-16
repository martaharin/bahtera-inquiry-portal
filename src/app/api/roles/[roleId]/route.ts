import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getPermissionKeysBySessionUser,
  hasPermission,
} from "@/lib/permissions";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "role.delete")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { roleId } = await params;

    const roleCheck = await db.query(
      `
      SELECT role_id, role_name
      FROM public."role"
      WHERE role_id = $1
      LIMIT 1
      `,
      [roleId]
    );

    const role = roleCheck.rows[0];

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    const roleName = String(role.role_name || "").toLowerCase().trim();

    if (roleName === "admin") {
      return NextResponse.json(
        { success: false, error: "Admin role cannot be deleted" },
        { status: 400 }
      );
    }

    const userCheck = await db.query(
      `
      SELECT COUNT(*)::int AS total_users
      FROM public."users"
      WHERE role_id = $1
      `,
      [roleId]
    );

    const totalUsers = userCheck.rows[0]?.total_users || 0;

    if (totalUsers > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "This role is still assigned to users",
        },
        { status: 400 }
      );
    }

    await db.query(
      `
      DELETE FROM public."role"
      WHERE role_id = $1
      `,
      [roleId]
    );

    return NextResponse.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE ROLE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to delete role",
      },
      { status: 500 }
    );
  }
}