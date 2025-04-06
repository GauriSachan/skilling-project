const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");
const axios = require("axios"); // ✅ Added for Hugging Face API
const User = require("./models/User");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error(err));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Hugging Face Chatbot Function (Improved)
async function getChatResponseFromHuggingFace(userMessage) {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1",
      {
        inputs: `User: ${userMessage}\nAssistant:`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
      }
    );

    const result = response.data;

    if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
      const reply = result[0].generated_text.split("Assistant:")[1]?.trim();
      return reply || "🤖 I’m here, but I didn’t quite get that.";
    }

    return "🤖 Something went wrong with the response format.";
  } catch (err) {
    console.error("❌ Hugging Face error:", err.response?.data || err.message);
    return "⚠️ The chatbot is currently unavailable.";
  }
}

// Redirect root to login
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Serve index.html only if user is authenticated
app.get("/index", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Auth routes
app.get("/signup", (req, res) => {
  if (req.session.user) return res.redirect("/index");
  res.render("signup");
});

app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/index");
  res.render("login");
});

app.get("/forgot", (req, res) => res.render("forgot"));

app.get("/reset/:token", async (req, res) => {
  const user = await User.findOne({
    resetToken: req.params.token,
    resetTokenExpire: { $gt: Date.now() },
  });
  if (!user) return res.send("Token invalid or expired.");
  res.render("reset", { token: req.params.token });
});

// Signup Handler
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.send("Email already registered");

  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hash });

  try {
    await user.save();

    const mailOptions = {
      from: `"Next-Gen Coder Platform" <${process.env.EMAIL}>`,
      to: email,
      subject: "🎉 Welcome to Next-Gen Coder Platform!",
      html: `<h2>Hello ${username},</h2><p>Thanks for signing up!</p>`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error("Email send error:", err);
      else console.log("Welcome email sent:", info.response);
    });

    req.session.user = user;
    res.redirect("/index");
  } catch (e) {
    res.send("Signup error: " + e.message);
  }
});

// Login Handler
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.send("User not found.");
  if (!(await bcrypt.compare(password, user.password)))
    return res.send("Incorrect password.");

  req.session.user = user;
  res.redirect("/index");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Forgot Password
app.post("/forgot", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.send("Email not found.");

  const token = crypto.randomBytes(32).toString("hex");
  user.resetToken = token;
  user.resetTokenExpire = Date.now() + 3600000;
  await user.save();

  const resetLink = `http://localhost:3000/reset/${token}`;
  await transporter.sendMail({
    from: `"NextGen Coder Platform" <${process.env.EMAIL}>`,
    to: email,
    subject: "🔐 Reset Your Password - NextGen Coder Platform",
    html: `<a href="${resetLink}">Reset Password</a>`,
  });

  res.send("Reset link sent to your email.");
});

// Reset Password
app.post("/reset/:token", async (req, res) => {
  const { password } = req.body;
  const user = await User.findOne({
    resetToken: req.params.token,
    resetTokenExpire: { $gt: Date.now() },
  });
  if (!user) return res.send("Token expired or invalid.");

  user.password = await bcrypt.hash(password, 10);
  user.resetToken = undefined;
  user.resetTokenExpire = undefined;
  await user.save();

  res.send("✅ Password reset successful! You can now <a href='/login'>login</a>.");
});

// ✅ Chatbot Route using Hugging Face (FREE)
app.post("/chatbot", async (req, res) => {
  if (!req.session.chatHistory) req.session.chatHistory = [];

  const userMessage = req.body.message;
  req.session.chatHistory.push({ role: "user", content: userMessage });

  const botReply = await getChatResponseFromHuggingFace(userMessage);
  req.session.chatHistory.push({ role: "assistant", content: botReply });

  res.json({ reply: botReply });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
