const cluster = require('cluster');

// function to do computation
const fs = require('fs');
const path = require('path');

const computationProcess = (JobID) => {
    console.log('[Compute Worker', cluster.worker.id,']', 'got job with ID', JobID, 'to do');
    const fileName = String(JobID) + '.txt';
    const newFileName = String(JobID) + '.csv';
    fs.readFile(path.join(__dirname, '../userFiles/', fileName), 'utf8', (err, val) => {
        if(err)
            throw new Error("Error while Reading file from disk" + err);
        // console.log(val);
        fs.writeFile(path.join(__dirname, '../userFiles/', newFileName), val, 'utf8', err => {
            if(err)
                throw new Error("Error while Writinf file to disk" + err);
            console.log('[Compute Worker', cluster.worker.id,']', 'Job with id', JobID, 'successfully done');
            process.send({
                done : true,
                jobID : JobID,
            })
        })
    })
};


module.exports = computationProcess;