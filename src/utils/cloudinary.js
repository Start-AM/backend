import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    const absoluteFilePath = path.isAbsolute(localFilePath)
    ? localFilePath 
    :path.resolve(localFilePath)

    try {
        if (!absoluteFilePath) return null;

        const response = await cloudinary.uploader.upload(absoluteFilePath, {
            resource_type: 'auto'
        });

        console.log('File uploaded to Cloudinary:');
        return response;
    } catch (error) {
        console.error('[Cloudinary upload error]', error);

        if (fs.existsSync(absoluteFilePath)) {
            try {
                fs.unlinkSync(absoluteFilePath);
            } catch (unlinkError) {
                console.warn('Failed to delete local file:', unlinkError.message);
            }
        }

        return null;
    }
};

export {uploadOnCloudinary}