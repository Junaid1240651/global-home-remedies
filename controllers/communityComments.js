import _ from "lodash";
import userQuery from "../utils/helper/dbHelper.js";

const getCommunityComments = async (req, res) => {
  const { id } = req.params; // Post ID
  const { userId } = req.user; // User ID from the logged-in user's JWT token

  // Validate input
  if (!id || !userId) {
    return res.status(400).json({
      message: "Post ID and user ID are required.",
    });
  }

  try {
    // Fetch the comment by ID and get user details belonging to the comment

    const commentQuery = `
      SELECT 
        c.*, 
        u.username, 
        u.profile_picture, 
        u.first_name, 
        u.last_name,
        u.email,
        EXISTS(
          SELECT 1 
          FROM comment_likes cl
          WHERE cl.comment_id = c.id AND cl.user_id = ?
        ) AS isLiked,
        EXISTS(
          SELECT 1
          FROM comment_dislikes cd
          WHERE cd.comment_id = c.id AND cd.user_id = ?
        ) AS isDisliked
      FROM 
        community_comments c
      INNER JOIN 
        users u 
      ON 
        c.user_id = u.id
      WHERE 
        c.post_id = ?
      ORDER BY 
        c.created_at DESC`;

    const commentResult = await userQuery(commentQuery, [userId, userId, id]);
    // If no comment found, return a 404 response
    if (commentResult.length === 0) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Return the comment details
    res.json({ comment: commentResult });
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

const likeCommunityComment = async (req, res) => {
  const { id } = req.params; // Comment ID
  const { userId } = req.user; // User ID

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
    // Check if the comment exists
    const commentCheckQuery =
      "SELECT * FROM community_comments WHERE id = ?";
    const commentResult = await userQuery(commentCheckQuery, [id]);

    // If the comment doesn't exist
    if (commentResult.length === 0) {
      return res.status(404).json({ error: "Comment not found." });
    }

    // Check if the user has already liked the comment
    const likeCheckQuery =
      "SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?";
    const likeCheckResult = await userQuery(likeCheckQuery, [id, userId]);

    // If the user has already liked the comment
    if (likeCheckResult.length > 0) {
      return res.status(400).json({ error: "You have already liked this comment." });
    }

    // If the user has not liked the comment, insert a new like
    const likeQuery = "INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)";
    await userQuery(likeQuery, [id, userId]);

    //update the dislike table if the user has like the comment
    const dislikeCheckQuery = "SELECT * FROM comment_dislikes WHERE comment_id = ? AND user_id = ?";
    const dislikeCheckResult = await userQuery(dislikeCheckQuery, [id, userId]);

    if (dislikeCheckResult.length > 0) {
      const dislikeDeleteQuery = "DELETE FROM comment_dislikes WHERE comment_id = ? AND user_id = ?";
      await userQuery(dislikeDeleteQuery, [id, userId]);
    }

    //update the total likes in the comments table and decrease the dislikes if the user has liked the comment

    if(dislikeCheckResult.length > 0){
      const updateQuery = "UPDATE community_comments SET likes = likes + 1, dislikes = dislikes - 1 WHERE id = ?";
      await userQuery(updateQuery, [id]);
    } else {
      const updateQuery = "UPDATE community_comments SET likes = likes + 1 WHERE id = ?";
      await userQuery(updateQuery, [id]);
    }

    res.json({ message: `You have liked comment ${id}.` });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Database error while liking comment", details: err });
  }
}

const dislikeCommunityComment = async (req, res) => {
  const { id } = req.params; // Comment ID
  const { userId } = req.user; // User ID from the logged-in JWT token

  // Validate Comment ID
  if (!id || isNaN(Number(id)) || Number(id) <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid comment ID. It should be a positive integer." });
  }

  try {
    // Check if the comment exists
    const commentCheckQuery = "SELECT * FROM community_comments WHERE id = ?";
    const [comment] = await userQuery(commentCheckQuery, [id]);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found." });
    }

    // Check if the user has already disliked the comment
    const dislikeCheckQuery =
      "SELECT * FROM comment_dislikes WHERE comment_id = ? AND user_id = ?";
    const [existingDislike] = await userQuery(dislikeCheckQuery, [id, userId]);

    if (existingDislike) {
      return res
        .status(400)
        .json({ error: "You have already disliked this comment." });
    }

    // Check if the user has liked the comment

    const likeCheckQuery = "SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?";
    const likeResult = await userQuery(likeCheckQuery, [id, userId]);

    if (likeResult.length > 0) {
      const likeDeleteQuery = "DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?";
      await userQuery(likeDeleteQuery, [id, userId]);
    }

    // Insert the new dislike
    const dislikeQuery =
      "INSERT INTO comment_dislikes (comment_id, user_id) VALUES (?, ?)";
    await userQuery(dislikeQuery, [id, userId]);

    // Update the total dislikes in the comments table
    if(likeResult.length > 0){
      const updateQuery = "UPDATE community_comments SET dislikes = dislikes + 1, likes = likes - 1 WHERE id = ?";
      await userQuery(updateQuery, [id]);
    } else {
      const updateQuery = "UPDATE community_comments SET dislikes = dislikes + 1 WHERE id = ?";
      await userQuery(updateQuery, [id]);
    }

    res.json({ message: `You have disliked comment ${id}.` });
  } catch (err) {
    console.error("Error while disliking comment:", err);
    res
      .status(500)
      .json({ error: "Database error while disliking comment", details: err });
  }
};

export default {
  getCommunityComments,  
  postCommunityComments,
  updateCommunityComments,
  deleteCommunityComments,
  likeCommunityComment,
  dislikeCommunityComment
};
