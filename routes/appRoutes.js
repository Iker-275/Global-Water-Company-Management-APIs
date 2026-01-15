const {Router } = require("express");
const { login_get, signUp_get, signUp_post, login_post, logout_get } = require("../controllers/auth_controller");
const {getAllUsers,getUserById,updateUser,toggleUserActive,deleteUser} = require("../controllers/user_controller");
const {createRole,getAllRoles,getRoleById,updateRole,deleteRole} = require("../controllers/roleController");
const {createExpense,updateExpense,deleteExpense,getExpense,getExpenses} = require("../controllers/expenseController");
const { createRate, getCurrentRate, getAllRates, getSingleRate, deleteRate, updateRate } = require("../controllers/rateController");
const { createZone, getZones, updateZone, deleteZone } = require("../controllers/zoneController");
const{ createNotificationController,getNotifications,getNotificationById,markAsRead,deleteNotification} = require("../controllers/notificationController")  ;
 const { createVillage, getVillages, getVillageById, updateVillage, deleteVillage } = require("../controllers/villageController");  
const { createCustomer, getCustomers, getCustomerById, updateCustomer, deleteCustomer } = require("../controllers/customerController");
const { createVisit, getVisits, getVisitById, deleteVisit } = require("../controllers/visitController");  
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

//notifications
router.post("/notification", createNotificationController);
router.get("/notification", getNotifications);
router.get("/notification/:id", getNotificationById);
router.patch("/notification/:id/read", markAsRead);
router.delete("/notification/:id", deleteNotification);


//rates
router.post("/rate", createRate);
router.get("/rate/current", getCurrentRate);
router.get("/rate", getAllRates);
router.get("/rate/:id", getSingleRate);
router.delete("/rate/:id", deleteRate);
// Optional
router.put("/rate/:id", updateRate);


//zones

router.post("/zone", createZone);
router.get("/zone", getZones);
router.put("/zone/:id", updateZone);
router.delete("/zone/:id", deleteZone);

//villages
router.post("/village", createVillage);
router.get("/village", getVillages);
router.get("/village/:id", getVillageById);
router.put("/village/:id", updateVillage);
router.delete("/village/:id", deleteVillage);

//customers
router.post("/customer", createCustomer);
router.get("/customer", getCustomers);
router.get("/customer/:id", getCustomerById);
router.put("/customer/:id", updateCustomer);
router.delete("/customer/:id", deleteCustomer);

//visits
router.post("/visit", createVisit);
router.get("/visit", getVisits);
router.get("/visit/:id", getVisitById);
router.delete("/visit/:id", deleteVisit);

module.exports = router;



