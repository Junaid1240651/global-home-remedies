import userQuery from "../utils/helper/dbHelper.js";
import _ from "lodash";

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
  const { name, description,img } = req.body;

  if (_.isEmpty(name) || _.isEmpty(description) || _.isEmpty(img)) {
    return res.status(400).json({ message: "All required fields" });
  }
  // Validation
  if (!_.isString(name) || _.isEmpty(name) || !_.isString(description) || _.isEmpty(description) || !_.isString(img) || _.isEmpty(img)) {
    return res.status(400).json({
      error: "Category name,description,img is required and should be a non-empty string.",
    });
  }
  

  try {
    const query = "INSERT INTO categories (name, description, img) VALUES (?, ?, ?)";
    const result = await userQuery(query, [name, description, img]);
    res.status(201).json({ id: result.insertId, name, description, img });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while creating category.", details: err });
  }
};
const updateCategories = async (req, res) => {
  const { id } = req.params;
  const { name, description, img } = req.body;
// Check if at least one field is provided
    if (_.isEmpty(name) && _.isEmpty(description) && _.isEmpty(img)) {
    return res.status(400).json({ message: "At least one field is required" });
  }
    if (!id || id === "" || id === undefined) {
    return res.status(400).json({ message: "Category ID is required" });
  }
  // Validation
  if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid category ID. It should be a positive integer." });
  }
  if (name && (!_.isString(name) || _.isEmpty(name))) {
    return res
      .status(400)
      .json({ error: "Category name should be a non-empty string." });
  }

  try {
    // Check if category exists
    const existingCategory = await userQuery(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );
    if (existingCategory.length === 0) {
      return res.status(404).json({ error: "Category not found." });
    }

    // Update the category
    const query =
      "UPDATE categories SET name = ?, description = ?, img = ? WHERE id = ?";
    await userQuery(query, [
      name || existingCategory[0].name,
      description || existingCategory[0].description,
      img || existingCategory[0].img,
      id,
    ]);
    res.json({ message: `Category ${id} updated successfully.` });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while updating category.", details: err });
  }
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
    res.json({ message: `Category ${id} deleted successfully.` });
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
