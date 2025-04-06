document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("user-input");
    const messages = document.getElementById("messages");
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userMsg = input.value.trim();
      if (!userMsg) return;
  
      appendMessage("You", userMsg);
      input.value = "";
  
      const res = await fetch("/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
  
      const data = await res.json();
      appendMessage("Bot", data.reply);
    });
  
    function appendMessage(sender, text) {
      const div = document.createElement("div");
      div.innerHTML = `<strong>${sender}:</strong> ${text}`;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }
  });
  