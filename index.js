import dotenv from "dotenv";
dotenv.config();
import passport from 'passport';
import googleAuth from "./socialAuth/googleAuth.js";
import fs from 'fs';
import express from "express";
import https from 'https';
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { dbConnection } from "./db/connection.js";
import userController from "./controllers/user.js";

// Route imports
import userRoutes from "./routes/user.js";
import notificationRoutes from "./routes/notifications.js";
import categoriesRoutes from "./routes/categories.js";
import communityPostsRoutes from "./routes/communityPosts.js";
import remediesRoutes from "./routes/remedies.js";
import reviewsRoutes from "./routes/reviews.js";
import aiFilterLogsRoutes from "./routes/aiFilterLogs.js";
import communityComments from "./routes/communityComments.js";
import fileUpload from "./routes/fileUpload.js";

const app = express();
const port = process.env.PORT || 3000;
const con = dbConnection();

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/responseangelaccess.com/privkey.pem'), // Path to private key
  cert: fs.readFileSync('/etc/letsencrypt/live/responseangelaccess.com/fullchain.pem') // Path to certificate
};

// Middleware
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 60 * 1000, // 30 minutes
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/api/user/googleAuth', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      await userController.googleAuthSignUp(req, res); // Handles the response itself
    } catch (err) {
      res.status(500).json({ message: "An unexpected error occurred", error: err.message });
    }
  }
);

app.use("/api/user", userRoutes);
app.use("/api/user", notificationRoutes); 
app.use("/api/user", categoriesRoutes); 
app.use("/api/user", communityPostsRoutes); 
app.use("/api/user", remediesRoutes); 
app.use("/api/user", reviewsRoutes);
app.use("/api/user", aiFilterLogsRoutes);
app.use("/api/user", communityComments);
app.use("/api/user", fileUpload);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "An unexpected error occurred", error: err.message });
});

// Start server
//app.listen(port, () => {
  //console.log(`Server is running on port ${port}`);
//});
https.createServer(options, app).listen(port, () => {
  console.log(`Secure server running at ${port}`);
});
