const jwtStrategy = require('passport-jwt').Strategy;
const extractJWT = require('passport-jwt').ExtractJwt;
const mongoose = require('mongoose');
const User = require('../modals/userDB');
const JWTSecret = require('../config/keys').JWTSecret;

const options = {
    jwtFromRequest : extractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey : JWTSecret,
};

const ValidateApiAccess = (passport) => {
    passport.use(new jwtStrategy(options, (payload, done) => {
        User.findOne({'email' : payload.email}, (err, doc) => {
            if(err)
                console.log("Error while validating JWT token =>", err)
            else if(doc)
                return done(null, doc);
            else 
                return done(null, false);
        });
    }));
};

module.exports = ValidateApiAccess;