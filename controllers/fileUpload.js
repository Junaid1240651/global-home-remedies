import multer from "multer";
import AWS from 'aws-sdk';
import multerS3 from 'multer-s3';

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION // Make sure this is set correctly
});

const s3 = new AWS.S3();

// multer-s3 storage configuration for uploading images to S3
let storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    acl: 'public-read', // Make sure the ACL fits your use case
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        cb(null, Date.now().toString() + '-' + file.originalname); // Unique file name
    }
});

// Setup multer upload
let upload = multer({ storage: storage });

// Middleware to handle image upload
const handleImageUpload = (req, res, next) => {
    upload.single("img")(req, res, (err) => {
        if (err) {
            return res.status(500).json({ error: "Error uploading the image", details: err });
        }
        next();
    });
};

// fileUpload

const fileUpload = async (req, res) => {
    // Ensure image upload middleware is executed first
    handleImageUpload(req, res, async () => {

        // Get the image URL from the S3 upload
        const img = req.file?.location;
        if (!img) {
            return res.status(400).json({ message: "Image upload failed." });
        }

        try {

            // Send success response with category data
            return res.status(201).json({
                status: "200",
                message: "Image upload successfully",
                img: img
            });
        } catch (err) {
            res
                .status(500)
                .json({ error: "Database error while creating category.", details: err });
        }
    });
};

export default {
    fileUpload
};
