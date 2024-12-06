import userQuery from "../utils/helper/dbHelper.js";
import _ from "lodash";
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


const getAllCategories = async (req, res) => {

  try {
    // Fetch categories associated with the user
    const query = "SELECT * FROM categories";
    const categories = await userQuery(query);

    if (_.isEmpty(categories)) {
      return res.status(404).json({ message: "No categories found for this user." });
    }

    res.status(200).json(categories);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while retrieving categories.", details: err });
  }
};


const postCategories = async (req, res) => {
  // Ensure image upload middleware is executed first
  handleImageUpload(req, res, async () => {
    const { name, description } = req.body;

    // Input validation for required fields
    if (_.isEmpty(name) || _.isEmpty(description)) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!_.isString(name) || !_.isString(description)) {
      return res.status(400).json({ error: "Invalid input. Name and description must be strings." });
    }

    // Get the image URL from the S3 upload
    const img = req.file?.location;
    if (!img) {
      return res.status(400).json({ message: "Image upload failed." });
    }

    try {
      // Insert category with image URL into the database
      const query = "INSERT INTO categories (name, description, img) VALUES (?, ?, ?)";
      const result = await userQuery(query, [name, description, img]);

      // Send success response with category data
      return res.status(201).json({
        status: "200",
        message: "Category created successfully",
        data: {
          id: result.insertId,
          name,
          description,
          img,
        },
      });
    } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while creating category.", details: err });
  }
  });
};

// Update category with optional image upload
const updateCategories = async (req, res) => {
  // Ensure image upload middleware is executed first
  handleImageUpload(req, res, async () => {
    const { id } = req.params;
    const { name, description } = req.body;
    const img = req.file?.location;

    if (!id || _.isEmpty(id)) {
      return res.status(400).json({ message: "Category ID is required." });
    }

    if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
      return res.status(400).json({ error: "Invalid category ID. It should be a positive integer." });
    }

    try {
      // Check if category exists
      const existingCategory = await userQuery("SELECT * FROM categories WHERE id = ?", [id]);
      if (existingCategory.length === 0) {
        return res.status(404).json({ error: "Category not found." });
      }

      // Update the category
      const query = "UPDATE categories SET name = ?, description = ?, img = ? WHERE id = ?";
      await userQuery(query, [
        name || existingCategory[0].name,
        description || existingCategory[0].description,
        img || existingCategory[0].img,
        id,
      ]);

      // Send success response
      res.status(200).json({
        message: `Category ${id} updated successfully.`,
        img: img || existingCategory[0].img,
      });
    } catch (err) {
      res.status(500).json({ error: "Database error while updating category.", details: err });
    }
  });
};

const deleteCategories = async (req, res) => {
  const { id } = req.params;
    if (!id || id === "" || id === undefined) {
    return res.status(400).json({ message: "Category ID is required" });
    }
  // Validation
  if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid category ID. It should be a positive integer." });
  }

  try {
    // Check if category exists
    const categoryResults = await userQuery(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );
    if (categoryResults.length === 0) {
      return res
        .status(404)
        .json({ error: `Category with ID ${id} not found.` });
    }

    // Delete the category
    await userQuery("DELETE FROM categories WHERE id = ?", [id]);
    res.status(200).json({ message: `Category ${id} deleted successfully.` });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while deleting category.", details: err });
  }

};

export default {
  postCategories,
  updateCategories,
  deleteCategories,
  getAllCategories
};
