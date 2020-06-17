// Main Server
const cluster = require('cluster');
const mongoose = require('mongoose');
const cpus = 4;
const mongoURI = 'mongodb://localhost:27017/queueingSystem';

// For type of forks
const type = ['Master', 'Express', 'Express', 'Compute', 'Compute'];

// TODO
// 1 redis coonnection


// If the process is master
if(cluster.isMaster)
{
    console.log(`[Master] Pid = ${process.pid}`);

    // Database connection
    mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        .then(() => console.log("[Master] Database is connected"))
        .catch(err => console.log("[Master] Database connection error"));

    // for storing forks
    let expressChildren = [];
    let computeChildren = [];

    for(let i = 0; i < cpus / 2; i++)
    {
        // forking half cpus for express server
        expressChildren.push(cluster.fork());
    }
    
    for(let i = 0; i < cpus / 2; i++)
    {
        // forking other half for compute
        computeChildren.push(cluster.fork());
    }

    // logic
}
else if(cluster.isWorker)
{
    if(type[cluster.worker.id] === 'Express') // if process is for express
    {
        const express = require('express');
        const app = express();
        const bodyParser = require('body-parser');
        const passport = require('passport');
        const port = process.env.PORT || "8080";
        const workerName = `[Express Worker ${cluster.worker.id}]`;

        // API
        const loginAPI = require('./routes/auth/login');
        const signupAPI = require('./routes/auth/signup');

        // Middlewares
        app.use(bodyParser.urlencoded({extended : false}));
        app.use(bodyParser.json()); // for populating JSON
        app.use(passport.initialize()); // initializing passport

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
        
        // loginAPI
        loginAPI(app);
        // signupAPI
        signupAPI(app);

        app.listen(port, () => console.log(workerName, `Sever is running on http://localhost:${port}`));
    }   
    else // if process if for Compute
    {
        const workerName = `[Compute Worker ${cluster.worker.id}]`;
        console.log(workerName, 'Ready for some work.');
    }
}