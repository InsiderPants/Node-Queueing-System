// Api for login
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../../modals/userDB');
const JWTSecret = require('../../config/keys').JWTSecret;

// messages
const {
    DATABASE_READ_ERROR,
    USER_NOT_FOUND,
    WRONG_PASSWORD,
    SERVER_ERROR,
} = require('../../message/messages').ERROR;

const {
    SUCCESSFUL_LOGIN,
} = require('../../message/messages').SUCCESS;


const loginApi = (app) => {
    /*
        route : '/login'
        method : POST
        access : public
    */
    app.post('/login', (req, res) => {
        const email = req.body.email;
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
                if(doc === null)
                    res.json({
                        success : false,
                        message : USER_NOT_FOUND
                    });
                else
                {
                    bcrypt.compare(password, doc.password)
                        .then(match => {
                            if(match == false)
                                // password is incorrect
                                res.json({
                                    success : false,
                                    message : WRONG_PASSWORD
                                })
                            
                            const payload = {
                                name : doc.name,
                                email : doc.email,
                            }
                            // creating accesstoken with inf expiration time
                            jwt.sign(payload, JWTSecret, {}, (err, token) => {
                                if(err)
                                {
                                    console.log("Error in login api at JWT sign => ", err);
                                    res.json({
                                        success : false,
                                        message : SERVER_ERROR,
                                    })
                                }
                                // send success with token
                                res.status(200).json({
                                    success : true, 
                                    message : SUCCESSFUL_LOGIN,
                                    body : {
                                        name : doc.name, 
                                        accessToken : 'Bearer ' + token,
                                    }
                                });
                            });
                        })
                        .catch(err => {
                            console.log("Error in loginapu at bcrypt password compare => ", err);
                            res.json({
                                success : false,
                                message : SERVER_ERROR
                            });
                        });
                }
            }
        })            
    })
}

module.exports = loginApi;