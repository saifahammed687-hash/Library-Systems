const router=require("express").Router();
const db=require("../config/db");
const {requireRole}=require("../middleware/auth");
router.get("/summary",requireRole("admin","librarian"),async(req,res)=>{
 const [[books]] = await db.query("SELECT COUNT(*) total_books,COALESCE(SUM(total_copies),0) copies,COALESCE(SUM(available_copies),0) available FROM books");
 const [[users]] = await db.query("SELECT COUNT(*) total_users FROM users");
 const [[loans]] = await db.query("SELECT COUNT(*) active_loans FROM loans WHERE return_date IS NULL");
 const [[fines]] = await db.query("SELECT COALESCE(SUM(CASE WHEN return_date IS NULL AND CURDATE()>due_date THEN DATEDIFF(CURDATE(),due_date)*5 ELSE 0 END),0) fine FROM loans");
 res.json({books,users,loans,fines});
});
router.get("/export",requireRole("admin","librarian"),async(req,res)=>{
 const [r]=await db.query(`SELECT u.name,u.email,b.title,l.borrow_date,l.due_date,l.return_date,l.status,
 CASE WHEN l.return_date IS NULL AND CURDATE()>l.due_date THEN DATEDIFF(CURDATE(),l.due_date)*5 ELSE 0 END fine
 FROM loans l JOIN users u ON u.id=l.user_id JOIN books b ON b.id=l.book_id ORDER BY l.borrow_date DESC`);
 res.json(r);
});
module.exports=router;
