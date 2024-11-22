import userQuery from "../utils/helper/dbHelper.js";
import _ from "lodash";

const getAllAiFilterLogs = async (req, res) => {
  const { content_type, flagged_for, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  // Build the WHERE clause dynamically based on filters
  let conditions = [];
  let params = [];

  if (content_type) {
    const validContentTypes = ["review", "community_post", "community_comment"];
    if (!validContentTypes.includes(content_type)) {
      return res.status(400).json({ message: "Invalid content type." });
    }
    conditions.push("content_type = ?");
    params.push(content_type);
  }

  if (flagged_for) {
    conditions.push("flagged_for LIKE ?");
    params.push(`%${flagged_for}%`);
  }

  const whereClause =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  try {
    const query = `
      SELECT * FROM ai_filter_logs ${whereClause} 
      LIMIT ? OFFSET ?
    `;

    // Pass `limit` and `offset` as numbers
    params.push(Number(limit), Number(offset));

    const logs = await userQuery(query, params);
    res.json({ logs });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch AI filter logs", details: err });
  }
};



const postAiFilterLog = async (req, res) => {
    const { content_type, content_id, flagged_for } = req.body;

    // Validate required fields
    if (!content_type || !content_id || !flagged_for) {
      return res
        .status(400)
        .json({
          message: "Content type, content ID, and flagged reason are required.",
        });
    }

    // Validate content type
    const validContentTypes = ["review", "community_post", "community_comment"];
    if (!validContentTypes.includes(content_type)) {
      return res.status(400).json({ message: "Invalid content type." });
    }

    try {
      const query = `
      INSERT INTO ai_filter_logs (content_type, content_id, flagged_for) 
      VALUES (?, ?, ?)
    `;
      const result = await userQuery(query, [
        content_type,
        content_id,
        flagged_for,
      ]);

      res.status(201).json({
        message: "AI filter log created successfully",
        id: result.insertId,
      });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to create AI filter log", details: err });
    }
};

const updateAiFilterLog = async (req, res) => {
  const { id } = req.params;
  const { content_type, content_id, flagged_for } = req.body;
  
    if (_.isEmpty(content_type) && _.isEmpty(content_id) && _.isEmpty(flagged_for)) {
    return res.status(400).json({ message: "At least one field is required." });
  }
  // Validate that ID is provided and is a positive integer
  if (!id || !_.isInteger(_.toNumber(id)) || _.toNumber(id) <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid log ID. It should be a positive integer." });
  }

  // Validate each field if provided
  const allowedContentTypes = ["review", "community_post", "community_comment"];
  if (content_type && !allowedContentTypes.includes(content_type)) {
    return res
      .status(400)
      .json({
        error:
          "Invalid content_type. Must be 'review', 'community_post', or 'community_comment'.",
      });
  }
  if (
    content_id &&
    (!_.isInteger(_.toNumber(content_id)) || _.toNumber(content_id) <= 0)
  ) {
    return res
      .status(400)
      .json({ error: "Invalid content_id. It should be a positive integer." });
  }
  if (flagged_for && typeof flagged_for !== "string") {
    return res
      .status(400)
      .json({ error: "Invalid flagged_for value. It should be a string." });
  }

  try {
    // Check if the log exists
    const logExistsQuery = "SELECT id FROM ai_filter_logs WHERE id = ?";
    const logExists = await userQuery(logExistsQuery, [id]);
    if (logExists.length === 0) {
      return res.status(404).json({ error: `Log with ID ${id} not found.` });
    }

    // Prepare dynamic SQL for updating only provided fields
    const fieldsToUpdate = {};
    if (content_type) fieldsToUpdate.content_type = content_type;
    if (content_id) fieldsToUpdate.content_id = content_id;
    if (flagged_for) fieldsToUpdate.flagged_for = flagged_for;

    // Generate the SQL update statement dynamically
    const setClause = Object.keys(fieldsToUpdate)
      .map((field) => `${field} = ?`)
      .join(", ");
    const queryParams = [...Object.values(fieldsToUpdate), id];

    const updateQuery = `UPDATE ai_filter_logs SET ${setClause} WHERE id = ?`;
    const result = await userQuery(updateQuery, queryParams);

    if (result.affectedRows === 0) {
      return res
        .status(500)
        .json({ error: "Failed to update the AI filter log." });
    }

    res.json({ message: `Log ${id} updated successfully.` });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while updating log", details: err });
  }
};



const deleteAiFilterLog = async (req, res) => {
    const { id } = req.params;

    try {
      const query = "DELETE FROM ai_filter_logs WHERE id = ?";
      const result = await userQuery(query, [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "AI filter log not found." });
      }

      res.json({ message: "AI filter log deleted successfully." });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to delete AI filter log", details: err });
    }
  };

export default {
  getAllAiFilterLogs,
  postAiFilterLog,
  updateAiFilterLog,
  deleteAiFilterLog,
};
