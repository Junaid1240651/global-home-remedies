import express from "express";
import cors from "cors";
import { dbConnection } from "./db/connection.js";
import userRoutes from "./routes/user.js";
import notificationRoutes from "./routes/notifications.js";
import categoriesRoutes from "./routes/categories.js";
import communityPostsRoutes from "./routes/communityPosts.js";
import remediesRoutes from "./routes/remedies.js";
import reviewsRoutes from "./routes/reviews.js";
import aiFilterLogsRoutes from "./routes/aiFilterLogs.js";
import communityComments from "./routes/communityComments.js";
import cookieParser from "cookie-parser";
import session from "express-session";


const app = express();
const port = process.env.PORT || 3000;

// Establish DB connection
const con = dbConnection();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Initialize express-session middleware (this should be added to your Express app setup)
app.use(session({
  secret: 'your-secret-key', // Replace with a strong secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === "production" }
}));

app.use("/api/user", userRoutes);
app.use("/api/user", notificationRoutes); 
app.use("/api/user", categoriesRoutes); 
app.use("/api/user", communityPostsRoutes); 
app.use("/api/user", remediesRoutes); 
app.use("/api/user", reviewsRoutes);
app.use("/api/user", aiFilterLogsRoutes);
app.use("/api/user", communityComments);
// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
