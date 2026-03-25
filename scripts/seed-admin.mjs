// Quick admin seeder - run with: node --input-type=module scripts/seed-admin.mjs
// This uses the api-server's node_modules for dependencies
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || 'drtravel2024';
const displayName = process.env.ADMIN_DISPLAY_NAME || 'مدير النظام';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

try {
  const existing = await pool.query('SELECT id FROM admin_users WHERE username = $1', [username]);
  
  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE admin_users SET password_hash = $1, display_name = $2, is_active = true, updated_at = NOW() WHERE username = $3',
      [passwordHash, displayName, username]
    );
    console.log(`✅ Admin '${username}' updated`);
  } else {
    await pool.query(
      'INSERT INTO admin_users (username, password_hash, display_name, email, is_active) VALUES ($1, $2, $3, $4, true)',
      [username, passwordHash, displayName, '']
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
