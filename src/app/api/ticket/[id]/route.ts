import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PermissionUser, canEditTicket, canDeleteTicket, canConvertERP,canViewTicket} from "@/lib/rbac";
import { updateAnalyticsFromTicket } from "@/lib/analytics/updateAnalyticsFromTicket";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUser: PermissionUser = {
      user_id: session.user.user_id,
      role_name: session.user.role_name,
      industry: session.user.industry,
      branch: session.user.branch,
    };

    const { id } = await params;
      if (!id) {

        return NextResponse.json(

          { success: false, error: "Ticket ID is missing from the request parameters" },

          { status: 400 }

        );
      }

    const result = await db.query(
      `
      SELECT 
        i.inquiry_id,
        i.name,
        i.email,
        i.phone,
        i.company,
        i.location,
        i.industry,
        i.reason_for_inquiry,
        i.product_inquiry,
        i.consent_to_contact,
        i.session_id,
        i.type AS type,
        t.ticket_id,
        t.status,
        t.assigned_user_id,
        t.created_at,
        t.converted_to_erp,
        u.user_name AS assigned_to,
        sp.industry AS assigned_industry,
        sp.branch AS assigned_branch
      FROM public.inquiry i
      LEFT JOIN public.ticket t ON i.inquiry_id = t.inquiry_id
      LEFT JOIN public."users" u ON t.assigned_user_id = u.user_id
      LEFT JOIN public.sales_person sp ON t.assigned_user_id = sp.user_id
      WHERE i.inquiry_id = $1 OR t.ticket_id = $1
      LIMIT 1
      `,
      [id]
    );

    const row = result.rows[0];

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Ticket tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      !canViewTicket(
        currentUser,
        row.assigned_user_id,
        row.assigned_industry,
        row.assigned_branch
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    let chatMessages = [];
    if (row.session_id) {
      const chatResult = await db.query(
        `
        SELECT role, content 
        FROM public.chat_messages 
        WHERE session_id = $1 
        ORDER BY created_at ASC
        `,
        [row.session_id]
      );
      chatMessages = chatResult?.rows || [];
    }

    return NextResponse.json({
      success: true,
      data: row,
      chatMessages: chatMessages
    });

  } catch (error: any) {
    console.error("DETAIL TICKET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUser: PermissionUser = {
      user_id: session.user.user_id,
      role_name: session.user.role_name,
      industry: session.user.industry,
      branch: session.user.branch,
    };

    const { id } = await params;
    const ticketId = id;
    
    const ticketCheck = await db.query(
      `
      SELECT
        inquiry_id,
        status,
        assigned_user_id
      FROM public.ticket
      WHERE ticket_id = $1
      LIMIT 1
      `,
      [ticketId]
    );

    const existingTicket = ticketCheck.rows[0];
    if (!existingTicket) {
      return NextResponse.json(
        {
          success: false,
          error: "Ticket not found",
        },
        {
          status: 404,
        }
      );
    }
    if (
      !canEditTicket(
        currentUser,
        existingTicket.assigned_user_id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const body = await req.json();
    const {
      status,
      assigned_user_id,
      name,
      email,
      phone,
      location,
      company,
      industry,
    } = body;

    // FIXED ERROR INTEGER: Validasi input data status agar tidak mengirim string kosong "" ke PostgreSQL
    const finalStatus = (status !== undefined && status !== "" && !isNaN(Number(status))) 
      ? Number(status) 
      : existingTicket.status;

    const finalAssignedId =
      assigned_user_id?.trim() || null;
    
    await db.query(
      `UPDATE public.ticket 
      SET 
      status = $1, 
      assigned_user_id = $2, 
      updated_at = NOW()
      WHERE ticket_id = $3
      `,
      [finalStatus, finalAssignedId, ticketId]
    );

    await updateAnalyticsFromTicket(ticketId);

    await db.query(
      `
      UPDATE public.inquiry 
      SET name = $1, email = $2, phone = $3, location = $4, company = $5, industry = $6
      WHERE inquiry_id = $7
      `,
      [
        name || "", 
        email || "", 
        phone || "", 
        location || "", 
        company || "", 
        industry || "", 
        existingTicket.inquiry_id
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Ticket updated successfully",
    });

  } catch (error: any) {
    console.error("PUT TICKET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update ticket" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const ticketId = id;

    const ticketCheck = await db.query(
      `
      SELECT assigned_user_id
      FROM public.ticket
      WHERE ticket_id = $1
      LIMIT 1
      `,
      [ticketId]
    );

    const existingTicket = ticketCheck.rows[0];

    if (!existingTicket) {
      return NextResponse.json(
        {
          success: false,
          error: "Ticket not found",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !canConvertERP(
        currentUser,
        existingTicket.assigned_user_id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const body = await req.json();
    const { converted_to_erp } = body;

    const result = await db.query(
      `
      UPDATE public.ticket
      SET 
      converted_to_erp = $1,
      updated_at = NOW()
      WHERE ticket_id = $2
      RETURNING *
      `,
      [converted_to_erp, ticketId]
    );
      await updateAnalyticsFromTicket(ticketId);

    return NextResponse.json({ 
      success: true, data: result.rows[0] 
    });

  } catch (error: any) {
    console.error("PATCH ERP ERROR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update ERP conversion" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = id;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUser: PermissionUser = {
      user_id: session.user.user_id,
      role_name: session.user.role_name,
      industry: session.user.industry,
      branch: session.user.branch,
    };

    if (!canDeleteTicket(currentUser)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const ticketCheck = await db.query(
      `SELECT inquiry_id FROM public.ticket WHERE ticket_id = $1 LIMIT 1`,
      [ticketId]
    );

    const existingTicket = ticketCheck?.rows?.[0];
    if (!existingTicket) {
      return NextResponse.json({ success: false, error: "Ticket tidak ditemukan" }, { status: 404 });
    }

    await db.query(`DELETE FROM public.ticket WHERE ticket_id = $1`, [ticketId]);
    await db.query(`DELETE FROM public.inquiry WHERE inquiry_id = $1`, [existingTicket.inquiry_id]);

    return NextResponse.json({
      success: true,
      message: "Ticket deleted successfully.",
    });

  } catch (error: any) {
    console.error("DELETE TICKET ERROR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete data" },
      { status: 500 }
    );
  }
}