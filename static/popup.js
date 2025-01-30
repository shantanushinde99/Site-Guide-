document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const clearBtn = document.getElementById('clear-btn');
  const themeToggle = document.getElementById('theme-toggle');

  // Function to append a message to the chat interface
  function appendMessage(sender, message) {
      const messageElement = document.createElement('div');
      messageElement.classList.add('message', sender);
      messageElement.textContent = message;
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the latest message
  }

  // Function to send user input to /generate and process the instruction
  async function sendMessage() {
      const userPrompt = chatInput.value.trim();
      if (!userPrompt) return; // Prevent sending empty messages

      appendMessage('user', userPrompt);
      chatInput.value = '';

      try {
          // Step 1: Send user prompt to the IBM API (/generate)
          const generateResponse = await fetch('http://127.0.0.1:5000/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ link: window.location.href, prompt: userPrompt }),
          });

          if (!generateResponse.ok) {
              appendMessage('assistant', "Error: Failed to get a response from IBM API.");
              return;
          }

          const generateData = await generateResponse.json();
          const generatedInstruction = generateData.instruction || "Sorry, I couldn't generate an instruction.";

          appendMessage('assistant', `Instruction: ${generatedInstruction}`);

          // Step 2: Send the generated instruction to the AI agent (/run-gemini)
          const geminiResponse = await fetch('http://127.0.0.1:5000/run-gemini', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ instruction: generatedInstruction }),
          });

          if (!geminiResponse.ok) {
              appendMessage('assistant', "Error: Failed to execute the task.");
              return;
          }

          const geminiData = await geminiResponse.json();
          const taskStatus = geminiData.status || "Execution failed.";

          appendMessage('assistant', `Execution Status: ${taskStatus}`);

      } catch (error) {
          appendMessage('assistant', "Error: Unable to connect to the server.");
          console.error("Fetch error:", error);
      }
  }

  // Send button click event listener
  sendBtn.addEventListener('click', sendMessage);

  // Enter key press event listener
  chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          e.preventDefault(); // Prevent default form submission
          sendMessage();
      }
  });

  // Clear button click event listener
  clearBtn.addEventListener('click', () => {
      chatMessages.innerHTML = '';
  });

  // Theme toggle button click event listener
  themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
  });
});
