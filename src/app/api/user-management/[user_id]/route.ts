import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getPermissionKeysBySessionUser,
  hasPermission,
} from "@/lib/permissions";

// ==========================================
// GET USER DETAIL
// ==========================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "user.view")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const { user_id } = await params;

    if (!user_id) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      SELECT
        u.user_id,
        u.user_name,
        u.user_email,
        COALESCE(sp.role_name, r.role_name) AS role_name,
        sp.industry,
        sp.branch
      FROM public.users u
      LEFT JOIN public.role r
        ON u.role_id = r.role_id
      LEFT JOIN public.sales_person sp
        ON u.user_id = sp.user_id
      WHERE u.user_id = $1
      LIMIT 1
      `,
      [user_id]
    );

    if (result.rowCount === 0) {
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
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error("GET USER DETAIL ERROR:", error);

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
// UPDATE USER
// ==========================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  let transactionStarted = false;

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "user.edit")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const { user_id } = await params;

    if (!user_id) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const { username, email, role_name, industry, branch } = body;

    if (!username || !email || !role_name || !industry || !branch) {
      return NextResponse.json(
        {
          success: false,
          error: "All fields are required",
        },
        { status: 400 }
      );
    }

    // Ambil role_id dari role_name karena frontend edit kirim role_name.
    const roleResult = await db.query(
      `
      SELECT
        role_id,
        role_name
      FROM public.role
      WHERE LOWER(TRIM(role_name)) = LOWER(TRIM($1))
      LIMIT 1
      `,
      [role_name]
    );

    if (roleResult.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected role is not valid",
        },
        { status: 400 }
      );
    }

    const selectedRoleId = roleResult.rows[0].role_id;
    const selectedRoleName = roleResult.rows[0].role_name;

    // Validasi branch + industry harus sesuai table branch_industry.
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
      [branch, industry]
    );

    if (branchIndustryCheck.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid branch and industry combination",
        },
        { status: 400 }
      );
    }

    await db.query("BEGIN");
    transactionStarted = true;

    const updateUserResult = await db.query(
      `
      UPDATE public.users
      SET
        user_name = $1,
        user_email = $2,
        role_id = $3
      WHERE user_id = $4
      RETURNING user_id
      `,
      [username, email, selectedRoleId, user_id]
    );

    if (updateUserResult.rowCount === 0) {
      await db.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    const updateSalesPersonResult = await db.query(
      `
      UPDATE public.sales_person
      SET
        role_name = $1,
        industry = $2,
        branch = $3,
        user_name = $4
      WHERE user_id = $5
      RETURNING user_id
      `,
      [selectedRoleName, industry, branch, username, user_id]
    );

    if (updateSalesPersonResult.rowCount === 0) {
      await db.query(
        `
        INSERT INTO public.sales_person
        (
          user_id,
          role_name,
          industry,
          branch,
          user_name
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [user_id, selectedRoleName, industry, branch, username]
      );
    }

    await db.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error: any) {
    if (transactionStarted) {
      await db.query("ROLLBACK");
    }

    console.error("UPDATE USER ERROR:", error);

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
// DELETE USER
// ==========================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  let transactionStarted = false;

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "user.delete")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const { user_id } = await params;

    if (!user_id) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 }
      );
    }

    await db.query("BEGIN");
    transactionStarted = true;

    await db.query(
      `
      DELETE FROM public.sales_person
      WHERE user_id = $1
      `,
      [user_id]
    );

    const deleteUserResult = await db.query(
      `
      DELETE FROM public.users
      WHERE user_id = $1
      RETURNING user_id
      `,
      [user_id]
    );

    if (deleteUserResult.rowCount === 0) {
      await db.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    await db.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    if (transactionStarted) {
      await db.query("ROLLBACK");
    }

    console.error("DELETE USER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}