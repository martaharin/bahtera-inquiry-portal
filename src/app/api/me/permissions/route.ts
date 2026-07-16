import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getPermissionKeysBySessionUser,
  getPermissionsBySessionUser,
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
        }
      );
    }

    console.log("SESSION USER:", session.user);

    const permissions = await getPermissionKeysBySessionUser(session.user);
    const permissionDetails = await getPermissionsBySessionUser(session.user);

    return NextResponse.json({
      success: true,
      permissions,
      permissionDetails,
    });
  } catch (error: any) {
    console.error("GET ME PERMISSIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to get permissions",
      },
      {
        status: 500,
      }
    );
  }
}