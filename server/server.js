import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

// Allow multiple Origins
const allowedOrigin = ["http://localhost:5173"];

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: allowedOrigin, credentials: true }));

app.get("/", (req, res) => res.send("API is working"));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port} `);
});
