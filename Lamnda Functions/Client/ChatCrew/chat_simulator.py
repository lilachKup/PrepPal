from chat_repository import get_chat, save_chat
from crew import run_shopping_assistant
from models import Message
from datetime import datetime
import argparse


def run_chat(chat_id: str, client_id: str):
    chat = get_chat(chat_id, client_id)
    print(chat)
    print("🟢 Chat loaded. Type 'exit' to quit.")

    while True:
        user_input = input("\n👤 You: ")
        if user_input.lower() in {"exit", "quit"}:
            break

        # Add user message to chat
        chat.messages.append(Message(
            role="client",
            content=user_input,
            timestamp=datetime.now()
        ))

        print("🤖 Thinking...")
        response = run_shopping_assistant(chat, 'i want a yellow banana')

        # Add assistant response to chat
        chat.messages.append(Message(
            role="assistant",
            content=str(response),
            timestamp=datetime.now()
        ))

        chat.updated_at = str(datetime.now())

        save_chat(chat)

        print(f"\n🤖 Assistant: {response}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run PrePal CrewAI Chat Locally")
    parser.add_argument("--chat_id", required=True, help="Chat ID")
    parser.add_argument("--client_id", required=True, help="Client ID")
    args = parser.parse_args()

    run_chat(args.chat_id, args.client_id)
