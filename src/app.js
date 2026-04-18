import express from "express";        // Import the Express framework to create the server
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();          // Create an instance of the Express application


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({limit: "16kb"}));    // Middleware to parse incoming JSON requests and make the data available in req.body
app.use(express.urlencoded({extended: true, limit: "16kb"}));    // Middleware to parse incoming URL-encoded requests and make the data available in req.body
app.use(express.static("public"));    // Middleware to serve static files from the "public" directory

app.use(cookieParser());

//routes import
import userRouter from "./routes/user.routes.js"


//routes declaration
app.use("/api/v1/users", userRouter)

// global error handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        error: err.error || [],
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
    });
});

export { app}