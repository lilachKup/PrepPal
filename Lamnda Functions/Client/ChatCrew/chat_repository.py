import decimal

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
    return chat.to_dict()


def product_to_dynamodb_dict(product: Product) -> dict:
    """Convert Product to dict for DynamoDB storage (keeping Decimal types)"""
    return {
        "id": product.id,
        "name": product.name,
        "quantity": product.quantity,
        "store_id": product.store_id,
        "price_agorot": decimal.Decimal(str(product.price_agorot))  # Keep as Decimal for DynamoDB
    }


def chat_from_dict(data: dict) -> Chat:
    return Chat.from_dict(data)


def get_chat(chat_id: str, client_id: str) -> Chat:
    """Load a chat from DynamoDB."""
    response = chat_table.get_item(Key={"chat_id": chat_id, "client_id": client_id})
    if "Item" not in response:
        raise Exception("Chat not found")
    return chat_from_dict(response["Item"])


def save_chat(chat: Chat) -> None:
    """Write a chat to DynamoDB."""
    chat_table.put_item(Item=chat_to_dict(chat))
