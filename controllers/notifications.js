import _ from "lodash";
import userQuery from '../utils/helper/dbHelper.js';

// Get all notifications for a specific user
const getNotifications = async (req, res) => {
  const { userId } = req.user;

  // Step 1: Validate userId is a number
  if (!_.isInteger(_.toNumber(userId)) || _.toNumber(userId) <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid user ID. It should be a positive integer." });
  }

  try {
    // Step 2: Check if the user exists in the database
    const userResults = await userQuery("SELECT id FROM users WHERE id = ?", [
      userId,
    ]);
    if (userResults.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    // Step 3: Fetch notifications if the user exists
    const notifications = await userQuery(
      "SELECT * FROM notifications WHERE user_id = ?",
      [userId]
    );
    res.json({ notifications });
  } catch (err) {
    res
      .status(500)
      .json({
        error: "Database error while fetching notifications.",
        details: err,
      });
  }
};

const postNotification = async (req, res) => {
  const { message } = req.body;
  const { userId } = req.user;

    if (!userId || _.isEmpty(message)) {
      return res.status(400).json({ error: "All required fields" });
    }
  
   // Step 1: Validate `user_id` is a number and `message` is a non-empty string
   if (!_.isInteger(_.toNumber(userId)) || _.toNumber(userId) <= 0) {
     return res
       .status(400)
       .json({ error: "Invalid user ID. It should be a positive integer." });
   }

   if (!_.isString(message) || _.isEmpty(message.trim())) {
     return res
       .status(400)
       .json({ error: "Invalid message. It should be a non-empty string." });
   }
  


   try {
     // Step 2: Check if the user exists
     const userExists = await userQuery("SELECT id FROM users WHERE id = ?", [
       userId,
     ]);
     if (userExists.length === 0) {
       return res.status(404).json({ error: "User not found." });
     }

     // Step 3: Insert the new notification
     const query =
       "INSERT INTO notifications (user_id, message, is_read, created_at) VALUES (?, ?, ?, NOW())";
     const result = await userQuery(query, [userId, message, false]);

     // Step 4: Send a success response
     res.status(201).json({
       id: result.insertId,
       userId,
       message,
       is_read: false,
       created_at: new Date(),
     });
   } catch (err) {
     // Handle database errors
     res.status(500).json({ error: "Database error.", details: err });
   }
};

const updateNotification = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user; 

  if (!id || id === "" || id === undefined) {
    return res.status(400).json({ message: "Notification ID is required" });
  }

  try {
    // Validate the notification ID
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    // Check if the notification exists and belongs to the user
    const notificationCheckQuery = "SELECT * FROM notifications WHERE id = ?";
    const notificationResult = await userQuery(notificationCheckQuery, [id]);

    // If the notification is not found
    if (notificationResult.length === 0) {
      return res.status(404).json({ message: `Notification ${id} not found` });
    }

    // If the notification does not belong to the logged-in user
    if (notificationResult[0].user_id !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You cannot update this notification" });
    }

    // Mark the notification as read
    const result = await userQuery(
      "UPDATE notifications SET is_read = ? WHERE id = ?",
      [true, id]
    );

    // If the notification is successfully marked as read
    if (result.affectedRows > 0) {
      res.json({ message: `Notification ${id} marked as read` });
    } else {
      return res.status(500).json({ message: "Failed to update notification" });
    }
  } catch (error) {
    // Catch any errors (e.g., database connection issues)
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Delete a notification by ID
const deleteNotification = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user; 
  if (!id || id === "" || id === undefined) {
    return res.status(400).json({ error: 'Notification ID is required.' });
  }
  // Step 1: Validate that `id` is a positive integer
  if (!_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res.status(400).json({ error: 'Invalid notification ID. It should be a positive integer.' });
  }

  try {
    // Step 2: Fetch the notification and check ownership
    const notificationResults = await userQuery('SELECT user_id FROM notifications WHERE id = ?', [id]);
    if (notificationResults.length === 0) {
      return res.status(404).json({ error: `Notification with ID ${id} not found.` });
    }

    const notificationOwnerId = notificationResults[0].user_id;

    // Step 3: Check if the logged-in user owns this notification
    if (notificationOwnerId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this notification.' });
    }

    // Step 4: Delete the notification if ownership is confirmed
    await userQuery('DELETE FROM notifications WHERE id = ?', [id]);
    res.json({ message: `Notification ${id} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Database error while deleting notification.', details: err });
  }
};

export default {
  getNotifications,
  postNotification,
  updateNotification,
  deleteNotification
};
