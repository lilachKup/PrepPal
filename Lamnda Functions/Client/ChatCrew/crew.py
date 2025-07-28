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


def run_shopping_assistant(chat, user_prompt: str) -> str:
    """
    Orchestrates the CrewAI-based shopping assistant pipeline.
    Uses task planning + dynamically assigned roles to fulfill the user's intent.
    """

    # Initialize toolset with current chat state
    tools = build_tools_with_chat(chat)
    tool_map = {tool.name: tool for tool in tools}

    # --------------------------------------------
    # 🧠 1. Task Planner
    # --------------------------------------------
    planner_task = Task(
        agent=task_planner_agent,
        description=(
            "Analyze the this user request {prompt}\n and decide which of the following tasks should be run:\n\n"
            "• 'search': Look for products using relevant tags\n"
            "• 'choose': Select the best matching items from search\n"
            "• 'add': Add products to the cart\n"
            "• 'update_qty': Update existing product quantities in the cart\n"
            "• 'mark': Save user preferences (e.g. allergies, diets)\n"
            "• 'ask': Ask a clarification question\n"
            "• 'respond': Generate final user message\n\n"
            "Examples:\n"
            "- User: 'I want fresh fruits' → ['search', 'choose', 'add', 'respond']\n"
            "- User: 'I’m allergic to peanuts' → ['mark', 'respond']\n"
            "- User: 'Can I see oat milk?' → ['search', 'respond']\n\n"
            "Respond ONLY with a JSON list of task names."
        ),
        expected_output="JSON list like ['search', 'choose', 'add', 'respond']",
    )

    crew = Crew(
        name="PrePal Task Planner",
        description="Task planning agent to decide which actions to perform based on user intent.",
        tasks=[planner_task],
    )
    task_plan = str(crew.kickoff(inputs={"prompt": user_prompt}))

    # --------------------------------------------
    # 🔄 2. Dynamic Task Execution
    # --------------------------------------------
    task_list = []

    if "search" in task_plan:
        task_list.append(Task(
            agent=product_search_agent,
            description="Extract relevant product tags from {prompt}\n and search for matching items.",
            expected_output="Found product list (stored internally).",
            tools=[tool_map["search_products_by_tags"]]
        ))

    if "choose" in task_plan:
        task_list.append(Task(
            agent=product_choicer_agent,
            description="From the previous search result base on {prompt}\n. choose 1–5 items that best match the user's request.",
            expected_output="List of selected IDs, store IDs, and quantities.",
        ))

    if "add" in task_plan:
        task_list.append(Task(
            agent=cart_adder_agent,
            description="Add the selected products to the user's cart.",
            expected_output="Confirmation of products added.",
            context= task_list,
            tools=[tool_map["add_products_to_order"]]
        ))

    if "update_qty" in task_plan:
        task_list.append(Task(
            agent=quantity_updater_agent,
            description="Update the quantity of products in the user's cart based on {prompt}.",
            expected_output="Confirmation of updated quantities.",
            tools=[tool_map["update_products_quantity_in_order"]]
        ))

    if "mark" in task_plan:
        task_list.append(Task(
            agent=preference_marker_agent,
            description="Store a user preference (e.g., allergies, diets) for future use. based on {prompt}.",
            expected_output="Confirmation that the preference was saved.",
            tools=[tool_map["mark_message_as_primary"]]
        ))

    if "ask" in task_plan:
        task_list.append(Task(
            agent=clarification_agent,
            description="Ask a concise question to clarify the user's vague request. the user prompt is {prompt}.",
            expected_output="A short follow-up question.",
        ))

    if "respond" in task_plan:
        task_list.append(Task(
            agent=final_response_agent,
            description="Summarize what was done for the user (e.g., items added, preferences saved, updates made). add context from previous tasks and from the user prompt {prompt}.",
            expected_output="User-facing final response under 150 tokens.",
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
    return str(crew.kickoff(inputs={"prompt": user_prompt}))
