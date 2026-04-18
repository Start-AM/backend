import { asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";


const registerUser = asyncHandler (async (req , res) =>{
    // Logic to get a user details from frontnd
    //validation of user details - not empty
    //check if user already exists in database
    //check from image and avatar
    //upload them to cloudinary
    //create user object - create a user in database
    //remove password and refresh token from user object before sending response
    //check for user creation
    // return response

    const { username, email, password, fullName } = req.body

    const missingFields = [
        ["username", username],
        ["email", email],
        ["password", password],
        ["fullName", fullName]
    ]
        .filter(([_, value]) => !value || value.trim() === "")
        .map(([field]) => field)

    if (missingFields.length > 0) {
        throw new ApiError(400, `Missing fields: ${missingFields.join(", ")}`)
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Failed to upload avatar")
    }

    if (!coverImage) {
        throw new ApiError(400, "Failed to upload cover image")
    }

    const createdUser = await User.create({
        username: username.toLowerCase(),
        email,
        avatar: avatar.url,
        coverImage: coverImage.url,
        password,
        fullName
    })

    const user = await User.findById(createdUser._id).select("-password -refreshToken")

    if (!user) {
        throw new ApiError(500, "Failed to create user")
    }

    return res.status(201).json(new ApiResponse(201, user, "User registered successfully"))
})

export {registerUser}