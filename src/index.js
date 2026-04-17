import dotenv from "dotenv";
import dns from 'node:dns';


dotenv.config({ path: "./.env" });

dns.setServers(['8.8.8.8', '8.8.4.4']);

import connectDB from "./db/index.js";
const { app } = await import("./app.js");

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 9000, () => {
            console.log(`Server is running on port : ${process.env.PORT || 9000}`);
        });
    })
    .catch((err) => {
        console.log("MONGO db CONNECTION ERROR !!! ", err);
    });


/*  // this our frist approach.
import express from "express";        // Import the Express framework to create the server
const app = express();          // Create an instance of the Express application


(async () => {         // Connect to MongoDB datbase and start the server
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);    // Connect to the MongoDB database using the connection string from environment variables and the database name from constants
        console.log("Connected to MongoDB");    // Log a message to the console when the connection is successful
        app.on("error", (error) => {               // Handle server errors
            console.log("ERRR", error);       // Log the error and rethrow it to be handled by the caller
            throw error                         // Rethrow the error to be handled by the caller

        });

        app.listen(process.env.PORT, () => {   // Start the server and listen on the specified port
            console.log(`Server is running on port ${process.env.PORT}`);    // Log a message to the console when the server is successfully started
        });

    } catch (error) {      // Handle connection errors
        console.error("ERROR:", error); // Log the error and rethrow it to be handled by the caller
        throw err           // Rethrow the error to be handled by the caller
    }
})();
*/