import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getPermissionKeysBySessionUser,
  hasPermission,
} from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const permissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(permissions, "role.view")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    const result = await db.query(`
      SELECT
        r.role_id,
        r.role_name,
        COUNT(rp.permission_id)::int AS total_permissions
      FROM public."role" r
      LEFT JOIN public.role_permissions rp
        ON r.role_id = rp.role_id
      GROUP BY r.role_id, r.role_name
      ORDER BY r.role_name ASC
    `);

    return NextResponse.json({
      success: true,
      roles: result.rows,
    });
  } catch (error: any) {
    console.error("GET ROLES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to get roles",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const permissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(permissions, "role.create")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    const body = await req.json();
    const roleName = String(body.role_name || "")
      .trim()
      .toLowerCase();

    if (!roleName) {
      return NextResponse.json(
        {
          success: false,
          error: "Role name is required",
        },
        {
          status: 400,
        },
      );
    }

    const duplicateCheck = await db.query(
      `
      SELECT role_id
      FROM public."role"
      WHERE LOWER(TRIM(role_name)) = LOWER(TRIM($1::text))
      LIMIT 1
      `,
      [roleName],
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Role already exists",
        },
        {
          status: 409,
        },
      );
    }

    const result = await db.query(
      `
      INSERT INTO public."role"
      (
        role_id,
        role_name
      )
      VALUES
      (
        gen_random_uuid(),
        $1
      )
      RETURNING role_id, role_name
      `,
      [roleName],
    );

    return NextResponse.json({
      success: true,
      role: result.rows[0],
      message: "Role created successfully",
    });
  } catch (error: any) {
    console.error("CREATE ROLE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to create role",
      },
      {
        status: 500,
      },
    );
  }
}
