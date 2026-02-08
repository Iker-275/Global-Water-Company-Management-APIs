const User = require("../models/userModel")
const jwt = require("jsonwebtoken")

const handleErrors = (err) => {
    // console.log("error" + err);

    let errors = { email: "", password: "" }

    if (err.message === "User inactive") {
        errors.email =
            "Your account has been deactivated. Please contact an administrator.";
        return errors;
    }

    //incorrect email
    if (err.message === 'Incorrect Password') {
        errors.password = "You have entered an incorrect password.Try again.";
        return errors;
    }

    if (err.message === 'Incorrect email') {
        errors.email = "Email is not registered.Try again.";
        return errors;
    }
    

    //duplicate error code
    if (err.code === 11000) {
        errors.email = "That email is already registered";
        return errors;
    }


    //validation errors
    if (err.message.includes('user validation failed')) {
        // console.log(Object.values(err.errors));
        Object.values(err.errors).forEach(
            ({ properties }) => {
                errors[properties.path] = properties.message;
            }
        )

    }

    return errors;
}

const maxAge = 1 * 24 * 60 * 60; //age in seconds -1 day
const createToken = (id) => {
    return jwt.sign({ id }, 'secrety', {
        expiresIn: maxAge,

    });
}

const signUp_get = async (req, res) => {
    res.render("signup");
}


const signUp_post = async (req, res) => {
    const { email, password, role } = req.body;
    // console.log(email,password);

    try {
        const user = await User.create({ email, password, role });
        const token = createToken(user._Id);


        res.status(201).json({ success: true, token, user });
    } catch (error) {

        const errors = handleErrors(error);
        //console.log(errors);

        res.status(400).json({ success: false, errors })

    }
}


const login_get = async (req, res) => {
    res.render('login');
}


const login_post = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.login(email, password);

        // 🚫 Block inactive users
        if (!user.active) {
            throw Error("User inactive");
        }

        const token = createToken(user._id);

        res.cookie("jwt", token, {
            httpOnly: true,
            maxAge: maxAge * 1000
        });

        res.status(200).json({
            success: true,
            token,
            user
        });

    } catch (error) {
        //console.log(error);
        const errors = handleErrors(error);

        res.status(400).json({
            success: false,
            errors
        });
    }
};


const logout_get = async (req, res) => {

    res.cookie('jwt', '', { maxAge: 0 });

    res.redirect('/');
}


module.exports = { signUp_get, signUp_post, login_get, login_post, logout_get };