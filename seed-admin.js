require("dotenv").config();
const bcrypt=require("bcryptjs");
const db=require("./config/db");
(async()=>{
 const hash=await bcrypt.hash("admin123",10);
 await db.query(`INSERT INTO users(name,email,password_hash,role)
 VALUES('System Administrator','admin@library.local',?,'admin')
 ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),role='admin'`,[hash]);
 console.log("Admin ready: admin@library.local / admin123");
 process.exit();
})().catch(e=>{console.error(e);process.exit(1)});
