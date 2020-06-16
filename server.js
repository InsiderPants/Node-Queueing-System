// Main Serve
const express = require('express');
const app = express();
const cluster = require('cluster');
const cpus = 4;

const type = ['Master', 'Express', 'Express', 'Compute', 'Compute'];

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


}
else if(cluster.isWorker)
{
    if(type[cluster.worker.id] === 'Express') // if process is for express
    {
        console.log(`Running Express Server on worker id ${cluster.worker.id}`);
        
        
    }   
    else // if process if for Compute
    {
        console.log(`Running Compute Server on worker id ${cluster.worker.id}`);
    }
}