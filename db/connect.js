const mongoose = require ("mongoose");
const dns = require( "node:dns/promises");
// console.log( dns.getServers());
dns.setServers(["1.1.1.1"]);

const connectDB = (uri)=>{
    return mongoose.connect(uri,{
      
    })
}


module.exports = connectDB;