// Aplica la migracion de la tabla smf_transactions a Supabase usando acceso
// directo a Postgres (rol propietario). Uso unico de arranque; no se ejecuta en
// produccion ni se versiona ninguna credencial aqui.
//
//   DATABASE_URL="postgresql://..." node scripts/migrate.mjs
import pg from "pg";

const DSN = process.env.DATABASE_URL;
if (!DSN) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const stmts = [
  `create table if not exists public.smf_transactions (
     id text primary key,
     device_id text not null,
     kind text not null check (kind in ('income','expense')),
     amount numeric(12,2) not null check (amount >= 0),
     category text,
     counterparty text,
     raw_text text,
     occurred_on date not null default current_date,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   )`,
  `create index if not exists smf_transactions_device_idx
     on public.smf_transactions (device_id, created_at desc)`,
  `alter table public.smf_transactions enable row level security`,
  `drop policy if exists smf_demo_anon_rw on public.smf_transactions`,
  `create policy smf_demo_anon_rw on public.smf_transactions
     for all to anon, authenticated using (true) with check (true)`
];

const client = new pg.Client({
  connectionString: DSN,
  ssl: { rejectUnauthorized: false }
});
await client.connect();
try {
  for (const q of stmts) {
    await client.query(q);
    console.log("ok:", q.slice(0, 60).replace(/\s+/g, " "));
  }
  const { rows } = await client.query(
    `select count(*)::int as n from public.smf_transactions`
  );
  console.log("filas actuales:", rows[0].n);
} finally {
  await client.end();
}
