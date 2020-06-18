// Schema for Jobs Database
const mongoose = require('mongoose');

const jobSchema = mongoose.Schema({
    jobID : Number,
    jobType : String,
    status : String,
});

const Job = mongoose.model('job', jobSchema);

module.exports = Job;