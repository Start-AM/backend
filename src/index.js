import dotenv from "dotenv";
import dns from 'node:dns';


dotenv.config({ path: "./.env" });

dns.setServers(['8.8.8.8', '8.8.4.4']);

import connectDB from "./db/index.js";

let app;
try {
    const appModule = await import("./app.js");
    app = appModule.app;
    console.log("✅ App module imported successfully", app ? "app is defined" : "app is undefined");
} catch (importError) {
    console.error("❌ Error importing app module:", importError);
}

connectDB()
    .then(() => {
        if (!app) {
            throw new Error("App is not defined after import");
        }
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on port : ${process.env.PORT || 8000}`);
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

        app.listen(process.env.PORT || 8000, () => {   // Start the server and listen on the specified port
            console.log(`Server is running on port ${process.env.PORT || 8000}`);    // Log a message to the console when the server is successfully started
        });

    } catch (error) {      // Handle connection errors
        console.error("ERROR:", error); // Log the error and rethrow it to be handled by the caller
        throw err           // Rethrow the error to be handled by the caller
    }
})();
*/