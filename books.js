const router = require("express").Router();
const db = require("../config/db");
const { requireLogin, requireRole } = require("../middleware/auth");

router.get("/", async (req,res) => {
  try {
    const q = `%${req.query.q || ""}%`;
    const [rows] = await db.query(
      "SELECT id,title,author,category,isbn,publisher,total_copies,available_copies FROM books WHERE title LIKE ? OR author LIKE ? OR category LIKE ? ORDER BY title",
      [q,q,q]
    );
    res.json(rows);
  } catch(e){ res.status(500).json({error:"Could not load books"}); }
});

router.post("/", requireRole("admin","librarian"), async (req,res) => {
  try {
    const {title,author,category,isbn,publisher,total_copies=1} = req.body;
    const n = Number(total_copies);
    const [r] = await db.query("INSERT INTO books(title,author,category,isbn,publisher,total_copies,available_copies) VALUES(?,?,?,?,?,?,?)",
      [title,author,category,isbn||null,publisher||null,n,n]);
    res.json({id:r.insertId});
  } catch(e){ res.status(500).json({error:"Could not add book"}); }
});

module.exports = router;
