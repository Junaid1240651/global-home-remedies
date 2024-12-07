import userQuery from "../utils/helper/dbHelper.js";
import _ from "lodash";

const getAllRemedies = async (req, res) => {
  const loggedInUserId = req.user?.userId; 

  // Check if logged-in user ID is available
  if (!loggedInUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Fetch all remedies belonging to the logged-in user
    const remedies = await userQuery(
      `SELECT 
        r.id AS remedy_id, 
        r.title AS remedy_title, 
        r.ingredients, 
        r.preparation_process, 
        r.application_process, 
        r.benefits, 
        r.photo, 
        r.video, 
        r.created_at, 
        r.updated_at,
        c.id AS category_id,
        c.name AS category_name,
        u.id AS user_id,
        u.first_name,
        u.last_name, 
        u.email, 
        u.mobile_number
      FROM remedies r
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'approved'`,
    );

    // Check if the user has any remedies
    if (remedies.length === 0) {
      return res
        .status(404)
        .json({ message: "Remedy not found or Remedy is not Approved." });
    }

    // Send the list of remedies
    res.json({ remedies });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        error: "Database error while retrieving remedies.",
        details: error.message,
      });
  }
};

const getRemedies = async (req, res) => {
  const { id } = req.params; // Remedy ID to retrieve
  const loggedInUserId = req.user?.userId; // Logged-in user ID from the token or session

  // Check if logged-in user ID is available
  if (!loggedInUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Validate `id` as a positive integer
  if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid remedy ID. It should be a positive integer." });
  }

  try {
    // Fetch the remedy and ensure it belongs to the logged-in user
    const remedy = await userQuery(
      `SELECT 
        r.id AS remedy_id, 
        r.title AS remedy_title, 
        r.ingredients, 
        r.preparation_process, 
        r.application_process, 
        r.benefits, 
        r.photo, 
        r.video, 
        r.created_at, 
        r.updated_at,
        c.name AS category_name,
        u.id AS user_id,
        u.first_name,
        u.last_name, 
        u.email, 
        u.mobile_number
      FROM remedies r
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.user_id = u.id
      Where r.id = ? AND r.status = 'approved'`,
      id
    );

    // Check if the remedy exists and belongs to the logged-in user
    if (remedy.length === 0) {
      return res.status(404).json({
        error: "Remedy not found or Remedy is not Approved.",
      });
    }

    // Send the remedy data
    res.json({ remedy: remedy[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Database error while retrieving remedy.",
      details: error.message,
    });
  }
};

const postRemedies = async (req, res) => {
  const {
    category_id,
    title,
    ingredients,
    preparation_process,
    application_process,
    benefits,
    photo,
    video,
  } = req.body;

  const { userId } = req.user;

  // Check for required fields
  if (
    !userId ||
    !category_id ||
    _.isEmpty(title) ||
    _.isEmpty(ingredients) ||
    _.isEmpty(preparation_process) ||
    _.isEmpty(application_process) ||
    _.isEmpty(benefits) ||
    _.isEmpty(photo) ||
    _.isEmpty(video)
  ) {
    return res
      .status(400)
      .json({ message: "All required fields must be provided." });
  }

  // Validate input
  if (
    !_.isInteger(_.toNumber(userId)) ||
    !_.isInteger(_.toNumber(category_id))
  ) {
    return res.status(400).json({
      error: "Invalid input: user_id and category_id must be integers.",
    });
  }

  try {
    // Check if the user exists
    const userExistsQuery = "SELECT id FROM users WHERE id = ?";
    const userExists = await userQuery(userExistsQuery, [userId]);
    if (userExists.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the category exists
    const categoryExistsQuery = "SELECT id FROM categories WHERE id = ?";
    const categoryExists = await userQuery(categoryExistsQuery, [category_id]);
    if (categoryExists.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    // If both user and category exist, insert the remedy
    const insertQuery = `
      INSERT INTO remedies 
      (user_id, category_id, title, ingredients, preparation_process, application_process, benefits, photo, video, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    const result = await userQuery(insertQuery, [
      userId,
      category_id,
      title,
      ingredients || null,
      preparation_process || null,
      application_process || null,
      benefits || null,
      photo || null,
      video || null,
    ]);

    res
      .status(201)
      .json({ id: result.insertId, message: "Remedy created successfully." });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while creating remedy", details: err });
  }
};

const updateRemedies = async (req, res) => {
  const {
    category_id,
    title,
    ingredients,
    preparation_process,
    application_process,
    benefits,
    photo,
    video,
  } = req.body;

  const { userId } = req.user; // User ID from the JWT token
  const { id: remedyId } = req.params; // Remedy ID to be updated

  // Check for required fields
  if (!category_id || !userId || !remedyId) {
    return res.status(400).json({ message: "Required fields are missing." });
  }

  // Ensure at least one field is provided
  if (
    _.isEmpty(title) &&
    _.isEmpty(ingredients) &&
    _.isEmpty(preparation_process) &&
    _.isEmpty(application_process) &&
    _.isEmpty(benefits) &&
    _.isEmpty(photo) &&
    _.isEmpty(video)
  ) {
    return res.status(400).json({ message: "At least one field is required." });
  }

  // Validate input
  if (
    !_.isInteger(_.toNumber(userId)) ||
    !_.isInteger(_.toNumber(remedyId)) ||
    (category_id && !_.isInteger(_.toNumber(category_id)))
  ) {
    return res.status(400).json({
      error:
        "Invalid input: user_id, remedy_id, and category_id must be integers.",
    });
  }

  try {
    // Check if the remedy exists in the database
    const remedyExistsQuery = "SELECT * FROM remedies WHERE id = ?";
    const remedyExists = await userQuery(remedyExistsQuery, [remedyId]);

    if (remedyExists.length === 0) {
      return res.status(404).json({ error: "Remedy not found." });
    }

    // Check if the remedy belongs to the logged-in user
    if (remedyExists[0].user_id !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden: You cannot update this remedy." });
    }

    // Check if the category exists, if category_id is provided
    if (category_id) {
      const categoryExistsQuery = "SELECT id FROM categories WHERE id = ?";
      const categoryExists = await userQuery(categoryExistsQuery, [
        category_id,
      ]);
      if (categoryExists.length === 0) {
        return res.status(404).json({ error: "Category not found" });
      }
    }

    // Prepare the update query with the provided fields, and retain old values for non-provided fields
    const updateQuery = `
      UPDATE remedies 
      SET 
        category_id = COALESCE(?, category_id),
        title = COALESCE(?, title),
        ingredients = COALESCE(?, ingredients),
        preparation_process = COALESCE(?, preparation_process),
        application_process = COALESCE(?, application_process),
        benefits = COALESCE(?, benefits),
        photo = COALESCE(?, photo),
        video = COALESCE(?, video),
        updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `;

    const result = await userQuery(updateQuery, [
      category_id || null,
      title || null,
      ingredients || null,
      preparation_process || null,
      application_process || null,
      benefits || null,
      photo || null,
      video || null,
      remedyId,
      userId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Failed to update remedy." });
    }

    res.status(200).json({ message: "Remedy updated successfully." });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while updating remedy", details: err });
  }
};



const deleteRemedies = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user; 

  if (!id || id === "" || id === undefined) {
    return res.status(400).json({ message: "Remedy ID is required" });
  }

  // Validate input
  if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res.status(400).json({
      error: "Invalid remedy ID. It should be a positive integer.",
    });
  }

  try {
    // Check if the remedy exists and belongs to the user
    const remedyCheckQuery =
      "SELECT * FROM remedies WHERE id = ?";
    const remedyResult = await userQuery(remedyCheckQuery, [id]);
console.log(id);

    // If the remedy is not found
    if (remedyResult.length === 0) {
      return res.status(404).json({ error: "Remedy not found." });
    }

    // If the remedy does not belong to the user
    if (remedyResult[0].user_id !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden: You cannot delete this remedy." });
    }

    // Delete the remedy from the database
    const deleteQuery = "DELETE FROM remedies WHERE id = ?";
    const deleteResult = await userQuery(deleteQuery, [id]);

    // Check if the remedy was successfully deleted
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: "Remedy not found." });
    }

    res.json({ message: `Remedy ${id} deleted successfully.` });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Database error while deleting remedy", details: err });
  }
};


export default {
  getAllRemedies,
  getRemedies,
  postRemedies,
  updateRemedies,
  deleteRemedies,
};
