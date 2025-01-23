document.addEventListener('DOMContentLoaded', function () {
  const chatContainer = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const clearBtn = document.getElementById('clear-btn');

  let originalPrompt = '';
  let lastClickableElement = null;

  // Load chat history from localStorage
  loadChatHistory();

  sendBtn.addEventListener('click', function () {
    const userInput = chatInput.value;
    if (userInput.trim() === '') return;

    originalPrompt = userInput;
    addMessage('user', userInput);
    mainLoop();
  });

  themeToggleBtn.addEventListener('click', function () {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
  });

  clearBtn.addEventListener('click', function () {
    chatContainer.innerHTML = '';
    localStorage.removeItem('chatHistory');
  });

  function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${sender}`;
    messageElement.textContent = message;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    saveChatHistory();
  }

  function saveChatHistory() {
    localStorage.setItem('chatHistory', chatContainer.innerHTML);
  }

  function loadChatHistory() {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      chatContainer.innerHTML = savedHistory;
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  async function mainLoop() {
    let keepLooping = true;

    while (keepLooping) {
      const results = await executeScript(extractClickableElements);
      const clickableData = results[0].result;

      const data = await fetchIBMCompletion(originalPrompt, clickableData);
      const parsedData = JSON.parse(data);

      if (Object.keys(parsedData).length === 0) {
        addMessage('bot', 'No more relevant clickable elements found.');
        keepLooping = false;
        return;
      }

      const element = parsedData.clickable_element;
      if (!element) {
        addMessage('bot', 'No relevant clickable element found.');
        keepLooping = false;
        return;
      }

      // Check if the last clickable element is the same as the current element
      if (lastClickableElement && lastClickableElement.element_type === element.element_type &&
          lastClickableElement.text === element.text && lastClickableElement.link === element.link) {
        addMessage('bot', 'Same clickable element as the last response. Stopping the loop.');
        keepLooping = false;
        return;
      }

      // Update the last clickable element
      lastClickableElement = element;

      await highlightElement(element.element_type, element.text, element.link);
      addMessage('bot', `Highlighting ${element.element_type} with text: "${element.text}" and link: "${element.link}".`);
      await delay(3000); // Highlight for 3 seconds

      await redirectToLink(element.link);
      await delay(4000); // Wait for 4 seconds after redirect
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function executeScript(func, args = []) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: func,
          args
        }, function (results) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(results);
          }
        });
      });
    });
  }

  function extractClickableElements() {
    const clickable_elements = [];

    document.querySelectorAll('button').forEach(button => {
      clickable_elements.push({
        element_type: 'button',
        text: button.textContent.trim(),
        action: button.getAttribute('onclick') || 'No action defined'
      });
    });

    document.querySelectorAll('a[href]').forEach(link => {
      clickable_elements.push({
        element_type: 'a',
        text: link.textContent.trim(),
        action: link.getAttribute('href')
      });
    });

    return { elements: clickable_elements };
  }

  async function fetchIBMCompletion(userPrompt, clickableData) {
    const response = await fetch('http://localhost:5000/generate', { // Replace with your local server URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: userPrompt,
        link: clickableData
      })
    });

    if (!response.ok) {
      throw new Error(`Error fetching IBM completion: ${response.statusText}`);
    }

    return await response.json();
  }

  async function highlightElement(elementType, elementText, elementLink) {
    const results = await executeScript((elementType, elementText, elementLink) => {
      let element;
      if (elementLink) {
        element = Array.from(document.querySelectorAll(elementType))
          .find(el => (el.src && el.src.includes(elementLink)) || (el.href && el.href.includes(elementLink)));
      } else {
        element = Array.from(document.querySelectorAll(elementType))
          .find(el => el.textContent.includes(elementText));
      }

      if (!element) throw new Error('Element not found');

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.border = '2px solid red';
      overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
      overlay.style.zIndex = '9999';
      overlay.style.pointerEvents = 'none';

      document.body.appendChild(overlay);

      const updateOverlayPosition = () => {
        const rect = element.getBoundingClientRect();
        overlay.style.top = `${rect.top + window.scrollY - 5}px`;
        overlay.style.left = `${rect.left + window.scrollX - 5}px`;
        overlay.style.width = `${rect.width + 10}px`;
        overlay.style.height = `${rect.height + 10}px`;
      };

      updateOverlayPosition();

      const observer = new MutationObserver(updateOverlayPosition);
      observer.observe(element, { attributes: true, childList: true, subtree: true });

      window.addEventListener('resize', updateOverlayPosition);
      window.addEventListener('scroll', updateOverlayPosition, true);
    }, [elementType, elementText, elementLink]);

    return results;
  }

  function redirectToLink(link) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.update(tabs[0].id, { url: link }, function (tab) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tab);
          }
        });
      });
    });
  }
});
