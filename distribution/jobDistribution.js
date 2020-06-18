const cluster = require('cluster');
const asyncLock = require('async-lock');
const Lock = new asyncLock();
const Job = require('../modals/jobDB');
const { jobQueue, freeComputeWorkers, typeOfProcess, jobIDCounter } = require('../config/keys');
const { exception } = require("console");
const { resolve } = require('path');
const { ExtractJwt } = require('passport-jwt');
const NUM_EXPRESS_PROCESSES = 6;
const NUM_COMPUTE_PROCESSES = 6;
let ExpressProcessMap = new Map(); // creating local map for express
let ComputeProcessMap = new Map(); // creating local map for compute

function expressChildrenListener(msg, redisClient) 
{
    if(msg.added !== true)
        throw new exception("Unknown message from ExpressProcess");

    Lock.acquire(freeComputeWorkers, (done) => {
        // get a free worker
        redisClient.lpop(freeComputeWorkers, (err, val) => {
            if(err)
                done(err, val);
            else if(val === null)
                done(err, -1);
            else
                done(err, val);
        });
    }, (err, freeWorker) => {
        
        if(err)
            throw new exception("Error while poping from redis" + err);
        if(freeWorker === -1)
            return;
        
        // get a job
        Lock.acquire(jobQueue, (done) => {
            redisClient.lpop(jobQueue, (err, val) => {
                if(err)
                    done(err, val);
                else if(val === null)
                    done(err, -1);
                else
                    done(err, val);
            });
        }, (err, job) => {
            if(err)
                throw new exception("Error while poping from redis" + err);
            if(job === -1)
                return;
            
            // give the job to the free worker
            ComputeProcessMap.get(parseInt(freeWorker)).send({
                jobID : parseInt(job),
            })
        }); // end of job lock
    }); // end of free compute workers lock
}

function computeChildrenListener(msg, computeChild, redisClient)
{
    if(msg.done !== true)
        throw new exception("Unknown message from computeProcess");

    console.log(msg);
    Lock.acquire(jobQueue, (done) => {
        redisClient.lpop(jobQueue, (err, val) => {
            if(err || val === null)
                done(err, -1);
            else
                done(err, val);
        })
    }, (err, job) => {
        if(err)
            throw new exception("Error while poping from redis" + err);
        // update status of the completed job
        Job.findOne({'jobID' : msg.jobID}, (err, doc) => {
            if(err)
                throw new exception("Database read error");
            if(doc === null)
                throw new exception("How come job assigned bu not in DB");
            
            doc.status = "Done";
            doc.save((err, _) => {
                if(err)
                    throw new exception("Database write Error");
            });
        });

        if(job !== -1)
        {
            computeChild.send({
                jobID : parseInt(job),
            });
        }
        else
        {
            redisClient.rpush(freeComputeWorkers, computeChild.id);
        }
    }); // end of Lock
}

const jobDistribution = (redisClient) => {
    // clearing up existing hsets
    redisClient.del(typeOfProcess, freeComputeWorkers);

    redisClient.get(jobIDCounter, (err, val) => {
        if(err)
            throw new Error("Error while initializing Job ID counter" + err);
        if(val === null)
            redisClient.set(jobIDCounter, 1);
    })

    // set up express and compute processes
    for(let i = 0; i < NUM_EXPRESS_PROCESSES; i++)
    {
        let worker = cluster.fork();
        // listening on express process communication
        worker.on('message', msg => {
            expressChildrenListener(msg, redisClient);
        }); // end of listener

        ExpressProcessMap.set(worker.id, worker);
        redisClient.hset(typeOfProcess, worker.id, "Express");
    }

    for(let i = 0; i < NUM_COMPUTE_PROCESSES; i++)
    {
        let worker = cluster.fork();
        
        // listening communication from 
        worker.on('message', msg => {
            computeChildrenListener(msg, worker, redisClient);
        });
        
        ComputeProcessMap.set(worker.id, worker);
        redisClient.hset(typeOfProcess, worker.id, "Compute");
        redisClient.rpush(freeComputeWorkers, worker.id);
    }

    // logic if any process dies;
    cluster.on('exit', (worker, code, signal) => {
        if(code !== 0)
        {   
            // get type of process die
            new Promise((resolve, reject) => {
                redisClient.hget(typeOfProcess, worker.id, (err, val) => {
                    if(err)
                        reject(new Error("Error while restarting killed process" + err));
                    else
                        resolve(val);
                })
            })
            .then(type => {
                let newWorker = cluster.fork();
                if(type === 'Express')
                {
                    newWorker.on('message', msg => {
                        expressChildrenListener(msg, redisClient);
                    });

                    redisClient.hset(typeOfProcess, newWorker.id, "Express");
                }
                else if(type === 'Compute')
                {
                    newWorker.on('message', msg => {
                        computeChildrenListener(msg, newWorker, redisClient);
                    });

                    redisClient.hset(typeOfProcess, newWorker.id, "Compute");
                }
            })
            .catch(err => {
                console.log(err);
            });
        }
    });
}

module.exports = jobDistribution;