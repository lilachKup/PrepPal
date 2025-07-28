import boto3
import os
from decimal import Decimal
from datetime import datetime
from models import Chat, Message, Product

# Setup
CHAT_TABLE_NAME = os.getenv("CHAT_TABLE_NAME", "ChatHistory")
#DYNAMODB_ENDPOINT = os.getenv("DYNAMODB_ENDPOINT_URL")  # For local dev

dynamodb = boto3.resource("dynamodb")
chat_table = dynamodb.Table(CHAT_TABLE_NAME)


def chat_to_dict(chat: Chat) -> dict:
    return {
        "chat_id": chat.chat_id,
        "client_id": chat.client_id,
        "messages": [m.to_dict() for m in chat.messages],
        "order": [p.to_dict() for p in chat.order],
        "latitude": Decimal(str(chat.latitude)),
        "longitude": Decimal(str(chat.longitude)),
        "created_at": chat.created_at,
        "updated_at": chat.updated_at
    }


def chat_from_dict(data: dict) -> Chat:
    chat = Chat(client_id=data["client_id"])
    chat.chat_id = data["chat_id"]
    chat.latitude = float(data.get("latitude", 32.046923))
    chat.longitude = float(data.get("longitude", 34.759446))
    chat.created_at = data["created_at"]
    chat.updated_at = data["updated_at"]
    chat.messages = [Message(**m) for m in data.get("messages", [])]
    chat.order = [Product(**p) for p in data.get("order", [])]
    return chat


def get_chat(chat_id: str, client_id: str) -> Chat:
    """Load a chat from DynamoDB."""
    response = chat_table.get_item(Key={"chat_id": chat_id, "client_id": client_id})
    if "Item" not in response:
        raise Exception("Chat not found")
    return chat_from_dict(response["Item"])


def save_chat(chat: Chat) -> None:
    """Write a chat to DynamoDB."""
    chat_table.put_item(Item=chat_to_dict(chat))
