// Quick admin seeder - run with: node --input-type=module scripts/seed-admin.mjs
// This uses the api-server's node_modules for dependencies
import { createRequire } from 'module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD;
const role = process.env.ADMIN_ROLE || 'super';
const displayName = process.env.ADMIN_DISPLAY_NAME || 'مدير النظام';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

if (!password || password.length < 8) {
  console.error('ADMIN_PASSWORD must be set and at least 8 characters long');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

try {
  const existing = await pool.query('SELECT id FROM admin_users WHERE username = $1', [username]);
  
  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE admin_users SET password_hash = $1, display_name = $2, role = $3, is_active = true, updated_at = NOW() WHERE username = $4',
      [passwordHash, displayName, role, username]
    );
    console.log(`✅ Admin '${username}' updated`);
  } else {
    await pool.query(
      'INSERT INTO admin_users (username, password_hash, display_name, email, role, is_active) VALUES ($1, $2, $3, $4, $5, true)',
      [username, passwordHash, displayName, '', role]
    );
    console.log(`✅ Admin '${username}' created`);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await pool.end();
  process.exit(0);
}
