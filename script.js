/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Store selected products */
let selectedProducts = [];

/* Store chat history for OpenAI API */
let messages = [
  {
    role: "system",
    content:
      "You are a helpful beauty advisor. Only answer questions about routines, skincare, haircare, makeup, fragrance, and related beauty topics. If asked about something else, politely say you can only help with beauty advice.",
  },
];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts(category = "") {
  // Fetch product data
  const response = await fetch("products.json");
  const products = await response.json();

  // Filter products by category if selected
  const filtered = category
    ? products.filter((product) => product.category === category)
    : products;

  // Get the products container
  const container = document.getElementById("productsContainer");
  container.innerHTML = "";

  // Loop through products and create cards
  filtered.forEach((product) => {
    // Create product card
    const card = document.createElement("div");
    card.className = "product-card";
    card.tabIndex = 0; // Make card focusable for accessibility
    // Add .selected class if product is selected
    if (selectedProducts.find((p) => p.id === product.id)) {
      card.classList.add("selected");
    }
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" />
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="description-overlay" aria-label="Product description">
        ${product.description}
      </div>
    `;
    // Add click event to card for select/unselect
    card.addEventListener("click", () => {
      toggleProduct(product);
      loadProducts(category); // Refresh grid to show selection
      updateSelectedProducts();
    });
    container.appendChild(card);
  });
}

/* Select or unselect product */
function toggleProduct(product) {
  const index = selectedProducts.findIndex((p) => p.id === product.id);
  if (index === -1) {
    selectedProducts.push(product);
  } else {
    selectedProducts.splice(index, 1);
  }
  updateSelectedProducts(); // Update section after change
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Add product to selected list */
function addProduct(product) {
  // Prevent duplicates
  if (!selectedProducts.find((p) => p.id === product.id)) {
    selectedProducts.push(product);
    updateSelectedProducts();
  }
}

/* Update the selected products section */
function updateSelectedProducts() {
  const list = document.getElementById("selectedProductsList");
  list.innerHTML = "";
  selectedProducts.forEach((product) => {
    const item = document.createElement("div");
    item.className = "product-card";
    item.tabIndex = 0;
    item.innerHTML = `
      <img src="${product.image}" alt="${product.name}" />
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button data-id="${product.id}">Remove</button>
      </div>
      <div class="description-overlay" aria-label="Product description">
        ${product.description}
      </div>
    `;
    // Allow users to remove items directly from the list
    item.querySelector("button").addEventListener("click", () => {
      selectedProducts = selectedProducts.filter((p) => p.id !== product.id);
      updateSelectedProducts();
      loadProducts(document.getElementById("categoryFilter").value);
    });
    list.appendChild(item);
  });
}

/* Generate routine when button is clicked */
document
  .getElementById("generateRoutine")
  .addEventListener("click", async () => {
    const chatWindow = document.getElementById("chatWindow");

    // Only use selected products
    if (selectedProducts.length === 0) {
      chatWindow.innerHTML += `<div class="placeholder-message">Please select products to generate a routine.</div>`;
      return;
    }

    // Prepare product data for the AI
    const productData = selectedProducts.map((p) => ({
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
    }));

    // Add user message to chat history
    messages.push({
      role: "user",
      content: `Here are my selected products:\n${JSON.stringify(
        productData,
        null,
        2
      )}\nPlease generate a personalized beauty routine for me.`,
    });

    // Show loading message
    chatWindow.innerHTML += `<div><em>Generating your personalized routine...</em></div>`;

    try {
      // Call OpenAI API
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`, // Make sure OPENAI_API_KEY is defined in secrets.js
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: messages,
            max_tokens: 400,
          }),
        }
      );

      const data = await response.json();

      // Check and display the AI's routine
      if (
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content
      ) {
        const routine = data.choices[0].message.content;
        chatWindow.innerHTML += `<div><strong>Personalized Routine:</strong><br>${routine.replace(
          /\n/g,
          "<br>"
        )}</div>`;
        // Add AI response to chat history
        messages.push({
          role: "assistant",
          content: routine,
        });
      } else {
        chatWindow.innerHTML += `<div class="placeholder-message">Sorry, something went wrong. Please try again.</div>`;
      }
    } catch (error) {
      chatWindow.innerHTML += `<div class="placeholder-message">Error: ${error.message}</div>`;
    }
  });

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  loadProducts(e.target.value);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const input = document.getElementById("userInput");
  const chatWindow = document.getElementById("chatWindow");
  const userMessage = input.value;

  // Add user message to chat window
  chatWindow.innerHTML += `<div><strong>You:</strong> ${userMessage}</div>`;
  input.value = "";

  // Add user message to chat history
  messages.push({
    role: "user",
    content: userMessage,
  });

  // Show loading message
  chatWindow.innerHTML += `<div><em>Thinking...</em></div>`;

  try {
    // Call OpenAI API with full conversation history
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 400,
      }),
    });

    const data = await response.json();

    // Check and display the AI's response
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      const aiReply = data.choices[0].message.content;
      chatWindow.innerHTML += `<div><strong>Advisor:</strong> ${aiReply.replace(
        /\n/g,
        "<br>"
      )}</div>`;
      // Add AI response to chat history
      messages.push({
        role: "assistant",
        content: aiReply,
      });
    } else {
      chatWindow.innerHTML += `<div class="placeholder-message">Sorry, something went wrong. Please try again.</div>`;
    }
  } catch (error) {
    chatWindow.innerHTML += `<div class="placeholder-message">Error: ${error.message}</div>`;
  }
});

// Load all products on page load
loadProducts();
