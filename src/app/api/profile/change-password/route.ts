import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PermissionUser } from "@/lib/rbac";
import { encrypt, decrypt } from "@/lib/crypto";

// ==========================================
// CHANGE PASSWORD
// ==========================================
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
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

    const currentUser: PermissionUser = {
      user_id: session.user.user_id,
      role_name: session.user.role_name,
      industry: session.user.industry,
      branch: session.user.branch,
    };

    const body = await req.json();

    const {
      currentPassword,
      newPassword,
    } = body;

    if (
      !currentPassword?.trim() ||
      !newPassword?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Current password and new password are required",
        },
        {
          status: 400,
        }
      );
    }

    // Ambil password lama
    const result = await db.query(
      `
      SELECT password
      FROM public.users
      WHERE user_id = $1
      LIMIT 1
      `,
      [currentUser.user_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        {
          status: 404,
        }
      );
    }

    const encryptedPassword = result.rows[0].password;

    // Decrypt password lama
    const originalPassword = decrypt(encryptedPassword);

    // Validasi current password
    if (originalPassword !== currentPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Current password is incorrect",
        },
        {
          status: 400,
        }
      );
    }

    // Cegah password baru sama dengan password lama
    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "New password must be different from the current password",
        },
        {
          status: 400,
        }
      );
    }

    // Encrypt password baru
    const encryptedNewPassword = encrypt(newPassword);

    await db.query(
      `
      UPDATE public.users
      SET password = $1
      WHERE user_id = $2
      `,
      [
        encryptedNewPassword,
        currentUser.user_id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });

  } catch (error: any) {
    console.error("CHANGE PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}