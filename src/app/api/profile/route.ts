import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PermissionUser } from "@/lib/rbac";

// ==========================================
// GET PROFILE
// ==========================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("SESSION:", session);

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

    const result = await db.query(
      `
      SELECT 
        user_id,
        user_name,
        user_email
      FROM public.users
      WHERE user_id = $1
      LIMIT 1
      `,
      [currentUser.user_id]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("GET PROFILE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// ==========================================
// UPDATE PROFILE
// ==========================================
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log("SESSION:", session);
    
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
      username,
      email,
    } = body;

    if (!username?.trim() || !email?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Username and email are required",
        },
        {
          status: 400,
        }
      );
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    const usernameCheck = await db.query(
      `
      SELECT 1
      FROM public.users
      WHERE user_name = $1
      AND user_id <> $2
      `,
      [cleanUsername, currentUser.user_id]
    );

    if (usernameCheck.rowCount && usernameCheck.rowCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Username already exists",
        },
        {
          status: 400,
        }
      );
    }

    const emailCheck = await db.query(
      `
      SELECT 1
      FROM public.users
      WHERE user_email = $1
      AND user_id <> $2
      `,
      [cleanEmail, currentUser.user_id]
    );

    if (emailCheck.rowCount && emailCheck.rowCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Email already exists",
        },
        {
          status: 400,
        }
      );
    }

    const updateResult = await db.query(
      `
      UPDATE public.users
      SET
        user_name = $1,
        user_email = $2
      WHERE user_id = $3
      `,
      [
        cleanUsername,
        cleanEmail,
        currentUser.user_id,
      ]
    );

    if (updateResult.rowCount === 0) {
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

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("UPDATE PROFILE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}