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

    const {username , email , password , fullName} = req.body
    
    
    if (
        [username || email || password || fullName].some((field) => field?.trim() === "")
    ){
        throw new ApiError("All fields are required" , 400)
    }

    const existedUser = User.findOne({
        $or: [{ email }, { username }]
    })

    if (existedUser) {
        throw new ApiError("User with email or username already exists", 409)
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError("Avatar file is required", 400)
    }

    if (!coverImageLocalPath) {
        throw new ApiError("Cover image file is required", 400)
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError("Failed to upload avatar", 400)
    }

    if (!coverImage) {
        throw new ApiError("Failed to upload cover image", 400)
    }

    const User = await User.create({
        username : username.toLowerCase(),
        email,
        avatar: avatar.url,
        coverImage: coverImage.url,
        password,
        fullName
    })

    const createdUser = await User.findById(User._id).select("-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError("Failed to create user", 500)
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"))
})

export {registerUser}