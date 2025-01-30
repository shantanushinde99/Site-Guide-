document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-btn');
    const themeToggle = document.getElementById('theme-toggle');
  
    // Function to append a message to the chat interface
    function appendMessage(sender, message) {
      const messageElement = document.createElement('div');
      messageElement.classList.add('message');
      messageElement.classList.add(sender);
      messageElement.textContent = message;
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  
    // Send button click event listener
    sendBtn.addEventListener('click', async () => {
      const userPrompt = chatInput.value.trim();
      if (userPrompt) {
        appendMessage('user', userPrompt);
        chatInput.value = '';
  
        // Send user prompt to the '/generate' endpoint
        const response = await fetch('http://127.0.0.1:5000/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ link: window.location.href, prompt: userPrompt }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const generatedInstruction = data.instruction;
          appendMessage('assistant', generatedInstruction);
  
          // Call the gemini.py script with the generated instruction
          const runGeminiResponse = await fetch('http://127.0.0.1:5000/run-gemini', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ instruction: generatedInstruction }),
          });
  
          if (runGeminiResponse.ok) {
            const geminiData = await runGeminiResponse.json();
            geminiData.output.forEach(message => {
              appendMessage('assistant', message);
            });
          } else {
            appendMessage('assistant', 'Failed to run gemini.py script.');
          }
        } else {
          appendMessage('assistant', 'Failed to generate instruction.');
        }
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
  
  