import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getPermissionKeysBySessionUser,
  hasPermission,
} from "@/lib/permissions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    console.log("HIT ROLE PERMISSIONS API");
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "role.view")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { roleId } = await params;

    const result = await db.query(
      `
      SELECT
        p.permission_id,
        p."key",
        p.name,
        p.module,
        p.description
      FROM public.role_permissions rp
      INNER JOIN public.permissions p
        ON rp.permission_id = p.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.module ASC, p.name ASC
      `,
      [roleId]
    );

    return NextResponse.json({
      success: true,
      permissions: result.rows,
      permissionIds: result.rows.map((row) => row.permission_id),
      permissionKeys: result.rows.map((row) => row.key),
    });
  } catch (error: any) {
    console.error("GET ROLE PERMISSIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to get role permissions",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  let transactionStarted = false;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "role.edit")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { roleId } = await params;
    const body = await req.json();

    const permissionIds = Array.isArray(body.permission_ids)
      ? body.permission_ids
      : [];

    await db.query("BEGIN");
    transactionStarted = true;

    await db.query(
      `
      DELETE FROM public.role_permissions
      WHERE role_id = $1
      `,
      [roleId]
    );

    if (permissionIds.length > 0) {
      await db.query(
        `
        INSERT INTO public.role_permissions
        (
          role_id,
          permission_id
        )
        SELECT
          $1,
          permission_id
        FROM public.permissions
        WHERE permission_id = ANY($2::uuid[])
        ON CONFLICT (role_id, permission_id) DO NOTHING
        `,
        [roleId, permissionIds]
      );
    }

    await db.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "Role permissions updated successfully",
    });
  } catch (error: any) {
    if (transactionStarted) {
      await db.query("ROLLBACK");
    }

    console.error("PATCH ROLE PERMISSIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to update role permissions",
      },
      { status: 500 }
    );
  }
}