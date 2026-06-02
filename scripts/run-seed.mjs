/**
 * Executa o seed SQL no banco Supabase cloud via Management API.
 *
 * Uso:
 *   SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=xxx node scripts/run-seed.mjs
 *
 * Variáveis obrigatórias:
 *   SUPABASE_ACCESS_TOKEN  — Personal Access Token do Supabase
 *   SUPABASE_PROJECT_REF   — Ref do projeto (encontrado na URL do dashboard)
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN       = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

if (!TOKEN)       { console.error('❌ SUPABASE_ACCESS_TOKEN não definida.'); process.exit(1); }
if (!PROJECT_REF) { console.error('❌ SUPABASE_PROJECT_REF não definida.');  process.exit(1); }

const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const seedPath = join(__dirname, '..', 'supabase', 'seed', 'seed.sql');
const sql = readFileSync(seedPath, 'utf8');

async function run() {
  console.log('🌱 Executando seed no Supabase cloud...');
  console.log(`   Endpoint: ${API}`);
  console.log(`   Seed size: ${sql.length} chars\n`);

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await res.text();

  if (!res.ok) {
    console.error('❌ Falha na execução do seed:');
    console.error(`   Status: ${res.status}`);
    console.error(`   Body: ${body.slice(0, 500)}`);
    process.exit(1);
  }

  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = body; }

  if (Array.isArray(parsed) && parsed.length === 0) {
    console.log('✅ Seed executado com sucesso (retorno vazio = operações DML/DDL).');
  } else if (typeof parsed === 'object' && parsed !== null && parsed.message) {
    console.error('❌ Erro Supabase:', parsed.message);
    process.exit(1);
  } else {
    console.log('✅ Seed executado:', JSON.stringify(parsed).slice(0, 200));
  }
}

run().catch(err => {
  console.error('❌ Erro inesperado:', err.message);
  process.exit(1);
});
