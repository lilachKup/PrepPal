import decimal
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List

@dataclass
class Product:
    id: str
    name: str
    quantity: int
    store_id: str
    price: decimal

    def to_dict(self):
        self.price = decimal.Decimal(str(self.price))
        return asdict(self)

@dataclass
class ProductRef:
    id: str
    quantity: int
    store_id: str
@dataclass
class ProductToolInput:
    id: str
    product_name: str
    store_id: str
    quantity: int
    price: decimal

    def to_dict(self):
        self.price = decimal.Decimal(str(self.price))
        return asdict(self)

@dataclass
class UpdateRequest:
    product_id: str
    store_id: str
    new_quantity: int

    def to_dict(self):
        return asdict(self)

@dataclass
class Message:
    role: str  # 'client', 'assistant', 'system', 'tool'
    content: str
    timestamp: datetime

    def to_dict(self):
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": str(self.timestamp)
        }

@dataclass
class Chat:
    client_id: str
    messages: List[Message] = field(default_factory=list)
    order: List[Product] = field(default_factory=list)
    latitude: decimal = 32.046923
    longitude: decimal = 34.759446
    products_to_search: List[Product] = field(default_factory=list)

    def add_message(self, message: Message):
        self.messages.append(message)

    def add_to_order(self, product: Product):
        self.order.append(product)

    def update_quantity(self, update: UpdateRequest):
        for p in self.order:
            if p.id == update.product_id and p.store_id == update.store_id:
                p.quantity = update.new_quantity
        self.order = [p for p in self.order if p.quantity > 0]

    def to_dict(self):
        return {
            "client_id": self.client_id,
            "messages": [m.to_dict() for m in self.messages],
            "order": [p.to_dict() for p in self.order],
            "latitude": self.latitude,
            "longitude": self.longitude
        }
