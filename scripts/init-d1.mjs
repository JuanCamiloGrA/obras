import { readFile } from "node:fs/promises";
import path from "node:path";

const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_D1_API_TOKEN } = process.env;

if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_D1_DATABASE_ID || !CLOUDFLARE_D1_API_TOKEN) {
  console.error("Faltan variables CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID o CLOUDFLARE_D1_API_TOKEN.");
  process.exit(1);
}

const schemaPath = path.join(process.cwd(), "db", "schema.sql");
const schema = await readFile(schemaPath, "utf8");
const statements = schema
  .split(/;\s*\n/g)
  .map((statement) => statement.trim())
  .filter(Boolean);

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}/query`;

for (const statement of statements) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CLOUDFLARE_D1_API_TOKEN}`,
    },
    body: JSON.stringify({ sql: statement }),
  });

  const payload = await response.json();

  if (!response.ok || !payload?.success || !payload?.result?.[0]?.success) {
    console.error("No se pudo ejecutar el esquema en D1.");
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }
}

console.log("Esquema aplicado en D1.");
