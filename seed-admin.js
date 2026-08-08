require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/db');
const { ROLES } = require('./utils/helpers');

(async () => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const gmail = process.env.ADMIN_GMAIL || 'admin@gmail.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hash = await bcrypt.hash(password, 10);

  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  if (rows.length) {
    await pool.query('UPDATE users SET gmail=?, role=?, password_hash=?, active=1 WHERE username=?', [gmail, ROLES.ADMIN, hash, username]);
    console.log(`Admin updated: ${username}`);
  } else {
    await pool.query('INSERT INTO users (username, gmail, role, password_hash, active) VALUES (?, ?, ?, ?, 1)', [username, gmail, ROLES.ADMIN, hash]);
    console.log(`Admin created: ${username}`);
  }
  console.log(`Password: ${password}`);
  await pool.end();
})().catch(async (err) => { console.error(err); try { await pool.end(); } catch {} process.exit(1); });
