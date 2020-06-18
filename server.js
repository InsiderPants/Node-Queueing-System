// Main Server
const cluster = require('cluster');
const mongoose = require('mongoose');
const redis = require('redis');
const { typeOfProcess } = require('./config/keys');
const mongoURI = 'mongodb://localhost:27017/queueingSystem';
const redisURL = 'redis://127.0.0.1:6379'
// redis connection;
const redisClient = redis.createClient(redisURL);


// If the process is master
if(cluster.isMaster)
{
    const jobDistribution = require('./distribution/jobDistribution');

    console.log(`[Master] Pid = ${process.pid}`);

    // Database connection
    mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        .then(() => console.log("[Master] Database is connected"))
        .catch(err => console.log("[Master] Database connection error =>", err));

    // Work Distribution logic
    jobDistribution(redisClient);

}
else if(cluster.isWorker)
{
    new Promise((resolve, reject) => {
        redisClient.hget(typeOfProcess, cluster.worker.id, (err, val) => {
            if(err)
                reject("Cannot get type of Process from redis " + err);
            else if(val === null)
                reject(new Error("New Process type if not in Redis map"));
            else
                resolve(val);
        });
    })
    .then(val => {
        if(val === 'Express')
        {
            const express = require('express');
            const app = express();
            const bodyParser = require('body-parser');
            const passport = require('passport');
            const fileUpload = require('express-fileupload');
            const Asynclock = require('async-lock');
            const port = process.env.PORT || "8080";
            const ValidateApiAccess = require('./utils/validateApi');
            const workerName = '[Express Worker ' + cluster.worker.id.toString() + ' ]';
        
            // API
            const loginAPI = require('./routes/auth/login');
            const signupAPI = require('./routes/auth/signup');
            const jobsAPI = require('./routes/api/jobsApi');
        
        
            // Middlewares
            app.use(bodyParser.urlencoded({extended : false}));
            app.use(bodyParser.json()); // for populating JSON
            app.use(fileUpload()); // middleware for uploading files
            app.use(passport.initialize()); // initializing passport
            ValidateApiAccess(passport); // for validating private api access
        
            // For logging requests
            app.use((req, res, next) => {
                console.log(workerName, "Incoming request at", req.url);
                next();
            })
        
            // Database connection
            mongoose.connect(mongoURI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                })
                .then(() => console.log(workerName, "Database is connected"))
                .catch(err => console.log(workerName, "Database connection error"));
        
            // Redis connection
            const redisClient = redis.createClient(redisURL);
        
            // lock for giving job id
            const jobIDLock = new Asynclock();
            
            // loginAPI
            loginAPI(app);
            // signupAPI
            signupAPI(app);
            // jobsAPI
            jobsAPI(app, redisClient, jobIDLock);
        
            app.listen(port, () => console.log(workerName, `Sever is running on http://localhost:${port}`));
        }
        else
        {
            const computationProcess = require('./computation/computation');
            const workerName = '[Compute Worker ' + cluster.worker.id.toString() + ' ]';
            console.log(workerName, 'Ready for some work.');
        
            process.on('message', msg => {
                computationProcess(msg.jobID);
            })
        }
    })
    .catch(err => {
        throw err;
    });
}