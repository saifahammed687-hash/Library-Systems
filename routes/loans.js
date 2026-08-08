const router = require("express").Router();
const db = require("../config/db");
const { requireLogin, requireRole } = require("../middleware/auth");

router.get("/mine", requireLogin, async (req,res) => {
  try {
    const [rows] = await db.query(`
      SELECT l.id,l.book_id,b.title,l.borrow_date,l.due_date,l.return_date,l.status,l.renew_count,
      CASE WHEN l.return_date IS NULL AND CURDATE()>l.due_date THEN DATEDIFF(CURDATE(),l.due_date)*5 ELSE 0 END AS fine
      FROM loans l JOIN books b ON b.id=l.book_id
      WHERE l.user_id=? ORDER BY l.borrow_date DESC`, [req.session.user.id]);
    res.json(rows);
  } catch(e){ res.status(500).json({error:"Could not load loans"}); }
});

router.post("/borrow/:bookId", requireLogin, async (req,res) => {
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [active] = await c.query("SELECT COUNT(*) c FROM loans WHERE user_id=? AND return_date IS NULL",[req.session.user.id]);
    if (active[0].c >= 5) throw new Error("Maximum 5 active books allowed");
    const [b] = await c.query("SELECT * FROM books WHERE id=? FOR UPDATE",[req.params.bookId]);
    if (!b.length || b[0].available_copies < 1) throw new Error("Book is not available");
    const [dup] = await c.query("SELECT id FROM loans WHERE user_id=? AND book_id=? AND return_date IS NULL",[req.session.user.id,req.params.bookId]);
    if (dup.length) throw new Error("You already borrowed this book");
    await c.query("INSERT INTO loans(user_id,book_id,borrow_date,due_date,status) VALUES(?,?,CURDATE(),DATE_ADD(CURDATE(),INTERVAL 15 DAY),'borrowed')",
      [req.session.user.id,req.params.bookId]);
    await c.query("UPDATE books SET available_copies=available_copies-1 WHERE id=?",[req.params.bookId]);
    await c.commit();
    res.json({ok:true,message:"Book borrowed for 15 days"});
  } catch(e){ await c.rollback(); res.status(400).json({error:e.message}); } finally { c.release(); }
});

router.post("/renew/:id", requireLogin, async (req,res) => {
  try {
    const [r] = await db.query("UPDATE loans SET due_date=DATE_ADD(due_date,INTERVAL 15 DAY),renew_count=renew_count+1 WHERE id=? AND user_id=? AND return_date IS NULL AND renew_count<2",
      [req.params.id,req.session.user.id]);
    if (!r.affectedRows) return res.status(400).json({error:"Renewal not allowed"});
    res.json({ok:true,message:"Renewed for another 15 days"});
  } catch(e){ res.status(500).json({error:"Renew failed"}); }
});

router.post("/return/:id", requireLogin, async (req,res) => {
  const c=await db.getConnection();
  try{
    await c.beginTransaction();
    const [r]=await c.query("SELECT * FROM loans WHERE id=? AND user_id=? AND return_date IS NULL FOR UPDATE",[req.params.id,req.session.user.id]);
    if(!r.length) throw new Error("Loan not found");
    await c.query("UPDATE loans SET return_date=CURDATE(),status='returned' WHERE id=?",[req.params.id]);
    await c.query("UPDATE books SET available_copies=available_copies+1 WHERE id=?",[r[0].book_id]);
    await c.commit(); res.json({ok:true});
  }catch(e){await c.rollback();res.status(400).json({error:e.message});}finally{c.release();}
});

router.get("/all", requireRole("admin","librarian"), async (req,res)=>{
  const [rows]=await db.query(`SELECT l.*,u.name user_name,b.title,
    CASE WHEN l.return_date IS NULL AND CURDATE()>l.due_date THEN DATEDIFF(CURDATE(),l.due_date)*5 ELSE 0 END fine
    FROM loans l JOIN users u ON u.id=l.user_id JOIN books b ON b.id=l.book_id ORDER BY l.borrow_date DESC`);
  res.json(rows);
});
module.exports=router;
