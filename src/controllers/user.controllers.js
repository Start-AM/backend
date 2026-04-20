import { asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

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
    .json(new ApiResponse(200, req.user, "Current user retrieved successfully"))
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

const getUserChannelProfile = asyncHandler (async (req, res) => {
    const {username} =req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required/missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }

            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                email: 1,
                

            }
        }
    ]).select("-password")

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }


    return res.status(200).json(new ApiResponse(200, channel[0], "Channel profile retrieved successfully"))

})

const getWatchHistory = asyncHandler (async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }

                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: ["$ownerDetails", null]
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "User watch history retrieved successfully"))
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
    getUserChannelProfile,
    getWatchHistory,
    
}