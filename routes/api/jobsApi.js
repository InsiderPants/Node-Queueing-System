// Jobs api
const passport = require('passport');
const path = require('path');
const Job = require('../../modals/jobDB');
const { jobQueue, jobIDCounter } = require('../../config/keys');

// messages
const {
    NO_FILES_ATTACHED,
    SERVER_ERROR,
    NO_SUCH_JOB_EXISTS,
} = require('../../message/messages').ERROR;

const {
    JOB_ADDED_SUCCESSFULLY,
} = require('../../message/messages').SUCCESS;

const jobsAPI = (app, redisClient, jobIDLock) => {
    /*
        route : /api/addjob
        method : POST
        access : private
        desc : for adding jobs to the queue
    */
    app.post('/api/addjob', passport.authenticate('jwt', {session : false}), (req, res) => {
        if(!req.files || Object.keys(req.files).length === 0) 
        {
            // no file uploaded
            return res.status(400).json({
                success : false, 
                message : NO_FILES_ATTACHED
            })
        }   

        // acquire the lock, assign the job id, increment the jobID counter is redis and put the job in redis list\
        jobIDLock.acquire(jobIDCounter, () => {
            return new Promise((resolve, reject) => {
                redisClient.get(jobIDCounter, (err, val) => {
                    if(err)
                        reject("Error while incrementing Job counter" + err);
                    else
                    {
                        redisClient.incr(jobIDCounter);
                        resolve(val);
                    }
                });
            });
        })
        .then(jobID => {
            let promiseArray = []
            // changing file name and storing it as txt
            let fileName = jobID.toString() + '.txt';

            // moving the file
            promiseArray.push(
                new Promise((resolve, reject) => {
                    req.files.jobFile.mv(path.join(__dirname, '../../userFiles/', fileName), (err) => {
                        if(err)
                            reject("Error moving Files " + err);
                        else    
                            resolve();
                    });
                })
            );

            // adding to database
            promiseArray.push(
                new Promise((resolve, reject) => {
                    Job.findOne({'jobID' : jobID}, (err, job) => {
                        if(err)
                            reject(err);
                        else
                        {   
                            const newJob = new Job({
                                jobID : jobID,
                                jobType : "Any", // change later
                                status : "In queue",
                            });

                            newJob.save((err, _) => {
                                if(err)
                                    reject("Database Write Error " + err);
                                else
                                    resolve();
                            });
                        }
                    });
                })
            );

            // adding job to the queue
            promiseArray.push(
                new Promise((resolve, reject) => {
                    redisClient.rpush(jobQueue, jobID, (err, _) => {
                        if(err)
                            reject("Error while adding job to the queue " + err);
                        else
                            resolve();
                    });
                })
            );

            Promise.all(promiseArray)
                .then(() => {
                    res.status(200).json({
                        success : true, 
                        message : JOB_ADDED_SUCCESSFULLY,
                        body : {
                            jobID : jobID
                        }
                    });

                    // acknowledge to the master thread that a new Job is added to the queue
                    process.send({
                        added : true,
                    });
                })
                .catch(err => {
                    console.log(err);
                    res.status(500).json({
                        success : false, 
                        message : SERVER_ERROR,
                    })
                })
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                success : false,
                message : SERVER_ERROR,
            })
        })
    }); // add Job api end


    /*
        route : /api/getJjobstatus
        method : POST
        access : private
        desc : for getting the status of jobs
    */
    app.post('/api/getjobstatus', passport.authenticate('jwt', {session : false}), (req, res) => {
        const jobID = req.body.jobID;
        Job.findOne({'jobID' : jobID}, (err, job) => {
            if(err)
            {
                return res.status(500).json({
                    success : false,
                    message : SERVER_ERROR,
                })
            }
            if(job === null)
            {
                return res.status(400).json({
                    success : false,
                    message : NO_SUCH_JOB_EXISTS,
                })
            }
            res.status(200).json({
                success : true,
                body : {
                    status : job.status,
                }
            });
        })
    })
}

module.exports = jobsAPI;