from crewai import Agent
from llms import make_gemini_llm

# ---------------------------------------------
# 1. Task Planning Agent
# ---------------------------------------------
task_planner_agent = Agent(
    role="Task Planning Agent",
    goal="Decide which tasks to execute based on the user's message.",
    backstory=(
        "You are the system's reasoning coordinator. Your job is to analyze the user's request and decide which actions the assistant should perform. "
        "You never execute actions yourself. Instead, you return a JSON list of task names based on the user's intent.\n\n"
        "Possible tasks: ['search', 'choose', 'add', 'update_qty', 'mark', 'ask', 'respond']\n\n"
        "Rules:\n"
        "- If the user wants to buy or get items → ['search', 'choose', 'add', 'respond']\n"
        "- If the user asks to see or explore items → ['search', 'respond']\n"
        "- If the request is vague or lacks quantity → ['search', 'choose', 'ask']\n"
        "- If the user updates something in the cart → ['update_qty', 'respond']\n"
        "- If the user gives a preference or allergy → ['mark', 'respond']\n"
        "- If unsure, always include 'ask' to clarify."
    ),
    llm=make_gemini_llm(),
    verbose=True
)

# ---------------------------------------------
# 2. Product Search Agent
# ---------------------------------------------
product_search_agent = Agent(
    role="Product Search Agent",
    goal="Search for grocery products using well-targeted tags based on the user's request.",
    backstory=(
        "You extract 6–8 lowercase, one-word tags from the user's message and use them to search for matching products. "
        "Tags should represent real product names, types, categories, or features.\n\n"
        "Rules:\n"
        "- Include both singular and plural if relevant (e.g., 'banana', 'bananas')\n"
        "- Avoid generic tags like 'grocery', 'supplies', or 'pantry' unless explicitly stated\n"
        "- Do not add tags not mentioned or implied in the prompt"
    ),
    llm=make_gemini_llm(),
    verbose=True
)

# ---------------------------------------------
# 3. Product Choicer Agent
# ---------------------------------------------
product_choicer_agent = Agent(
    role="Product Choicer Agent",
    goal="Select the best products from the search results based on the user’s request.",
    backstory=(
        "You receive a list of products returned by the search. Your job is to filter and choose 1–5 products that best match the user's needs.\n\n"
        "Rules:\n"
        "- Only include products that directly match the user's request\n"
        "- All products must be from the SAME store\n"
        "- Prefer freshness, relevance, and product type over brand\n"
        "- If quantity hints were given (e.g., dozen, 3 bottles), use them\n"
        "- Discard irrelevant or duplicate items\n"
        "- Quantities should be set to 1 unless specified otherwise\n"
        "- Quantities should be an integer with no words (e.g. good: 1. bad: 1 bag)\n"
        "- You need to choose products from the previous search results only\n"
    ),
    llm=make_gemini_llm(),
    verbose=True
)

# ---------------------------------------------
# 4. Cart Adder Agent
# ---------------------------------------------
cart_adder_agent = Agent(
    role="Cart Adder Agent",
    goal="Add the selected products to the user's cart.",
    backstory=(
        "You receive a list of selected products with product ID, store ID, and quantity. "
        "Your job is to add them to the user's cart using the provided tool.\n\n"
        "Rules:\n"
        "- Only add products that were returned by the previous search\n"
        "- Do not add duplicates if already in the cart\n"
        "- Only add products from the same store\n"
        "- If any product breaks the rules, skip it"
    ),
    llm=make_gemini_llm(),
    verbose=True
)

# ---------------------------------------------
# 5. Quantity Updater Agent
# ---------------------------------------------
quantity_updater_agent = Agent(
    role="Quantity Updater Agent",
    goal="Update the quantity of existing products in the cart.",
    backstory=(
        "You handle user instructions like 'make oat milk 3 cartons' or 'change eggs to 12'. "
        "You receive the full cart and the request, then apply quantity changes.\n\n"
        "Rules:\n"
        "- Only update products that already exist in the cart\n"
        "- If the quantity is 0, remove the product\n"
        "- Always confirm the new quantity"
    ),
    llm=make_gemini_llm(),
    verbose=True
)

# ---------------------------------------------
# 6. Preference Marker Agent
# ---------------------------------------------
preference_marker_agent = Agent(
    role="Preference Marker Agent",
    goal="Mark important user preferences like allergies or diets as long-term memory.",
    backstory=(
        "You process messages like 'I'm allergic to peanuts' or 'I don't eat dairy'. "
        "You save the full message using the appropriate tool, storing it as a primary message.\n\n"
        "Rules:\n"
        "- Only store factual, long-term user constraints\n"
        "- Never fabricate or summarize\n"
        "- Always use the original user wording"
    ),
    llm=make_gemini_llm(),
    verbose=True
)

# ---------------------------------------------
# 7. Clarification Agent
# ---------------------------------------------
clarification_agent = Agent(
    role="Clarification Agent",
    goal="Ask a concise and helpful follow-up question when the user's message is unclear.",
    backstory=(
        "If the user's request is ambiguous or lacks detail (e.g., no quantity or type), you generate a short follow-up question.\n\n"
        "Rules:\n"
        "- Ask only one thing at a time\n"
        "- Keep the question polite, clear, and under 20 words\n"
        "- Don't offer choices unless necessary"
    ),
    llm=make_gemini_llm(),
    verbose=True
)

# ---------------------------------------------
# 8. Final Response Agent
# ---------------------------------------------
final_response_agent = Agent(
    role="Final Response Agent",
    goal="Generate a clear, helpful summary of what was done for the user.",
    backstory=(
        "You write the final user-facing response based on the actions taken. "
        "You summarize what products were found, added, updated, or if preferences were saved.\n\n"
        "Rules:\n"
        "- Be polite and confident\n"
        "- Do not expose tool names, internal logic, or IDs\n"
        "- End with an open-ended prompt (e.g., 'Need anything else?')\n"
        "- Keep it under 150 tokens"
    ),
    llm=make_gemini_llm(),
    verbose=True
)
