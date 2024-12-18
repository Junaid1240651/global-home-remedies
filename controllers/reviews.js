import _ from 'lodash';
import userQuery from "../utils/helper/dbHelper.js";

const getReviews = async (req, res) => {
    const { id } = req.params;

  // Validate `id` as a positive integer
  if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid review ID. It should be a positive integer." });
  }

  try {
    // Fetch the review by ID and check if it belongs to the logged-in user
    const reviewQuery = `
      SELECT 
        reviews.*,
        users.id AS user_id,
        users.first_name AS user_first_name,
        users.last_name AS user_last_name,
        users.profile_picture AS user_profile_picture,
        users.email AS user_email,
        users.username AS user_username
      FROM 
        reviews
      JOIN 
        users 
      ON 
        reviews.user_id = users.id
      WHERE 
        reviews.remedy_id = ?
    `;
    const review = await userQuery(reviewQuery, [id]);

    // Check if the review exists and belongs to the logged-in user
    if (review.length === 0) {
      return res
        .status(404)
        .json({
          error: "Review not found",
        });
    }

    // Send the review data
    res.status(200).json({review: review});
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        error: "Database error while retrieving review.",
        details: error.message,
      });
  }
};

const postReviews = async (req, res) => {
  const { remedy_id, rating, review, review_title } = req.body;
    const user_id = req.user.userId;
    
  // Validate required fields
  if (!remedy_id || !user_id || rating === undefined || !review) {
    return res.status(422).json({ message: "Missing required fields: remedy_id, user_id, rating, and review" });
  }

  // Validate integer input for remedy_id and user_id
  if (!Number.isInteger(Number(remedy_id)) || !Number.isInteger(Number(user_id))) {
    return res.status(422).json({
      message: "Invalid input: remedy_id and user_id must be integers",
    });
  }

  // Validate rating: float with at most 2 decimals, and range between 1.00 and 5.00
  const ratingNum = parseFloat(rating);
  if (
    isNaN(ratingNum) ||
    ratingNum < 1.0 ||
    ratingNum > 5.0 ||
    !/^\d+(\.\d{1})?$/.test(rating.toString())
  ) {
    return res.status(422).json({
      message: "Rating must be a number between 1.00 and 5.00, with up to 2 decimal places",
    });
  }

  // Validate review and review_title
  if (!review_title?.trim() || !review.trim()) {
    return res.status(422).json({ message: "Review title and review are required" });
  }

  try {
    
    // Check if the remedy exists
    const remedyCheck = await userQuery("SELECT id FROM remedies WHERE id = ?", [remedy_id]);
    if (remedyCheck.length === 0) {
      return res.status(404).json({ message: "Remedy not found" });
    }

    // Check if the user has already reviewed the remedy
    const reviewCheck = await userQuery(
      "SELECT id FROM reviews WHERE remedy_id = ? AND user_id = ?",
      [remedy_id, user_id]
    );

    if (reviewCheck.length > 0) {
      return res.status(409).json({ message: "You have already reviewed this remedy" });
    }

    // Insert the review into the database
    const result = await userQuery(
      "INSERT INTO reviews (remedy_id, user_id, rating, review, review_title) VALUES (?, ?, ?, ?, ?)",
      [remedy_id, user_id, ratingNum, review.trim(), review_title.trim()]
    );

    res.status(201).json({
      message: "Review created successfully",
      reviewId: result.insertId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateReviews = async (req, res) => {
  const { id } = req.params; // Review ID to be updated
  const { rating, review, review_title } = req.body;
  const loggedInUserId = req.user?.userId; // Assumes `req.user.id` contains the logged-in user's ID

  // Check if logged-in user ID is available
  if (!loggedInUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
    if (!id || id === "" || id === undefined) {
    return res.status(400).json({ message: "Review ID is required" });
    }
    if (_.isEmpty(rating) && _.isEmpty(review) && _.isEmpty(review_title)) {
    return res.status(400).json({ message: "At least one field is required" });
    }

  // Validate required fields
  if (_.isNil(rating) && _.isEmpty(review)) { // Check for null or undefined rating with _.isNil
    return res
      .status(400)
      .json({ message: "At least one field (rating or review) is required" });
  }

  // Validate `id` as an integer
  if (!_.isInteger(_.toNumber(id))) {
    return res.status(400).json({ message: "Invalid review ID" });
  }

  // Validate `rating` if provided
  if (
    !_.isNil(rating) && // Only validate if rating is provided (not null or undefined)
    (!_.isInteger(_.toNumber(rating)) || rating < 1 || rating > 5)
  ) {
    return res
      .status(400)
      .json({ message: "Rating must be an integer between 1 and 5" });
  }

  try {
    // Check if the review exists and belongs to the logged-in user
    const reviewCheck = await userQuery(
      "SELECT user_id FROM reviews WHERE id = ?",
      [id]
    );
    if (reviewCheck.length === 0) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (reviewCheck[0].user_id !== loggedInUserId) {
      return res
        .status(403)
        .json({
          message: "Forbidden: You do not have permission to update this review",
        });
    }

    // Prepare update fields
    const fieldsToUpdate = [];
    const values = [];
    if (!_.isNil(rating)) { // Only add rating if it’s not null or undefined
      fieldsToUpdate.push("rating = ?");
      values.push(rating);
    }
    if (!_.isEmpty(review)) { // Only add review if it’s not empty
      fieldsToUpdate.push("review = ?");
      values.push(review);
    }
    if (!_.isEmpty(review_title)) { // Only add review if it’s not empty
      fieldsToUpdate.push("review_title = ?");
      values.push(review_title);
    }
    values.push(id); // Add `id` as the last value for WHERE clause

    // Update the review in the database
    const updateQuery = `UPDATE reviews SET ${fieldsToUpdate.join(
      ", "
    )} WHERE id = ?`;
    const result = await userQuery(updateQuery, values);

    // Check if the review was updated
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Review not found or no change in data" });
    }

    res.status(200).json({ message: "Review updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteReviews = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user; 
  if (!id || id === "" || id === undefined) {
    return res.status(400).json({ message: "Review ID is required" });
  }

  try {
    // Validate the review ID
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    // Check if the review exists and belongs to the user
    const reviewCheckQuery = "SELECT * FROM reviews WHERE id = ?";
    const reviewResult = await userQuery(reviewCheckQuery, [id]);

    // If the review is not found
    if (reviewResult.length === 0) {
      return res.status(404).json({ message: `Review ${id} not found` });
    }

    // If the review does not belong to the logged-in user
    if (reviewResult[0].user_id !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You cannot delete this review" });
    }

    // Delete the review from the database
    const deleteQuery = "DELETE FROM reviews WHERE id = ?";
    const deleteResult = await userQuery(deleteQuery, [id]);

    // Check if the review was successfully deleted
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: `Review ${id} deleted successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export default {
  getReviews,
  postReviews,
  updateReviews,
  deleteReviews,
};
