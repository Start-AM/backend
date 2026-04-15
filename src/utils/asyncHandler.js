//Metgod _1
const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err)); // Call the request handler and catch any errors that occur, passing them to the next middleware for error handling
    }
}


export { asyncHandler }


// Method _2 
// const asyncHandler = (fn) =>async(req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         });
//     }
// }