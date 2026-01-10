const {Router } = require("express");
const { login_get, signUp_get, signUp_post, login_post, logout_get } = require("../controllers/auth_controller");
const {getAllUsers,getUserById,updateUser,toggleUserActive,deleteUser} = require("../controllers/user_controller");
const {createRole,getAllRoles,getRoleById,updateRole,deleteRole} = require("../controllers/roleController");
const {createExpense,updateExpense,deleteExpense,getExpense,getExpenses} = require("../controllers/expenseController");
const router = Router();

router.get("/signup",signUp_get);
router.post("/signup",signUp_post);
router.get("/login",login_get);
router.post("/login",login_post);
 router.get("/logout",logout_get);

 // Get all users (paginated)
router.get("/user",  getAllUsers);
router.get("/user/:id",  getUserById);
router.put("/user/:id",  updateUser);
router.patch("/user/:id/toggle-active",  toggleUserActive);
router.delete("/user/:id",  deleteUser);




//  roles
router.post("/role", createRole);
router.get("/role", getAllRoles);
router.get("/role/:id", getRoleById);
router.put("/role/:id", updateRole);
router.delete("/role/:id", deleteRole);

//expense
router.post("/expense", createExpense);
router.put("/expense/:id", updateExpense);
router.delete("/expense/:id", deleteExpense);
router.get("/expense", getExpenses);
router.get("/expense/:id", getExpense);


module.exports = router;



