import dotenv from "dotenv";
dotenv.config();
import _ from "lodash";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import userQuery from "../utils/helper/dbHelper.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

const signup = async (req, res) => {
  const userData = req.body;

  if (_.isEmpty(userData)) {
    return res.status(400).json({ message: "No data received" });
  }

  const {
    first_name,
    last_name,
    email,
    username,
    password,
    mobile_number,
    social_login_type,
    profile_picture,
    country,
    user_type,
  } = userData;

  const validUserTypes = ["admin", "visitor"];
  if (!validUserTypes.includes(user_type)) {
    return res.status(400).json({ message: "Invalid user type" });
  }

  try {
    // Check if user already exists
    const existingUser = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user details in the database without OTP
    await userQuery(
      `
      INSERT INTO users 
        (first_name, last_name, email, username, password, mobile_number, social_login_type, profile_picture, country, user_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `,
      [
        first_name,
        last_name,
        email,
        username,
        hashedPassword, // Password is hashed for later use
        mobile_number,
        social_login_type,
        profile_picture,
        country,
        user_type,
      ]
    );

    // Store the OTP in session
    req.session.otp = otp;
    req.session.email = email;  // Store the email in session to link OTP
    req.session.otpTimestamp = Date.now(); // Store timestamp for OTP validity

    // Send OTP via email
    const mailOptions = {
      from: "Global Home Remedies",
      to: email,
      subject: "Global Home Remedies OTP ",
      text: `Your OTP for login is ${otp}. It is valid for 5 minutes.`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return res.status(500).json({ message: "Error sending reset email" });
      }
    });

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("Error during signup OTP:", err);
    res.status(500).json({ message: "Error while sending OTP" });
  }
};

const verifyOtpAndCompleteSignup = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    // Check if OTP and email match session data
    if (req.session.email !== email) {
      return res.status(400).json({ message: "Email does not match" });
    }

    if (req.session.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check if OTP is expired (5 minutes validity)
    const otpGeneratedTime = req.session.otpTimestamp || Date.now();
    if (Date.now() - otpGeneratedTime > 5 * 60 * 1000) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // OTP is valid, clear session OTP
    delete req.session.otp;
    delete req.session.email;
    delete req.session.otpTimestamp;

    // Update user status to active
    await userQuery(
      `UPDATE users SET status = 'active' WHERE email = ?`,
      [email]
    );

    // Generate a JWT token
    const userRecord = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);
    const token = jwt.sign(
      { userId: userRecord[0].id, userType: userRecord[0].user_type },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set the JWT token as a cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour expiration for the cookie
    });

    res.status(200).json({
      message: "User successfully verified and registered",
      user: { id: userRecord[0].id, email: userRecord[0].email, username: userRecord[0].username, mobile_number: userRecord[0].mobile_number },
      token: token,
    });

  } catch (err) {
    console.error("Error during OTP verification and registration:", err);
    res.status(500).json({ message: "Error while verifying OTP and completing signup" });
  }
};

const login = async (req, res) => {
  const { username, password, token } = req.body;

  if (token) {
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user details from the database using the decoded userId
      const userResults = await userQuery(
        `SELECT * FROM users WHERE id = ?`,
        [decoded.userId]
      );

      const user = userResults[0];
      if (!user) {
        return res.status(404).json({ message: "Invalid token" });
      }

      // Check if the user account is active
      if (user.status !== "active") {
        return res.status(403).json({ message: "Account is not active" });
      }

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1 hour expiration for the cookie
      });

      return res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          token,
          mobile_number: user.mobile_number,
        },
      });
    } catch (err) {
      console.error("Error during token-based login:", err);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  } else {
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

  try {
    // Check if the user with the provided username exists
    const userResults = await userQuery(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );

    const user = userResults[0];
    if (!user) {
      return res.status(404).json({ message: "Invalid credentials" });
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Check if user account is active
    if (user.status !== "active") {
      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();

      // Save the OTP in the session (for session-based OTP)
      req.session.otp = otp;
      req.session.email = user.email; // Store the username for OTP verification
      req.session.otpTimestamp = Date.now(); // Store timestamp for OTP validity

      // Send OTP via email
      const mailOptions = {
        from: "Global Home Remedies",
        to: user.email,
        subject: "Global Home Remedies OTP ",
        text: `Your OTP for login is ${otp}. It is valid for 5 minutes.`,
      };

      await transporter.sendMail(mailOptions);
      return res.status(200).json({ message: "OTP sent to your email" });
    }

    const token = jwt.sign(
      { userId: userResults[0].id, userType: userResults[0].user_type },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Generate a JWT token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour expiration for the cookie
    });

    // Set the JWT token as a session cookie
    req.session.token = token;
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour expiration for the cookie
    });

    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, email: user.email, username: user.username, token: token, mobile_number: user.mobile_number},
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
};

const getProfile = async (req, res) => {
  const { userId } = req.user;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    const query =
      "SELECT id, first_name, last_name, email, username, mobile_number, social_login_type, profile_picture, country, status, created_at, updated_at FROM users WHERE id = ?";
    const user = await userQuery(query, [userId]);

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ profile: user[0] });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Database error while fetching profile",
        details: error,
      });
  }
};

const updateProfile = async (req, res) => {
  const { userId } = req.user;
  const { first_name, last_name, mobile_number, profile_picture, country } =
    req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  // Validate input: at least one field should be provided for update
  if (
    !first_name &&
    !last_name &&
    !mobile_number &&
    !profile_picture &&
    !country
  ) {
    return res
      .status(400)
      .json({ message: "At least one field is required for update." });
  }

  try {
    // Dynamically build the query for the fields provided
    let fields = [];
    let params = [];

    if (first_name) {
      fields.push("first_name = ?");
      params.push(first_name);
    }
    if (last_name) {
      fields.push("last_name = ?");
      params.push(last_name);
    }
    if (mobile_number) {
      fields.push("mobile_number = ?");
      params.push(mobile_number);
    }
    if (profile_picture) {
      fields.push("profile_picture = ?");
      params.push(profile_picture);
    }
    if (country) {
      fields.push("country = ?");
      params.push(country);
    }

    const setClause = fields.join(", ");
    params.push(userId); // Add userId as the last parameter for WHERE clause

    const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`;
    const result = await userQuery(query, params);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "User not found or no changes were made." });
    }

    res.json({ message: "Profile updated successfully." });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Database error while updating profile",
        details: error,
      });
  }
};

const deleteAccount = async (req, res) => {
  const { userId } = req.user; // Assume `userId` is from JWT token
  const { confirmDeletion, password } = req.body; // Expect user confirmation and password

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  // 1. Check if the user confirmed the deletion
  if (!confirmDeletion || confirmDeletion !== true) {
    return res
      .status(400)
      .json({ message: "Please confirm account deletion." });
  }

  try {
    // 2. Fetch the user data for further validations
    const userQueryText =
      "SELECT password, created_at, status FROM users WHERE id = ?";
    const userResult = await userQuery(userQueryText, [userId]);

    if (userResult.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userResult[0];

    // 3. Check if the account status is active
    if (user.status !== "active") {
      return res
        .status(403)
        .json({ message: "Only active accounts can be deleted." });
    }

    // 4. Validate password (if required)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    // 5. Check account age (e.g., 30 days minimum before allowing deletion)
    const accountAgeInDays =
      (new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24);
    if (accountAgeInDays < 30) {
      return res
        .status(403)
        .json({
          message: "Account must be at least 30 days old to be deleted.",
        });
    }

    // 6. Proceed with account deletion
    const deleteQuery = "DELETE FROM users WHERE id = ?";
    await userQuery(deleteQuery, [userId]);

    res.status(200).json({ message: "Account deleted successfully." });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while deleting account", details: err });
  }
};

// create nodemailer test account for testing
// async function createTestAccount() {
//   let testAccount = await nodemailer.createTestAccount();
//   console.log("Test account created:", testAccount);
// }
// createTestAccount();


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_EMAIL_PASS,
  },
});

// Forgot password API
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Check if the email exists in the database
  const user = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);
  if (user.length === 0) {
    return res
      .status(404)
      .json({ message: "User with this email does not exist" });
  }

  // Generate a unique token
  const token = crypto.randomBytes(32).toString("hex");

  // Save the token in forget_password table, replacing any existing entry for the same email
  await userQuery(
    `INSERT INTO forget_password (email, token, created_at) 
     VALUES (?, ?, NOW()) 
     ON DUPLICATE KEY UPDATE token = ?, created_at = NOW()`,
    [email, token, token]
  );

  // Generate password reset URL
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;

  // Send email with reset link
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset",
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
    `,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Error sending email:", err);
      return res.status(500).json({ message: "Error sending reset email" });
    }
    res.status(200).json({ message: "Password reset email sent successfully" });
  });
};

const resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;

  // Find the token and check creation time
  const result = await userQuery(
    `SELECT * FROM forget_password WHERE email = ? AND token = ?`,
    [email, token]
  );

  if (result.length === 0) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  // Check if the token is within 10 minutes of creation
  const tokenAge = (new Date() - new Date(result[0].created_at)) / 1000 / 60; // Convert milliseconds to minutes
  if (tokenAge > 10) {
    return res.status(400).json({ message: "Token has expired" });
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update the password in the users table
  await userQuery(`UPDATE users SET password = ? WHERE email = ?`, [
    hashedPassword,
    email,
  ]);

  // Remove the token from the forget_password table
  await userQuery(`DELETE FROM forget_password WHERE email = ?`, [email]);

  res.status(200).json({ message: "Password reset successfully" });
};

const googleAuthSignUp = async (req, res) => {

  if (!req.user) {
    return res.status(400).json({ message: "User authentication failed" });
  }

  const email = req.user.emails[0].value;
  const profile_picture = req.user.photos[0].value;
  const first_name = req.user.name.givenName;
  const last_name = req.user.name.familyName;
  const username = first_name + last_name;
  const social_login_type = "Gmail";
  const user_type = "visitor";
  const status = "active";
  // Check if the user already exists
  let userRecord = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);
  if (userRecord.length > 0) {

    // Generate a JWT token
    const token = jwt.sign(
      { userId: userRecord[0].id, userType: userRecord[0].user_type, email: userRecord[0].email, username: userRecord[0].username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set the JWT token as a cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour expiration for the cookie
    });

    return res.redirect(`http://localhost:3000/dashboard?token=${token}`);
    // return res.status(200).json({
    //   message: "User Already Exists",
    //   user: { id: userRecord[0].id, email: userRecord[0].email, username: userRecord[0].username },
    //   token: token,
    // });
  }

  // Save the user details in the database
  userRecord = await userQuery(
    `
      INSERT INTO users 
        (first_name, last_name, email, username, social_login_type, profile_picture, user_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `,
    [
      first_name,
      last_name,
      email,
      username,
      social_login_type,
      profile_picture,
      user_type,
      status
    ]
  );
  userRecord = await userQuery(`SELECT * FROM users WHERE id = ?`, [userRecord.insertId]);

  // Generate a JWT token
  const token = jwt.sign(
    { userId: userRecord[0].id, userType: userRecord[0].user_type, email: userRecord[0].email, username: userRecord[0].username },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Set the JWT token as a cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000, // 1 hour expiration for the cookie
  });

  // return res.status(200).json({
  //   message: "User successfully verified and registered",
  //   user: { id: userRecord[0].id, email: userRecord[0].email, username: userRecord[0].username },
  //   token: token,
  // });

  return res.redirect(`http://localhost:3000/dashboard?token=${token}`);

};

export default {
  signup,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  forgotPassword,
  resetPassword,
  verifyOtpAndCompleteSignup,
  googleAuthSignUp
};

