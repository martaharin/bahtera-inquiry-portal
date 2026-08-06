require("dotenv/config");
const { Pool } = require("pg");

// Verified via information_schema: identical column sets on source (DB_ORI) and
// destination (DB_NAME) for all four tables. UUIDs are preserved so the
// chat_messages -> chat_sessions, inquiry -> chat_sessions, and
// ticket -> inquiry relationships stay intact.

const TABLES = [
  { name: "chat_sessions", pk: "id", cols: ["id","created_at","updated_at","extraction_status","ip_address"] },
  { name: "chat_messages", pk: "id", cols: ["id","session_id","role","content","created_at","is_spam"] },
  { name: "inquiry",       pk: "inquiry_id", cols: ["inquiry_id","created_at","name","email","phone","company","location","industry","industry_scale","product_inquiry","reason_for_inquiry","consent_to_contact","updated_at","type","session_id"] },
  { name: "ticket",        pk: "ticket_id", cols: ["ticket_id","inquiry_id","assigned_user_id","created_at","updated_at","closed_at","status","converted_to_erp"] },
];

const srcPool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_ORI || "postgres", // SOURCE
});

const dstPool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "new",    // DEST
});

// ticket.assigned_user_id references source-only users (12 src users vs 5 dest
// users, 0 resolvable). MIGRATE_NULL_ASSIGN controls assignment handling:
//  - "B" (default) -> NULL the assignments (clean, tickets land unassigned)
//  - "A"           -> preserve assigned_user_id as-is (will be orphaned in dest)
const NULL_ASSIGN = (process.env.MIGRATE_NULL_ASSIGN || "B") === "B";

async function copyTable(t) {
  const src = await srcPool.connect();
  const dst = await dstPool.connect();
  let total = 0, inserted = 0, skipped = 0;

  try {
    await dst.query("BEGIN");

    const colList = t.cols.map((c) => '"' + c + '"').join(",");
    const placeholders = t.cols.map((_, i) => "$" + (i + 1)).join(",");

    const res = await src.query(
      `SELECT ${colList} FROM ${t.name} ORDER BY created_at`,
    );

    for (const row of res.rows) {
      const values = t.cols.map((c) => {
        if (NULL_ASSIGN && t.name === "ticket" && c === "assigned_user_id") {
          return null;
        }
        return row[c];
      });

      const r = await dst.query(
        `INSERT INTO ${t.name} (${colList}) VALUES (${placeholders}) ON CONFLICT (${t.pk}) DO NOTHING`,
        values,
      );

      if (r.rowCount > 0) inserted++;
      else skipped++;
      total++;
    }

    await dst.query("COMMIT");
    console.log(`[${t.name}] total=${total} inserted=${inserted} skipped=${skipped}`);
  } catch (e) {
    await dst.query("ROLLBACK");
    console.error(`[${t.name}] FAILED: ${e.message}`);
    throw e;
  } finally {
    src.release();
    dst.release();
  }
}

(async () => {
  try {
    console.log(
      `Migrating chat_sessions -> chat_messages -> inquiry -> ticket` +
        ` (NULL_ASSIGN=${NULL_ASSIGN ? "B" : "A"})...`,
    );
    for (const t of TABLES) {
      await copyTable(t);
    }
    console.log("Migration complete.");
  } catch (e) {
    console.error("MIGRATION ABORTED:", e.message);
  } finally {
    await srcPool.end();
    await dstPool.end();
  }
})();
