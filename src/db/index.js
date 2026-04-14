import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstanse = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);                 // Connect to the MongoDB database using the connection string from environment variables and the database name from constants
        console.log(`Connected to MongoDB ${connectionInstanse.connection.host}`);    // Log a message to the console when the connection is successful

    } catch (error) {
        console.error("MONGODB connection ERROR:", error); // Log the error and exit the process with a failure code
        process.exit(1);   // Exit the process with a failure code
    }

}


export default connectDB;