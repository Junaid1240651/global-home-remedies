import _ from 'lodash';
import userQuery from "../utils/helper/dbHelper.js";

const getReviews = async (req, res) => {
    const { id } = req.params;
  const loggedInUserId = req.user?.userId; 

  // Check if logged-in user ID is available
  if (!loggedInUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Validate `id` as a positive integer
  if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid review ID. It should be a positive integer." });
  }

  try {
    // Fetch the review by ID and check if it belongs to the logged-in user
    const review = await userQuery(
      "SELECT * FROM reviews WHERE id = ? AND user_id = ?",
      [id, loggedInUserId]
    );

    // Check if the review exists and belongs to the logged-in user
    if (review.length === 0) {
      return res
        .status(404)
        .json({
          error: "Review not found or you do not have permission to view it.",
        });
    }

    // Send the review data
    res.json({ review: review[0] });
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
  const { remedy_id, rating, review } = req.body;
    const user_id = req.user.userId;
    console.log(user_id);
    console.log(req.body);
    
    
  // Validate required fields
  if (!remedy_id || !user_id || !rating || _.isEmpty(review)) {
    return res.status(400).json({ message: "All required fields" });
  }

  // Validate integer input
  if (
    !_.isInteger(_.toNumber(remedy_id)) ||
    !_.isInteger(_.toNumber(user_id)) ||
    !_.isInteger(_.toNumber(rating))
  ) {
    return res.status(400).json({
      message: "Invalid input: remedy_id, user_id, and rating must be integers",
    });
  }

  // Validate rating range
  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      message: "Rating must be a number between 1 and 5",
    });
  }

  try {
    // Check if the user exists
    const userCheck = await userQuery("SELECT id FROM users WHERE id = ?", [user_id]);
    if (userCheck.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the remedy exists
    const remedyCheck = await userQuery("SELECT id FROM remedies WHERE id = ?", [remedy_id]);
    if (remedyCheck.length === 0) {
      return res.status(404).json({ message: "Remedy not found" });
    }

    // Insert the review into the database
    const result = await userQuery(
      "INSERT INTO reviews (remedy_id, user_id, rating, review) VALUES (?, ?, ?, ?)",
      [remedy_id, user_id, rating, review]
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
  const { rating, review } = req.body;
  const loggedInUserId = req.user?.userId; // Assumes `req.user.id` contains the logged-in user's ID

  // Check if logged-in user ID is available
  if (!loggedInUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
    if (!id || id === "" || id === undefined) {
    return res.status(400).json({ message: "Review ID is required" });
    }
    if (_.isEmpty(rating) && _.isEmpty(review)) {
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

    res.json({ message: `Review ${id} updated successfully` });
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
