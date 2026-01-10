const mongoose = require("mongoose")
const { isEmail } = require("validator")
const bcrypt = require("bcrypt")


const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: [isEmail, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    },
    role:{
        type:String,
        required:true,
        default:"User"
    },
    active:{
        type:Boolean,
        default:true
    }

},
{ timestamps: true }
)

userSchema.pre('save', async function (next) {
    

    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
   // console.log('user about to be created',this);
    next;
})



userSchema.statics.login = async function(email, password) {
    const user = await this.findOne({ email });

    if (user) {
        //bcrypt checks for hashing automatically
        const auth = await bcrypt.compare(password, user.password)

        if (auth) {
            return user;
        }
        throw Error("Incorrect Password")
    }


    throw Error("Incorrect email")

}




const User = mongoose.model('user', userSchema);
module.exports = User;







