import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { encrypt } from "@/lib/crypto";
import {
  getPermissionKeysBySessionUser,
  hasPermission,
} from "@/lib/permissions";

export async function POST(request: NextRequest) {
  let transactionStarted = false;

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "user.create")) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      name,
      email,
      password,
      role: selectedRole,
      branches,
      industries,
      branch,
      industry,
    } = body;

    const selectedBranch = Array.isArray(branches)
      ? branches[0]
      : branch;

    const selectedIndustry = Array.isArray(industries)
      ? industries[0]
      : industry;

    if (
      !name ||
      !email ||
      !password ||
      !selectedRole ||
      !selectedBranch ||
      !selectedIndustry
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        { status: 400 }
      );
    }

    const existingUser = await db.query(
      `
      SELECT user_id
      FROM public.users
      WHERE LOWER(TRIM(user_email)) = LOWER(TRIM($1))
      LIMIT 1
      `,
      [email]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Email already exists",
        },
        { status: 400 }
      );
    }

    const roleResult = await db.query(
      `
      SELECT
        role_id,
        role_name
      FROM public.role
      WHERE role_id = $1
      LIMIT 1
      `,
      [selectedRole]
    );

    if (roleResult.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected role is not valid",
        },
        { status: 400 }
      );
    }

    const selectedRoleName = roleResult.rows[0].role_name;

    const branchIndustryCheck = await db.query(
      `
      SELECT
        bi.branch_id,
        bi.industry_id
      FROM public.branch_industry bi
      INNER JOIN public.branch b
        ON bi.branch_id = b.branch_id
      INNER JOIN public.industry i
        ON bi.industry_id = i.industry_id
      WHERE
        LOWER(TRIM(b.branch_name)) = LOWER(TRIM($1))
        AND LOWER(TRIM(i.industry_name)) = LOWER(TRIM($2))
      LIMIT 1
      `,
      [selectedBranch, selectedIndustry]
    );

    if (branchIndustryCheck.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid branch and industry combination",
        },
        { status: 400 }
      );
    }

    const encryptedPassword = encrypt(password);

    await db.query("BEGIN");
    transactionStarted = true;

    const insertUserResult = await db.query(
      `
      INSERT INTO public.users
      (
        user_name,
        user_email,
        password,
        role_id
      )
      VALUES ($1, $2, $3, $4)
      RETURNING user_id
      `,
      [
        name,
        email,
        encryptedPassword,
        selectedRole,
      ]
    );

    const newUserId = insertUserResult.rows[0].user_id;

    await db.query(
      `
      INSERT INTO public.sales_person
      (
        user_id,
        role_name,
        industry,
        branch
      )
      VALUES ($1, $2, $3, $4)
      `,
      [
        newUserId,
        selectedRoleName,
        selectedIndustry,
        selectedBranch,
      ]
    );

    await db.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
    });
  } catch (error: any) {
    if (transactionStarted) {
      await db.query("ROLLBACK");
    }

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