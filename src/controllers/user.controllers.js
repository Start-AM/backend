import { asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    }
    catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}


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
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

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

const loginUser = asyncHandler (async (req, res) => {
    // req bodyy -> data
    // username and email -> unique
    // find the user
    // password check
    // generate access token and refresh token
    // save cookie
    

    const { username , email, password } = req.body
    console.log(email )

    if (!username && !email) {
        throw new ApiError(400, "Username, email, and password are required")
    }

    // Here is an alternative of above code based on logic discussed
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
    // }


    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
             {
                 user: loggedInUser, accessToken, refreshToken
             }, 
             "User logged in successfully"
            )
        )
})


const logoutUser = asyncHandler (async (req, res) => {
    // get user id from req.user
    // find the user in database
    // remove refresh token from database
    // clear cookies

    User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {
                refreshToken: undefined 
            } 
        },
        {
            new: true 
        }
    )

    const options ={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, { }, "User logged out successfully"))

})    

const refreshAccessToken = asyncHandler (async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodeToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodeToken?._id)
    
        if (!user) {
            throw new ApiError(401, "invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token expired or used")
        }
        const options ={
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                 {
                   accessToken, refreshToken: newRefreshToken
                 }, 
                 "Access token refreshed successfully"
                )
            )
    
    } 
    catch (error) {
        throw new ApiError(401, "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler (async (req,res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordcorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordcorrect) {
        throw new ApiError(401, "Old password is incorrect")
    }

    user.password = newPassword
    await user.save(validateBeforeSave = false)

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))

})

const getCurrentUser = asyncHandler (async (req, res) => {

    return res
    .status(200)
    .json(200, req.user, "Current user retrieved successfully")
})

const updateUserProfile = asyncHandler (async (req, res) => {
    const {email, fullName } = req.body

    if (!email || !fullName) {
        throw new ApiError(400, "At least one field is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {
                email,
                fullName
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "User profile updated successfully"))


})

const updateUserAvatar = asyncHandler (async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Failed to upload avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "User avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler (async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Failed to upload cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "User cover image updated successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserProfile,
    updateUserAvatar,
    updateUserCoverImage,

}