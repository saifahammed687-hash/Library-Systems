const router=require("express").Router();
const db=require("../config/db");
const {requireRole}=require("../middleware/auth");
router.get("/",requireRole("admin","librarian"),async(req,res)=>{
 const [r]=await db.query("SELECT id,name,email,role,status,created_at FROM users ORDER BY created_at DESC");res.json(r);
});
module.exports=router;
