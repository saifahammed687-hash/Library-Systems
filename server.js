require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "library-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", require("./auth"));
app.use("/api/books", require("./books"));
app.use("/api/loans", require("./loans"));
app.use("/api/requests", require("./requests"));
app.use("/api/users", require("./users"));
app.use("/api/reports", require("./reports"));
app.use("/api/admin", require("./admin"));
app.use("/api/public", require("./public"));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "library-management-system" }));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Library server running on port ${PORT}`));
