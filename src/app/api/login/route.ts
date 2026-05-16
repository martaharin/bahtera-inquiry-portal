import { dbQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = body.email?.trim();
    const password = body.password;

    console.log("LOGIN REQUEST RAW:", body);
    console.log("EMAIL AFTER TRIM:", `[${email}]`);

    const result = await dbQuery(
      `SELECT u.*
       FROM users u 
       WHERE LOWER(u.user_email) = LOWER('admin@company.com')`,
      // [email]
    );

    console.log("QUERY RESULT ROWS:", result);

    const user = result.rows[0];

    console.log("USER FOUND:", user);

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 401 }
      );
    }

    if (user.password?.trim() !== password?.trim()) {
      return NextResponse.json(
        { error: "Password salah" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: "Login Berhasil",
      user: {
        id: user.user_id,
        name: user.user_name,
        role: user.role_name || "No Role",
      },
    });

  } catch (error: any) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}