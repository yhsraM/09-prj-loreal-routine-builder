// Cloudflare Worker URL for OpenAI API proxy
const worksUrl = "https://loreal9project.mcazeau4603.workers.dev/";

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

// Load selected products from localStorage if available
if (localStorage.getItem("selectedProducts")) {
  try {
    selectedProducts = JSON.parse(localStorage.getItem("selectedProducts"));
  } catch (e) {
    selectedProducts = [];
  }
}

// Function to update the selected products list in the UI
function updateSelectedProductsList() {
  const selectedList = document.getElementById("selectedProductsList");
  // Save to localStorage
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
  // If no products selected, show a message
  if (selectedProducts.length === 0) {
    selectedList.innerHTML = `<div style="color:#888;">No products selected.</div>`;
    // Remove clear button if present
    const clearBtn = document.getElementById("clearSelectedBtn");
    if (clearBtn) clearBtn.remove();
    return;
  }
  // Show each selected product as a small card with a remove button
  selectedList.innerHTML = selectedProducts
    .map(
      (product, idx) => `
        <div class="product-card" style="flex:0 1 180px; border:2px solid #007bff; background:#f5faff; position:relative;">
          <img src="${product.image}" alt="${product.name}" style="width:50px; height:50px;">
          <div class="product-info">
            <h3 style="font-size:14px;">${product.name}</h3>
            <p style="font-size:12px;">${product.brand}</p>
          </div>
          <button class="remove-selected-btn" data-idx="${idx}" style="position:absolute;top:4px;right:4px;background:#fff;border:1px solid #ccc;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;line-height:18px;">&times;</button>
        </div>
      `
    )
    .join("");
  // Add clear all button if not present
  if (!document.getElementById("clearSelectedBtn")) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearSelectedBtn";
    clearBtn.textContent = "Clear All";
    clearBtn.style =
      "margin-top:10px;padding:6px 16px;font-size:14px;background:#eee;border:1px solid #aaa;border-radius:6px;cursor:pointer;";
    clearBtn.onclick = function () {
      selectedProducts = [];
      updateSelectedProductsList();
      displayProducts(window.lastDisplayedProducts || []);
    };
    selectedList.parentElement.appendChild(clearBtn);
  }
  // Add event listeners to remove buttons
  document.querySelectorAll(".remove-selected-btn").forEach((btn) => {
    btn.onclick = function (e) {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-idx"));
      selectedProducts.splice(idx, 1);
      updateSelectedProductsList();
      displayProducts(window.lastDisplayedProducts || []);
    };
  });
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
  // Save last displayed products for removal/clear logic
  window.lastDisplayedProducts = products;
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
        updateSelectedProductsList();
        displayProducts(products);
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
  // Always use the current selectedProducts array to build the product list
  const productList = selectedProducts
    .map((p, i) => `${i + 1}. ${p.name} (${p.brand}) - ${p.description}`)
    .join("\n");
  const userPrompt = `Here are the products I have selected:\n${productList}\n\nPlease create a step-by-step skincare or beauty routine using ONLY these products. Do NOT mention or suggest any products that are not in this list, even if they were selected before. ONLY return the numbered steps to the routine, with no introduction or summary. Explain the purpose of each step in a friendly, easy-to-understand way. Your answer MUST be under 400 words.`;
  // Do NOT add the initial prompt to chat history as a user message
  // Instead, send a new message array with system + userPrompt only
  const response = await fetch(worksUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for L'Oréal product advice.",
        },
        { role: "user", content: userPrompt },
      ],
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
  // Add only the assistant reply to chat history
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
  const response = await fetch(worksUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: chatHistory,
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
