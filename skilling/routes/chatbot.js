// routes/chatbot.js

const express = require("express");
const router = express.Router();

// Basic chatbot response logic
router.post("/", (req, res) => {
  const { message } = req.body;

  let reply = "🤖 I didn't understand that.";

  if (/hello|hi|hey/i.test(message)) {
    reply = "Hey there! How can I assist you with coding today?";
  } else if (/dsa|data structures/i.test(message)) {
    reply = "Need help with DSA? Try practicing arrays and recursion first!";
  } else if (/sql/i.test(message)) {
    reply = "SQL questions? JOINs and GROUP BYs are key! 💡";
  } else if (/ai/i.test(message)) {
    reply = "We love AI too! We're working on AI-assisted learning!";
  } else if (/bye/i.test(message)) {
    reply = "Goodbye! 👋 Keep coding!";
  }

  res.json({ reply });
});

module.exports = router;
