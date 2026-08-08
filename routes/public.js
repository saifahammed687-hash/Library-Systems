const router=require("express").Router();
const db=require("../config/db");
router.get("/books",async(req,res)=>{
 const q=`%${req.query.q||""}%`;
 const [r]=await db.query("SELECT id,title,author,category,isbn,available_copies FROM books WHERE title LIKE ? OR author LIKE ? OR category LIKE ? ORDER BY title",[q,q,q]);res.json(r);
});
module.exports=router;
