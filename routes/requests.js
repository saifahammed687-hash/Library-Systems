const router=require("express").Router();
const db=require("../config/db");
const {requireLogin,requireRole}=require("../middleware/auth");

router.post("/",requireRole("teacher"),async(req,res)=>{
  const {title,author,reason}=req.body;
  if(!title||!author)return res.status(400).json({error:"Title and author required"});
  const [r]=await db.query("INSERT INTO book_requests(user_id,title,author,reason,status) VALUES(?,?,?,?, 'pending')",
    [req.session.user.id,title,author,reason||null]);
  res.json({id:r.insertId});
});
router.get("/mine",requireRole("teacher"),async(req,res)=>{
  const [r]=await db.query("SELECT * FROM book_requests WHERE user_id=? ORDER BY created_at DESC",[req.session.user.id]);res.json(r);
});
router.get("/",requireRole("admin","librarian"),async(req,res)=>{
  const [r]=await db.query("SELECT br.*,u.name requester FROM book_requests br JOIN users u ON u.id=br.user_id ORDER BY br.created_at DESC");res.json(r);
});
router.patch("/:id",requireRole("admin","librarian"),async(req,res)=>{
  const status=["approved","rejected"].includes(req.body.status)?req.body.status:"pending";
  await db.query("UPDATE book_requests SET status=?,reviewed_at=NOW() WHERE id=?",[status,req.params.id]);res.json({ok:true});
});
module.exports=router;
