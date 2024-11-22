import userQuery from "../utils/helper/dbHelper.js";
import _ from "lodash";

const getAllCommunityPosts = async (req, res) => {
  const loggedInUserId = req.user?.userId; 
  // Check if logged-in user ID is available
  if (!loggedInUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Fetch all community posts belonging to the logged-in user
    const posts = await userQuery(
      "SELECT * FROM community_posts WHERE user_id = ?",
      [loggedInUserId]
    );

    // Check if the user has any posts
    if (posts.length === 0) {
      return res
        .status(404)
        .json({ message: "No community posts found for this user." });
    }

    // Return the list of community posts
    res.json({ posts });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        error: "Database error while retrieving community posts.",
        details: error.message,
      });
  }
};

const getCommunityPosts = async (req, res) => {
  const { id } = req.params; // Get the post ID from the URL parameters
  const loggedInUserId = req.user?.userId; // Logged-in user ID from the token or session

  // Check if logged-in user ID is available
  if (!loggedInUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Validate the post ID
  if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res.status(400).json({ error: "Invalid post ID." });
  }

  try {
    // Query to fetch the post based on ID and check if it belongs to the logged-in user
    const post = await userQuery(
      "SELECT * FROM community_posts WHERE id = ? AND user_id = ?",
      [id, loggedInUserId]
    );

    // Check if the post exists
    if (post.length === 0) {
      return res
        .status(404)
        .json({ message: "Post not found or does not belong to you." });
    }

    // Return the post details
    res.json({
      post: post[0],
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        error: "Server error while retrieving the post.",
        details: error.message,
      });
  }
};

const postCommunityPosts = async (req, res) => {
  const { title, body } = req.body;
  const { userId } = req.user;
    if (!userId || _.isEmpty(title) || _.isEmpty(body)) {
      return res.status(400).json({ message: "All required fields" });
    }
  // Validate input
  if (
    !userId ||
    !_.isInteger(_.toNumber(userId)) ||
    !title ||
    typeof title !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "Invalid input: user_id and title are required." });
  }

  try {
    const query =
      "INSERT INTO community_posts (user_id, title, body, created_at) VALUES (?, ?, ?, NOW())";
    const result = await userQuery(query, [userId, title, body || null]);
    res.status(201).json({
      id: result.insertId,
      userId,
      title,
      body,
      created_at: new Date(),
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while creating post", details: err });
  }
};

const updateCommunityPosts = async (req, res) => {
  const { id } = req.params;
  const { title, body } = req.body;
  const loggedInUserId = req.user?.userId; 

  // Check if logged-in user ID is available
  if (!loggedInUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Ensure that either title or body is provided for the update
  if (_.isEmpty(title) && _.isEmpty(body)) {
    return res
      .status(400)
      .json({ message: "At least one field (title or body) is required" });
  }

  // Validate input
  if (
    !_.isInteger(_.toNumber(id)) ||
    _.toNumber(id) <= 0 ||
    (title && typeof title !== "string")
  ) {
    return res
      .status(400)
      .json({ error: "Invalid input: valid id and title are required." });
  }

  try {
    // Check if the post exists and belongs to the logged-in user
    const postCheckQuery = "SELECT user_id FROM community_posts WHERE id = ?";
    const postCheck = await userQuery(postCheckQuery, [id]);

    if (postCheck.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Ensure the logged-in user is the owner of the post
    if (postCheck[0].user_id !== loggedInUserId) {
      return res
        .status(403)
        .json({
          message: "Forbidden: You do not have permission to update this post.",
        });
    }

    // Prepare the update query
    const updateQuery =
      "UPDATE community_posts SET title = ?, body = ?, updated_at = NOW() WHERE id = ?";
    const result = await userQuery(updateQuery, [
      title || postCheck[0].title,
      body || postCheck[0].body,
      id,
    ]);

    // Check if any rows were affected (i.e., the post was updated)
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Post not found or no changes were made." });
    }

    // Return a success message
    res.json({ message: `Post ${id} updated successfully.` });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        error: "Database error while updating post",
        details: err.message,
      });
  }
};

const deleteCommunityPosts = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user; 

  // Check if the post ID is provided
  if (!id || id === "" || id === undefined) {
    return res.status(400).json({ message: "Community Post ID is required" });
  }

  // Validate input ID
  if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid post ID. It should be a positive integer." });
  }

  try {
    // Check if the community post exists and belongs to the logged-in user
    const postCheckQuery =
      "SELECT * FROM community_posts WHERE id = ?";
    const postResult = await userQuery(postCheckQuery, [id]);

    // If the post doesn't exist
    if (postResult.length === 0) {
      return res.status(404).json({ error: "Community Post not found." });
    }

    // If the post exists but doesn't belong to the logged-in user
    if (postResult[0].user_id !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden: You cannot delete this community post." });
    }

    // Delete the post if it belongs to the user
    const deleteQuery = "DELETE FROM community_posts WHERE id = ?";
    const deleteResult = await userQuery(deleteQuery, [id]);

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: "Community Post not found." });
    }

    res.json({ message: `Community Post ${id} deleted successfully.` });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Database error while deleting post", details: err });
  }
};


export default {
  getCommunityPosts,
  getAllCommunityPosts,
  postCommunityPosts,
  updateCommunityPosts,
  deleteCommunityPosts,
};
