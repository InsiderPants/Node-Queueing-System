// API for signup
const bcrypt = require('bcrypt');
const User = require("../../modals/userDB");

// messages
const {
    DATABASE_READ_ERROR,
    DATABASE_WRITE_ERROR,
    USER_ALREADY_EXIST,
    SERVER_ERROR,
} = require('../../message/messages').ERROR;

const {
    SUCCESSFUL_SIGNUP,
} = require('../../message/messages').SUCCESS;

const signupAPI = (app) => {
    /*
        route : /signup
        method : POST
        access : public
    */
    app.post('/signup', (req, res) => {
        const email = req.body.email;
        const name = req.body.name;
        const password = req.body.password;
        
        User.findOne({'email' : email}, (err, doc) => {
            if(err)
            {
                // if there is some database error
                console.log("Error in Database find => ", err);
                res.status(500).json({
                    success : false,
                    message : DATABASE_READ_ERROR
                });
            }
            else
            {
                if(doc !== null)
                    // already exists
                    return res.json({
                        success : false,
                        message : USER_ALREADY_EXIST
                    });

                const newUser = new User({
                    name : name,
                    email : email,
                    password : password,
                });

                bcrypt.genSalt(10, (err, salt) => {
                    if(err)
                    {
                        console.log("Error in generating salt =>", err)
                        return res.json({
                            success : false,
                            message : SERVER_ERROR
                        });
                    }
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if(err)
                        {
                            console.log("Error in generating hash =>", err);
                            return res.json({
                                success : false,
                                message : SERVER_ERROR,
                            });
                        }
                        newUser.password = hash
                        newUser.save(function(err, _) {
                            if(err)
                            {
                                console.log("Error in saving in database =>", err);
                                return res.json({
                                    success : false,
                                    message : DATABASE_WRITE_ERROR,
                                });
                            }
                            res.status(200).json({
                                success : true,
                                message : SUCCESSFUL_SIGNUP,
                            });
                        })
                    })
                })
            }
        })
    })
}

module.exports = signupAPI;