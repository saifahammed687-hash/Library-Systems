const router = require("express").Router();
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const db = require("../config/db");

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "student" } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required" });
    const allowed = ["student", "teacher"];
    const safeRole = allowed.includes(role) ? role : "student";
    const [exists] = await db.query("SELECT id FROM users WHERE email=?", [email]);
    if (exists.length) return res.status(409).json({ error: "Email already registered" });
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)", [name,email,hash,safeRole]);
    req.session.user = { id: r.insertId, name, email, role: safeRole };
    res.json({ user: req.session.user });
  } catch(e) { console.error(e); res.status(500).json({ error: "Registration failed" }); }
});

router.post("/login", async (req,res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE email=? AND status='active'", [email]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ error: "Invalid email or password" });
    const u = rows[0];
    req.session.user = { id:u.id, name:u.name, email:u.email, role:u.role };
    res.json({ user:req.session.user });
  } catch(e) { console.error(e); res.status(500).json({ error:"Login failed" }); }
});

router.post("/logout", (req,res) => req.session.destroy(() => res.json({ ok:true })));
router.get("/me", (req,res) => res.json({ user:req.session.user || null }));
module.exports = router;
