const cluster = require("cluster");
const Job = require('../modals/jobDB');
const { jobQueue, freeComputeWorkers } = require('../config/keys');
const { exception } = require("console");

const jobDistribution = (redisCLient, expressChildren, computeChildren) => {
    // setting all computeChildren free initially
    for(let computeProcess of computeChildren)
    {
        redisCLient.rpush(freeComputeWorkers, computeProcess.id)
    }

    // express children will send message that a new job is added in redis list
    for(let expChild of expressChildren)
    {
        expChild.on('message', msg => {
            if(msg.added !== true)
                throw new exception("Unknown message from ExpressProcess");

            redisCLient.lpop(freeComputeWorkers, (err, val) => {
                if(err || val === null)
                    return;

                // if some compute is free
                redisCLient.lpop(jobQueue, (err, job) => {
                    if(err || job === null)
                        return;
                    
                    let workeridx = val - expressChildren.length - 1
                    computeChildren[workeridx].send({
                        jobID : job
                    });
                });
            });
        });
    }

    for(let computeChild of computeChildren)
    {
        computeChild.on('message', msg => {
            if(msg.done !== true)
                throw new exception("Unknown message from computeProcess");

                // update status of job
            
                redisCLient.lpop(jobQueue, (err, job) => {
                    if(err)
                        return;
                    
                    if(job) // if there is job, then return the worker with new job
                        computeChild.send({
                            jobID : job,
                        });
                    else // else add it to free queue.
                        redisCLient.rpush(freeComputeWorkers, computeChild.id);
                })
        })   
    }
}

module.exports = jobDistribution;