import _ from "lodash";
import userQuery from "../utils/helper/dbHelper.js";

const getCommunityComments = async (req, res) => {
  const { id } = req.params; // Comment ID
  const { userId } = req.user; // User ID from the logged-in user's JWT token

  // Validate input
  if (!id || !userId) {
    return res.status(400).json({
      message: "Comment ID and user ID are required.",
    });
  }

  try {
    // Fetch the comment by ID
    const commentResult = await userQuery(
      "SELECT * FROM community_comments WHERE id = ?",
      [id]
    );

    // If no comment found, return a 404 response
    if (commentResult.length === 0) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Check if the comment belongs to the logged-in user
    if (commentResult[0].user_id !== userId) {
      return res.status(403).json({
        error: "Forbidden: You cannot access this comment.",
      });
    }

    // Return the comment details
    res.json({ comment: commentResult[0] });
  } catch (error) {
    res.status(500).json({
      message: "Database error while retrieving comment",
      details: error,
    });
  }
};

// Create a new comment
const postCommunityComments = async (req, res) => {
  const { post_id, comment } = req.body;
  const { userId } = req.user;

  if (!post_id || !comment || !userId) {
    return res
      .status(400)
      .json({ message: "Post ID, comment, and user ID are required." });
  }

  try {
    // Check if the post exists
    const postExists = await userQuery(
      "SELECT id FROM community_posts WHERE id = ?",
      [post_id]
    );
    if (postExists.length === 0) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Insert the new comment
    const result = await userQuery(
      "INSERT INTO community_comments (post_id, user_id, comment) VALUES (?, ?, ?)",
      [post_id, userId, comment]
    );
    res.status(201).json({
      message: "Comment created successfully.",
      commentId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Database error while creating comment",
      details: error,
    });
  }
};

// Update an existing comment
const updateCommunityComments = async (req, res) => {
  const { id } = req.params; // Comment ID
  const { comment } = req.body;
  const { userId } = req.user;

  if (!id || !comment || !userId) {
    return res.status(400).json({
      message: "Comment ID, new comment content, and user ID are required.",
    });
  }

  try {
    // Check if the comment exists
    const commentResult = await userQuery(
      "SELECT * FROM community_comments WHERE id = ?",
      [id]
    );
    if (commentResult.length === 0) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Check if the logged-in user is the owner of the comment
    if (commentResult[0].user_id !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden: You cannot update this comment." });
    }

    // Update the comment
    await userQuery(
      "UPDATE community_comments SET comment = ? WHERE id = ? AND user_id = ?",
      [comment, id, userId]
    );
    res.json({ message: "Comment updated successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Database error while updating comment",
      details: error,
    });
  }
};

// Delete a community comment
const deleteCommunityComments = async (req, res) => {
  const { id } = req.params; // Comment ID
  const { userId } = req.user; 

  // Check if the comment ID is provided
  if (!id || id === "" || id === undefined) {
    return res.status(400).json({ message: "Comment ID is required" });
  }

  // Validate input ID
  if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid comment ID. It should be a positive integer." });
  }

  try {
    // Check if the comment exists and belongs to the logged-in user
    const commentCheckQuery =
      "SELECT * FROM community_comments WHERE id = ?";
    const commentResult = await userQuery(commentCheckQuery, [id]);

    // If the comment doesn't exist
    if (commentResult.length === 0) {
      return res.status(404).json({ error: "Comment not found." });
    }

    // If the comment exists but doesn't belong to the logged-in user
    if (commentResult[0].user_id !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden: You cannot delete this comment." });
    }

    // Delete the comment if it belongs to the user
    const deleteQuery = "DELETE FROM community_comments WHERE id = ?";
    const deleteResult = await userQuery(deleteQuery, [id]);

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: "Comment not found." });
    }

    res.json({ message: `Comment ${id} deleted successfully.` });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Database error while deleting comment", details: err });
  }
};


export default {
  getCommunityComments,  
  postCommunityComments,
  updateCommunityComments,
  deleteCommunityComments,
};
