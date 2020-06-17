// Main Serve
const express = require('express');
const app = express();
const cluster = require('cluster');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const passport = require('passport');
const cpus = 4;
const port = process.env.PORT || "8080";

// for type of forks
const type = ['Master', 'Express', 'Express', 'Compute', 'Compute'];

// Api
const loginAPI = require('./routes/auth/login');
const signupAPI = require('./routes/auth/signup');

// middlewares
app.use(bodyParser.urlencoded({extended : false}));
app.use(bodyParser.json()); // for populating JSON
app.use(passport.initialize()); // initializing passport

// for logginf requests
app.use((req, res, next) => {
    console.log("Worker", cluster.worker.id, "=>", "incoming request", req.url);
    next();
})

// database connection
mongoose.connect("mongodb://localhost:27017/queueingSystem", {useNewUrlParser: true, useUnifiedTopology: true})
        .then(() => console.log("Worker", cluster.worker.id, "=>", "Database is Connected"))
        .catch(err => console.log("SERVER : Database connection error"));

// TODO
// 1 redis coonnection


// if the process is master
if(cluster.isMaster)
{
    console.log(`Master Pid = ${process.pid}`);
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
        console.log(`Running Express Server on worker id ${cluster.worker.id}`);
        
        // loginAPI
        loginAPI(app);
        // signupAPI
        signupAPI(app);

        app.listen(port, () => console.log("Worker", cluster.worker.id, "=>", "Sever is running on port", port));
    }   
    else // if process if for Compute
    {
        console.log(`Running Compute Server on worker id ${cluster.worker.id}`);
    }
}