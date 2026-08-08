LIBRARY MANAGEMENT SYSTEM - RAILWAY READY

This archive is flattened for direct upload to the ROOT of your GitHub repository.

Expected repository root:
package.json
server.js
schema.sql
railway.json
public/
routes/
config/
middleware/
utils/

Railway:
- Root Directory: /
- Build: npm install (or automatic Nixpacks detection)
- Start: npm start

Do NOT upload .env. Use Railway Variables for database credentials and JWT_SECRET.

For MySQL, run schema.sql in the provisioned MySQL database, then set:
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
JWT_SECRET
PORT (Railway normally supplies PORT)

Default seed admin:
Username: admin
Email: admin@gmail.com
Password: Admin@123
Change the password after first login.
