from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional


class MessageSenderRole(Enum):
    NOT_INITIALIZED = 0
    CLIENT = 1
    ASSISTANT = 2
    SYSTEM = 3
    TOOL = 4


@dataclass
class Product:
    Id: str
    Name: Optional[str] = None
    Category: Optional[str] = None
    Tag: Optional[str] = None
    Brand: Optional[str] = None
    Price: Optional[str] = None
    Quantity: Optional[int] = None
    Store_id: Optional[str] = None
    entity_version: int = 1


@dataclass
class ProductChatGptDto:
    P_id: str
    Product_name: str
    S_id: Optional[str] = None
    Q: Optional[int] = None


@dataclass
class UpdateProductGPT:
    Id: str
    StoreId: str
    NewQuantity: int


@dataclass
class Message:
    SenderRole: Optional[MessageSenderRole] = None
    Content: Optional[str] = None
    SentAt: Optional[datetime] = None
    Version: int = 1


@dataclass
class Chat:
    ClientId: str
    ChatId: str = field(default_factory=lambda: "chat-" + datetime.now().isoformat())
    Messages: List[Message] = field(default_factory=list)
    PrimaryMessages: List[Message] = field(default_factory=list)
    OrderProducts: List[Product] = field(default_factory=list)
    ProductsToSearch: List[Product] = field(default_factory=list)
    CreatedAt: datetime = field(default_factory=datetime.now)
    UpdatedAt: datetime = field(default_factory=datetime.now)
    Latitude: float = 32.046923
    Longitude: float = 34.759446
    Version: int = 1

    def add_message(self, message: Message):
        self.Messages.append(message)
        self.UpdatedAt = message.SentAt or datetime.now()

    def add_primary_message(self, message: Message):
        self.PrimaryMessages.append(message)


@dataclass
class PostMessageRequest:
    chat_id: str
    client_id: str
    message: str
    create_chat: bool
