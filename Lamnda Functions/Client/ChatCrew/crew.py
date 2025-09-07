from crewai import Crew, Task, Process
from agents import (
    task_planner_agent,
    product_search_agent,
    product_choicer_agent,
    cart_adder_agent,
    quantity_updater_agent,
    preference_marker_agent,
    clarification_agent,
    final_response_agent
)
from tools import build_tools_with_chat

def build_context_inputs(chat, user_prompt: str) -> dict:
    """
    Build context-aware input dictionary for CrewAI tasks from a Chat object.
    Includes last messages, preferences, cart, and user prompt.
    """
    # Last 3 pairs of messages (up to 6 total)
    last_messages = chat.messages[-6:-1]
    context_messages = "\n".join(
        f"{m.role.capitalize()}: {m.content}" for m in last_messages
    )

    # Preferences
    preferences_text = "\n".join(f"- {p}" for p in chat.preferences)

    # Cart summary
    cart_text = "\n".join(
        f"- {p.name} x{p.quantity} (Store {p.store_id})" for p in chat.order
    )

    return {
        "prompt": user_prompt,
        "history": f"Recent conversation (context only — if anything here conflicts with the CURRENT REQUEST, ignore it and follow the CURRENT REQUEST):\n{context_messages}" if context_messages else "",
        "preferences": f"User preferences:\n{preferences_text}" if preferences_text else "",
        "cart": f"Cart contents:\n{cart_text}" if cart_text else ""
    }


def run_shopping_assistant(chat, user_prompt: str) -> str:
    """
    Orchestrates the CrewAI-based shopping assistant pipeline.
    Uses task planning + dynamically assigned roles to fulfill the user's intent.
    """

    # Initialize toolset with current chat state
    tools = build_tools_with_chat(chat)
    tool_map = {tool.name: tool for tool in tools}

    # Extract context from chat for agents
    context = build_context_inputs(chat, user_prompt)

    # --------------------------------------------
    # 🧠 1. Task Planner (Simplified - No Error Prediction)
    # --------------------------------------------
    planner_task = Task(
        agent=task_planner_agent,
        description=(
            "Customer Request: {prompt}\n"
            "Shopping History: {history}\n"
            "Customer Preferences: {preferences}\n"
            "Current Cart: {cart}\n\n"
            "Analyze this customer's request and determine the optimal sequence of actions to help them.\n\n"
            "Available actions:\n"
            "• 'find_items': Search for products the customer wants\n"
            "• 'pick_best': Select the most suitable products from search results\n"
            "• 'add_to_cart': Add selected items to shopping cart\n"
            "• 'update_cart': Modify quantities or remove items from cart\n"
            "• 'remember_preferences': Save important customer information\n"
            "• 'ask_clarification': Get more details when request is unclear\n"
            "• 'respond': Give customer a helpful, friendly response\n\n"
            "Decision guidelines:\n"
            "- Focus on the core workflow needed to serve the customer\n"
            "- Include 'ask_clarification' when requests are ambiguous\n"
            "- Always end with 'respond' to communicate with customer\n"
            "- Keep sequences efficient and logical\n"
            "- Error handling is built into each step automatically\n\n"
            "Respond ONLY with a JSON list of action names."
        ),
        expected_output="JSON list like ['find_items', 'pick_best', 'add_to_cart', 'respond']",
    )

    crew = Crew(
        name="PrePal Task Planner",
        description="Task planning agent to decide which actions to perform based on user intent.",
        tasks=[planner_task],
    )
    task_plan = str(crew.kickoff(inputs=context))

    # --------------------------------------------
    # 🔄 2. Dynamic Task Execution (Enhanced with Edge Case Handling)
    # --------------------------------------------
    task_list = []

    if "find_items" in task_plan:
        task_list.append(Task(
            agent=product_search_agent,
            description=(
                "Customer Request: {prompt}\n"
                "Shopping History: {history}\n"
                "Customer Preferences: {preferences}\n"
                "Current Cart: {cart}\n\n"
                "Find the exact products this customer is looking for.\n"
                "Extract key product identifiers and search terms that will help locate the right items.\n"
                "Consider seasonal availability, customer preferences, and alternative product names.\n"
                "Use 4-8 relevant, specific search terms to ensure comprehensive results.\nYou may call the 'search_products_by_tags' tool **no more than 3 times**; after three calls, stop searching and proceed with your current results.\n"
                "If no products are found, the tool will handle this gracefully."
            ),
            expected_output="Found product list (stored internally).",
            tools=[tool_map["search_products_by_tags"]]
        ))

    if "pick_best" in task_plan:
        task_list.append(Task(
            agent=product_choicer_agent,
            description=(
                "Customer Request: {prompt}\n"
                "Shopping History: {history}\n"
                "Customer Preferences: {preferences}\n"
                "Current Cart: {cart}\n\n"
                "From the products we found, select the best 1-5 items that perfectly match the customer's needs.\n"
                "Consider quality, freshness, value, and customer preferences.\n"
                "Ensure all selected products are from the same store for convenience.\n"
                "Set appropriate quantities based on customer hints or defaults to 1.\n"
                "Avoid duplicates and irrelevant items.\n"
                "The search tool returns JSON with full product fields (id, store_id, name, price, quantity).\n"
"OUTPUT FORMAT (strict):\\n``\\n{\\n  \"products\": [\\n    {\\n      \"product_id\": \"...\",\\n      \"store_id\": \"...\",\\n      \"description\": \"...\",\\n      \"qty\": 1\\n    }\\n  ]\\n}\\n``\\nIf nothing suitable, return `{ \"products\": [] }`. No extra text outside JSON.\n"
                "If no products were found in the search, suggest helpful alternatives instead."
            ),
            expected_output="JSON with key 'products' as described above (see prompt) including product_id, store_id, description, qty.",
        ))

    if "add_to_cart" in task_plan:
        task_list.append(Task(
            agent=cart_adder_agent,
            description=(
                "Review the search results and decide the best action:\n"
                "- If exact products were found → Add them to the customer's cart\n"
                "- If only alternatives/suggestions were found → Don't add to cart, provide suggestions\n"
                "- If no products were found → Provide helpful alternatives\n\n"
                "Always check product availability before adding.\n"
                "Provide clear feedback about what was added vs what was suggested.\n"
                "Let the customer know if items weren't available and why.\n"
                "The tool will handle edge cases like duplicates and availability issues."
            ),
            expected_output="Clear feedback about what was added to cart or what alternatives were suggested.",
            context=task_list,
            tools=[tool_map["add_products_to_order"]]
        ))

    if "update_cart" in task_plan:
        task_list.append(Task(
            agent=quantity_updater_agent,
            description=(
                "Customer Request: {prompt}\n"
                "Shopping History: {history}\n"
                "Customer Preferences: {preferences}\n"
                "Current Cart: {cart}\n\n"
                "Update the customer's cart based on their request.\n"
                "Modify quantities, remove items, or handle special requests like 'empty cart'.\n"
                "Only modify items that exist in the cart.\n"
                "Provide clear confirmation of all changes made.\n"
                "Handle any errors gracefully and explain issues clearly.\n"
                "If item doesn't exist, explain clearly and suggest alternatives.\n"
                "The tool will handle edge cases like invalid quantities and missing items."
            ),
            expected_output="Confirmation of cart updates with details of changes made.",
            tools=[tool_map["update_products_quantity_in_order"]]
        ))

    if "remember_preferences" in task_plan:
        task_list.append(Task(
            agent=preference_marker_agent,
            description=(
                "Customer Request: {prompt}\n"
                "Shopping History: {history}\n"
                "Current Preferences: {preferences}\n\n"
                "Identify and save important customer information for future shopping trips.\n"
                "Capture allergies, dietary restrictions, brand preferences, or other important details.\n"
                "Store information exactly as the customer expressed it.\n"
                "Distinguish between temporary and long-term preferences.\n"
                "If preference is unclear, note it for future clarification."
            ),
            expected_output="Confirmation that preferences were saved successfully.",
            tools=[tool_map["add_preference_to_long_term_memory"]]
        ))

    if "ask_clarification" in task_plan:
        task_list.append(Task(
            agent=clarification_agent,
            description=(
                "Customer Request: {prompt}\n"
                "Shopping History: {history}\n"
                "Customer Preferences: {preferences}\n"
                "Current Cart: {cart}\n\n"
                "The customer's request needs clarification to provide the best service.\n"
                "Identify the most important missing information.\n"
                "Ask one clear, focused question to get the needed details.\n"
                "Keep the question friendly, conversational, and under 20 words.\n"
                "Focus on quantity, brand preferences, product variations, or specific types.\n"
                "If multiple things are unclear, focus on the most important one."
            ),
            expected_output="A concise, helpful clarification question.",
        ))

    if "respond" in task_plan:
        task_list.append(Task(
            agent=final_response_agent,
            description=(
                "Customer Request: {prompt}\n"
                "Shopping History: {history}\n"
                "Customer Preferences: {preferences}\n"
                "Current Cart: {cart}\n\n"
                "Provide the customer with a clear, helpful, and friendly response.\n"
                "Summarize what was accomplished in simple terms.\n"
                "Acknowledge their preferences and shopping context.\n"
                "Use natural, conversational language like a helpful store employee.\n"
                "Keep the response concise but informative (under 150 tokens).\n"
                "End with an open-ended invitation for more help.\n"
                "Never mention technical details or internal processes.\n\n"
                "Edge case handling:\n"
                "- If no products were found, provide helpful alternatives\n"
                "- If some items couldn't be added, explain why and suggest solutions\n"
                "- If cart is empty, offer to help find something else\n"
                "- Always maintain a positive, helpful tone regardless of the outcome\n"
                "- If tools reported errors, provide helpful alternatives or solutions"
            ),
            expected_output="Friendly, helpful response summarizing actions taken.",
            context=task_list,
        ))

    # --------------------------------------------
    # 🏁 3. Execute Crew
    # --------------------------------------------
    crew = Crew(
        name="PrePal Grocery Assistant Crew",
        description="Multi-agent system to fulfill grocery-related user requests via search, planning, and cart management.",
        tasks=task_list,
        verbose=True,
        process=Process.sequential
    )

    # Return the final assistant message
    result = str(crew.kickoff(inputs=context))

    return result