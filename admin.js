const router=require("express").Router();
const db=require("./db");
const {requireRole}=require("./middleware-auth");
router.get("/dashboard",requireRole("admin","librarian"),async(req,res)=>{
 const [[r]]=await db.query(`SELECT
 (SELECT COUNT(*) FROM books) books,
 (SELECT COUNT(*) FROM users) users,
 (SELECT COUNT(*) FROM loans WHERE return_date IS NULL) active_loans,
 (SELECT COUNT(*) FROM book_requests WHERE status='pending') pending_requests`);
 res.json(r);
});
module.exports=router;
