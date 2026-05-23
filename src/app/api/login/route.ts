import { db } from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const result = await db.query(
      `SELECT 
          u.user_id, 
          u.user_name, 
          u.password, 
          r.role_name AS master_role,
          sp.role_name AS sales_role,
          sp.industry,
          sp.branch
       FROM users u 
       JOIN role r ON u.role_id = r.role_id 
       LEFT JOIN sales_person sp ON u.user_id = sp.user_id
       WHERE u.user_email = $1`,
      [email],
    );

    const user = result.rows[0];

    if (user && user.password === password) {
      const finalRoleName = user.sales_role || user.master_role;

      const response = NextResponse.json({
        success: true,
        message: "Login Berhasil",
        user: {
          user_id: user.user_id,
          user_name: user.user_name,
          role_name: finalRoleName,
          industry: user.industry,
          branch: user.branch,
        },
      });

      response.cookies.set("email", email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      response.cookies.set("password", password, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      response.cookies.set("user_id", user.user_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      response.cookies.set("role", finalRoleName, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      return response;
    }

    return NextResponse.json(
      { error: "Email atau Password salah" },
      { status: 401 },
    );
  } catch (error: any) {
    console.error("LOGIN API ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
