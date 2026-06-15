import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // CHECK ROLE
    const role = request.cookies.get("role")?.value;

    if (role !== "Admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    console.log("BODY:", body);

    const {
    name,
    email,
    password,
    role: selectedRole,
    } = body;

    // VALIDATION
    if (!name || !email || !password || !selectedRole) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        { status: 400 }
      );
    }

    // CHECK EMAIL EXIST
    const existingUser = await db.query(
      `
      SELECT user_id
      FROM users
      WHERE user_email = $1
      `,
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Email already exists",
        },
        { status: 400 }
      );
    }

    // INSERT USER
    await db.query(
      `
      INSERT INTO users
      (
        user_name,
        user_email,
        password,
        role_id
      )
      VALUES ($1, $2, $3, $4)
      `,
      [name, email, password, selectedRole]
    );

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
    });

  } catch (error: any) {
    console.error("CREATE ACCOUNT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}