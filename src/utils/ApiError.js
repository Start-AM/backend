class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        error = [],
        statck = ""
    ) {
        super(message);                       // Call the parent class constructor with the error message
        this.statusCode = statusCode;           // Set the status code for the error
        this.data = null ;                     // Set the data property to null for the error    
        this.message = message;                  // Set the error message for the error
        this.success = false;                    // Set the success property to false for the error
        this.error = error;                        // Set the error array for the error
       
            if (stack) {
                this.stack = stack; // Set the stack trace for the error
            }
            else {
                Error.captureStackTrace(this, this.constructor); // Capture the stack trace for the error
            }

    }
}

export { ApiError  };