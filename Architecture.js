/*
    Server Structure =>

                    Master
                /     |     \ 
            fork1     fork2    fork3  .....

    There are two types of processes, first simply for handline express server(producing jobs) and computation processes,(consumer).
    
    Express server accepts job from frontend and add to the redis data structure and pass the info to master process that a work has been 
    added to the queue.
    Master process, takes a job from the redis data structure and gives jobs to the computational threads if they are idle and when computtaion threads
    completes the job, they return the successful job and get ready for next job to be assigned.
*/

// sample communication between processes
const cluster = require("cluster");

if(cluster.isMaster)
{
    for(let i = 0; i < 4; i++)
    {
        let worker = cluster.fork();
        worker.send({t : "hello from master"});
        worker.on("message", msg => {
            console.log("from worker", msg);
        })
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log("from exit", worker.id, code, signal);
        cluster.fork();
    })
}
else
{
    console.log(cluster.worker.id);
    process.on('message', message => {
        console.log('Message from parent:', message);
    })
    process.send({ttt: "ndnk"});

    if(cluster.worker.id === 1)
        process.exit(0);
}