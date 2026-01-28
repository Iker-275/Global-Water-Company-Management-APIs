const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

require("dotenv").config();
const appRoutes = require("./routes/appRoutes")
const connectDB = require("./db/connect")
const {requireAuth,checkUser }= require("./middleware/authMiddleware");
const { runSeed } = require("./seeders/customerSeeder");

const app = express();

//app.use(bodyParser.urlencoded({extended: true}));
 app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser())
app.use(checkUser);

 app.set("view engine","ejs");
const PORT = process.env.PORT || 5000;


 
app.get("/login",checkUser,function(req,res){
    
//res.render("login");
})


app.get("/",requireAuth,(req,res)=>{
   // res.render("home");
})

app.post("/",function(req,res){
    
})

app.use("/water",appRoutes);


app.use((err, req, res, next) => {
   // console.log("error "+err);
    
  res.status(400).send(err.message)
})

app.listen(PORT,async()=>{
    await connectDB(process.env.DB_URL);
   //  await runSeed();
    console.log("Server started on port :"+PORT);
    
})











