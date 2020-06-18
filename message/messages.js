const message = {
    ERROR : {
        DATABASE_READ_ERROR : 'Error while reading/accessing the database',
        DATABASE_WRITE_ERROR : 'Error while writing in database',
        USER_NOT_FOUND : 'User is not found in the database',
        WRONG_PASSWORD : 'Password is incorrect',
        SERVER_ERROR : 'Server Error',
        USER_ALREADY_EXIST : "Email Already exists",
        NO_FILES_ATTACHED : 'No files attached in request', 
    },
    SUCCESS : {
        SUCCESSFUL_LOGIN : 'Login Successful',
        SUCCESSFUL_SIGNUP : "Signup Successful",
        JOB_ADDED_SUCCESSFULLY : 'Job added successfully to the Queue',
    }
}

module.exports = message;