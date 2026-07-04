require("dotenv/config");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const nodeCrypto = require("crypto");
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function encrypt(text) {
  const key = (process.env.ENCRYPTION_KEY || "").trim();

  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 32 characters! Current length: ${key.length}`,
    );
  }

  const iv = nodeCrypto.randomBytes(IV_LENGTH);
  const cipher = nodeCrypto.createCipheriv(
    ALGORITHM,
    Buffer.from(key, "utf8"),
    iv,
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");
const SEED_TABLES = ["industry", "branch", "role", "users"];

const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

function parseMigration(content) {
  const upMatch = content.match(/--\s*UP\b([\s\S]*?)(?=--\s*DOWN\b|$)/i);
  const downMatch = content.match(/--\s*DOWN\b([\s\S]*?)$/i);

  return {
    up: upMatch ? upMatch[1].trim() : "",
    down: downMatch ? downMatch[1].trim() : "",
  };
}

async function getAppliedMigrations(client) {
  const res = await client.query("SELECT name FROM _migrations ORDER BY name");
  return new Set(res.rows.map((r) => r.name));
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function migrateUp(client) {
  await client.query(CREATE_MIGRATIONS_TABLE);

  const applied = await getAppliedMigrations(client);
  const files = getMigrationFiles();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("No pending migrations.");
  } else {
    for (const file of pending) {
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      const { up } = parseMigration(content);

      if (!up) {
        console.warn(`  SKIP ${file} (no UP section)`);
        continue;
      }

      console.log(`  APPLY ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(up);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log(`Applied ${pending.length} migration(s).`);
    console.log(`\nAdmin user created`);
    console.log(`Email: admin@company.com`);
    console.log(`Password: 123456`);
  }
}

async function migrateDown(client) {
  await client.query(CREATE_MIGRATIONS_TABLE);

  const res = await client.query(
    "SELECT name FROM _migrations ORDER BY name DESC LIMIT 1",
  );

  if (res.rows.length === 0) {
    console.log("No migrations to revert.");
    return;
  }

  const lastMigration = res.rows[0].name;
  const filePath = path.join(MIGRATIONS_DIR, lastMigration);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${lastMigration}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const { down } = parseMigration(content);

  if (!down) {
    throw new Error(`No DOWN section in ${lastMigration}`);
  }

  console.log(`  REVERT ${lastMigration}`);
  await client.query("BEGIN");
  try {
    await client.query(down);
    await client.query("DELETE FROM _migrations WHERE name = $1", [
      lastMigration,
    ]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }

  console.log("Reverted 1 migration.");
}

async function showStatus(client) {
  await client.query(CREATE_MIGRATIONS_TABLE);

  const applied = await getAppliedMigrations(client);
  const files = getMigrationFiles();

  console.log("\nMigration status:\n");
  for (const file of files) {
    const status = applied.has(file) ? "APPLIED" : "PENDING";
    console.log(`  [${status}] ${file}`);
  }
  console.log();
}

async function fetchSchema(client) {
  const tablesRes = await client.query(`
    SELECT table_schema, table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name != '_migrations'
    ORDER BY table_name
  `);

  const columnsRes = await client.query(`
    SELECT table_schema, table_name, column_name, data_type,
           is_nullable, column_default, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name != '_migrations'
    ORDER BY table_name, ordinal_position
  `);

  const constraintsRes = await client.query(`
    SELECT
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns,
      ccu.table_name AS foreign_table,
      array_agg(ccu.column_name ORDER BY kcu.ordinal_position)
        FILTER (WHERE tc.constraint_type = 'FOREIGN KEY') AS foreign_columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
      AND tc.constraint_type = 'FOREIGN KEY'
    WHERE tc.table_schema = 'public' AND tc.table_name != '_migrations'
    GROUP BY tc.table_schema, tc.table_name, tc.constraint_name,
             tc.constraint_type, ccu.table_name
    ORDER BY tc.table_name, tc.constraint_name
  `);

  const indexesRes = await client.query(`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename != '_migrations'
    ORDER BY tablename, indexname
  `);

  const columnsByKey = new Map();
  for (const row of columnsRes.rows) {
    const key = `${row.table_schema}.${row.table_name}`;
    if (!columnsByKey.has(key)) columnsByKey.set(key, []);
    columnsByKey.get(key).push({
      name: row.column_name,
      type: row.data_type === "USER-DEFINED" ? row.udt_name : row.data_type,
      nullable: row.is_nullable === "YES",
      defaultValue: row.column_default,
    });
  }

  const constraintsByKey = new Map();
  for (const row of constraintsRes.rows) {
    const key = `${row.table_schema}.${row.table_name}`;
    if (!constraintsByKey.has(key)) constraintsByKey.set(key, []);

    const columns = Array.isArray(row.columns)
      ? row.columns
      : row.columns
        ? row.columns.replace(/[{}]/g, "").split(",")
        : [];

    const foreignColumns = Array.isArray(row.foreign_columns)
      ? row.foreign_columns
      : row.foreign_columns
        ? row.foreign_columns.replace(/[{}]/g, "").split(",")
        : [];

    constraintsByKey.get(key).push({
      name: row.constraint_name,
      type: row.constraint_type,
      columns,
      foreignTable: row.foreign_table,
      foreignColumns,
    });
  }

  const indexesByKey = new Map();
  for (const row of indexesRes.rows) {
    const key = `${row.schemaname}.${row.tablename}`;
    if (!indexesByKey.has(key)) indexesByKey.set(key, []);
    indexesByKey.get(key).push({
      name: row.indexname,
      definition: row.indexdef,
    });
  }

  return tablesRes.rows.map((row) => {
    const key = `${row.table_schema}.${row.table_name}`;
    return {
      schema: row.table_schema,
      name: row.table_name,
      type: row.table_type,
      columns: columnsByKey.get(key) || [],
      constraints: constraintsByKey.get(key) || [],
      indexes: indexesByKey.get(key) || [],
    };
  });
}

function showSchema(tables) {
  console.log(`\nDatabase schema: ${tables.length} relation(s)\n`);

  for (const table of tables) {
    const label = table.type === "BASE TABLE" ? "TABLE" : "VIEW";
    console.log(`${label} ${table.schema}.${table.name}`);

    if (table.columns.length > 0) {
      console.log("  Columns:");
      for (const col of table.columns) {
        const nullable = col.nullable ? "NULL" : "NOT NULL";
        const def = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : "";
        console.log(`    ${col.name}  ${col.type}  ${nullable}${def}`);
      }
    }

    if (table.constraints.length > 0) {
      console.log("  Constraints:");
      for (const c of table.constraints) {
        if (c.type === "FOREIGN KEY") {
          console.log(
            `    ${c.name}  ${c.type} (${c.columns.join(", ")}) -> ${c.foreignTable}(${c.foreignColumns.join(", ")})`,
          );
        } else {
          console.log(`    ${c.name}  ${c.type} (${c.columns.join(", ")})`);
        }
      }
    }

    if (table.indexes.length > 0) {
      console.log("  Indexes:");
      for (const idx of table.indexes) {
        console.log(`    ${idx.name}  ${idx.definition}`);
      }
    }

    console.log();
  }
}

function sortByDependency(tables) {
  const tableMap = new Map();
  const dependencies = new Map();

  for (const table of tables) {
    tableMap.set(table.name, table);
    dependencies.set(table.name, new Set());
  }

  for (const table of tables) {
    for (const constraint of table.constraints) {
      if (constraint.type === "FOREIGN KEY" && constraint.foreignTable) {
        if (tableMap.has(constraint.foreignTable)) {
          dependencies.get(table.name).add(constraint.foreignTable);
        }
      }
    }
  }

  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(name) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      console.warn(`Circular dependency detected: ${name}`);
      return;
    }

    visiting.add(name);
    for (const dep of dependencies.get(name)) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);

    const table = tableMap.get(name);
    if (table) sorted.push(table);
  }

  for (const table of tables) {
    visit(table.name);
  }

  return sorted;
}

function generateCreateSQL(tables) {
  const statements = [];
  const sortedTables = sortByDependency(tables);

  for (const table of sortedTables) {
    if (table.type !== "BASE TABLE") continue;

    const lines = [];

    for (const col of table.columns) {
      let line = `  ${col.name} ${col.type}`;
      if (!col.nullable) line += " NOT NULL";
      if (col.defaultValue) line += ` DEFAULT ${col.defaultValue}`;
      lines.push(line);
    }

    for (const c of table.constraints) {
      if (c.type === "PRIMARY KEY") {
        lines.push(
          `  CONSTRAINT ${c.name} PRIMARY KEY (${c.columns.join(", ")})`,
        );
      } else if (c.type === "UNIQUE") {
        lines.push(`  CONSTRAINT ${c.name} UNIQUE (${c.columns.join(", ")})`);
      } else if (c.type === "FOREIGN KEY") {
        lines.push(
          `  CONSTRAINT ${c.name} FOREIGN KEY (${c.columns.join(", ")}) REFERENCES ${c.foreignTable}(${c.foreignColumns.join(", ")})`,
        );
      }
    }

    statements.push(`CREATE TABLE ${table.name} (\n${lines.join(",\n")}\n);`);
  }

  for (const table of sortedTables) {
    for (const idx of table.indexes) {
      if (!idx.definition.includes("UNIQUE")) {
        statements.push(`${idx.definition};`);
      }
    }
  }

  return statements.join("\n\n");
}

function generateDropSQL(tables) {
  const drops = [];
  const sortedTables = sortByDependency(tables);
  const reversed = [...sortedTables].reverse();

  for (const table of reversed) {
    if (table.type === "BASE TABLE") {
      drops.push(`DROP TABLE IF EXISTS ${table.name};`);
    }
  }

  return drops.join("\n");
}

async function fetchTableData(client, tableName) {
  const res = await client.query(`SELECT * FROM ${tableName}`);
  return res.rows;
}

function generateInsertSQL(tableName, rows) {
  if (rows.length === 0) return "";

  const statements = [];
  for (const row of rows) {
    const columns = Object.keys(row);
    const values = columns.map((col) => {
      const val = row[col];
      if (val === null) return "NULL";
      if (typeof val === "number") return String(val);
      if (typeof val === "boolean") return val ? "true" : "false";
      return `'${String(val).replace(/'/g, "''")}'`;
    });
    statements.push(
      `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")});`,
    );
  }
  return statements.join("\n");
}

async function exportSchemaToFile(client, tables, outputPath) {
  const upParts = [generateCreateSQL(tables)];

  for (const tableName of SEED_TABLES) {
    const tableExists = tables.find((t) => t.name === tableName);
    if (tableExists) {
      const rows = await fetchTableData(client, tableName);
      const insertSQL = generateInsertSQL(tableName, rows);
      if (insertSQL) {
        upParts.push(`\n${insertSQL}`);
      }
    }
  }

  const upSQL = upParts.join("\n");
  const downSQL = generateDropSQL(tables);

  const content = `-- UP\n${upSQL}\n\n-- DOWN\n${downSQL}\n`;

  fs.writeFileSync(outputPath, content, "utf-8");
  console.log(`Schema exported to: ${outputPath}`);
}

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function promptAsync(rl, question) {
  return new Promise((resolve) => {
    rl.question(question + ": ", (answer) => {
      resolve(answer.trim());
    });
  });
}

function promptHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question + ": ");

    const stdin = process.stdin;
    let input = "";

    const wasRaw = stdin.isRaw;
    const wasPaused = stdin.isPaused();

    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }

    if (wasPaused) {
      stdin.resume();
    }

    const onData = (chunk) => {
      const str = chunk.toString("utf-8");

      for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (char === "\r" || char === "\n") {
          if (stdin.setRawMode) {
            stdin.setRawMode(wasRaw || false);
          }
          if (!wasPaused) {
            stdin.pause();
          }

          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(input);
          return;
        } else if (char === "\u0003") {
          process.exit(0);
        } else if (char === "\u007f" || char === "\b") {
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else if (char >= " ") {
          input += char;
        }
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  const command = process.argv[2] || "up";

  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  if (!connectionString || connectionString.includes("undefined")) {
    console.error("ERROR: Database connection not configured.");
    console.error(
      "Set either DATABASE_URL or DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT in .env",
    );
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();

    switch (command) {
      case "up":
        await migrateUp(client);
        break;
      case "down":
        await migrateDown(client);
        break;
      case "status":
        await showStatus(client);
        break;
      case "schema":
        const tables = await fetchSchema(client);
        showSchema(tables);
        break;
      case "export":
        const schema = await fetchSchema(client);
        const filename = process.argv[3] || `000_export_schema.sql`;
        const outputPath = path.join(MIGRATIONS_DIR, filename);
        if (!fs.existsSync(MIGRATIONS_DIR)) {
          fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
        }
        await exportSchemaToFile(client, schema, outputPath);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error(
          "Usage: migrate <up|down|status|schema|export [filename]>",
        );
        process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
