/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Array to keep track of selected products
let selectedProducts = [];

// Function to update the selected products list in the UI
function updateSelectedProductsList() {
  const selectedList = document.getElementById("selectedProductsList");
  // If no products selected, show a message
  if (selectedProducts.length === 0) {
    selectedList.innerHTML = `<div style="color:#888;">No products selected.</div>`;
    return;
  }
  // Show each selected product as a small card
  selectedList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="product-card" style="flex:0 1 180px; border:2px solid #007bff; background:#f5faff;">
          <img src="${product.image}" alt="${product.name}" style="width:50px; height:50px;">
          <div class="product-info">
            <h3 style="font-size:14px;">${product.name}</h3>
            <p style="font-size:12px;">${product.brand}</p>
          </div>
        </div>
      `
    )
    .join("");
}

// Create HTML for displaying product cards and add click event listeners
// Function to show a modal window with product details
function showProductModal(product) {
  // Create modal HTML
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-window">
      <button class="modal-close" aria-label="Close">&times;</button>
      <img src="${product.image}" alt="${product.name}" style="width:120px; height:120px; object-fit:contain; display:block; margin:0 auto 16px;">
      <h2 style="text-align:center;">${product.name}</h2>
      <p style="text-align:center; color:#666;">${product.brand}</p>
      <div style="margin:20px 0; color:#222;">${product.description}</div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close modal on button click or overlay click
  modal.querySelector(".modal-close").onclick = () =>
    document.body.removeChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) document.body.removeChild(modal);
  };
}

// Create HTML for displaying product cards and add click event listeners
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if this product is selected
      const isSelected = selectedProducts.some((p) => p.id === product.id);
      // Add the 'selected' class if selected
      const selectedClass = isSelected ? "selected" : "";
      return `
        <div class="product-card ${selectedClass}" data-product-id="${product.id}" style="cursor:pointer;">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
            <button class="view-details-btn" data-product-id="${product.id}" style="margin-top:8px;">View Details</button>
          </div>
        </div>
      `;
    })
    .join("");

  // Add click event listeners to each product card for select/unselect
  const productCards = document.querySelectorAll(
    ".product-card[data-product-id]"
  );
  productCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      // Prevent toggling selection when clicking the View Details button
      if (event.target.classList.contains("view-details-btn")) return;
      const productId = parseInt(card.getAttribute("data-product-id"));
      loadProducts().then((allProducts) => {
        const clickedProduct = allProducts.find((p) => p.id === productId);
        if (!clickedProduct) return;
        const index = selectedProducts.findIndex((p) => p.id === productId);
        if (index === -1) {
          selectedProducts.push(clickedProduct);
        } else {
          selectedProducts.splice(index, 1);
        }
        displayProducts(products);
        updateSelectedProductsList();
      });
    });
  });

  // Add click event listeners to View Details buttons
  const detailBtns = document.querySelectorAll(".view-details-btn");
  detailBtns.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent card selection
      const productId = parseInt(btn.getAttribute("data-product-id"));
      const product = products.find((p) => p.id === productId);
      if (product) showProductModal(product);
    });
  });
}

// Filter and display products when category changes
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  // filter() creates a new array containing only products where the category matches what the user selected
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

// Initial update of selected products list
updateSelectedProductsList();

// Store chat history for follow-up questions
let chatHistory = [
  {
    role: "system",
    content: "You are a helpful assistant for L'Oréal product advice.",
  },
];

// Helper function to render chat history in the chat window
function renderChat() {
  // Only show user and assistant messages
  chatWindow.innerHTML = chatHistory
    .filter((msg) => msg.role !== "system")
    .map((msg) => {
      if (msg.role === "user") {
        return `<div style="margin-bottom:10px;"><strong>You:</strong> ${msg.content}</div>`;
      } else {
        return `<div style="margin-bottom:18px; background:#f5f5f5; padding:10px 14px; border-radius:8px;"><strong>Assistant:</strong> ${msg.content}</div>`;
      }
    })
    .join("");
}

// Handle Generate Routine button click
const generateBtn = document.getElementById("generateRoutine");
generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "Please select at least one product to generate a routine.";
    return;
  }
  chatWindow.innerHTML = "Generating your personalized routine...";
  const productList = selectedProducts
    .map((p, i) => `${i + 1}. ${p.name} (${p.brand}) - ${p.description}`)
    .join("\n");
  const userPrompt = `Here are the products I have selected:\n${productList}\n\nPlease create a step-by-step skincare or beauty routine using only these products. Explain the order and purpose of each step in a friendly, easy-to-understand way. Keep it short and concise, ideally under 300 words.`;
  // Add user message to chat history
  chatHistory.push({ role: "user", content: userPrompt });
  // Call OpenAI's API using fetch
  const apiKey = OPENAI_API_KEY;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: chatHistory,
      max_tokens: 300,
    }),
  });
  const data = await response.json();
  const reply =
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
      ? data.choices[0].message.content
      : "Sorry, I couldn't generate a routine. Please try again.";
  // Add assistant reply to chat history
  chatHistory.push({ role: "assistant", content: reply });
  renderChat();
});

// Chat form submission handler for follow-up questions
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput").value;
  if (!userInput.trim()) return;
  // Add user message to chat history
  chatHistory.push({ role: "user", content: userInput });
  renderChat();
  chatWindow.innerHTML += '<div style="color:#888;">Thinking...</div>';
  // Call OpenAI's API with full chat history
  const apiKey = OPENAI_API_KEY;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: chatHistory,
      max_tokens: 200,
    }),
  });
  const data = await response.json();
  const reply =
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
      ? data.choices[0].message.content
      : "Sorry, I couldn't answer that. Please try again.";
  chatHistory.push({ role: "assistant", content: reply });
  renderChat();
  // Clear input field
  document.getElementById("userInput").value = "";
});
