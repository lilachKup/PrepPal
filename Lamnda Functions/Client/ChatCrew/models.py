import decimal
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

@dataclass
class Product:
    id: str
    name: Optional[str] = None
    category: Optional[str] = None
    tag: Optional[str] = None
    brand: Optional[str] = None
    price_agorot: int = 0
    quantity: Optional[int] = None
    store_id: Optional[str] = None
    cached_at: Optional[datetime] = field(default_factory=datetime.utcnow)
    entity_version: int = 1

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "quantity": self.quantity,
            "store_id": self.store_id,
            "category": self.category,
            "tag": self.tag,
            "brand": self.brand,
            "price_agorot": self.price_agorot,
            "cached_at": self.cached_at.isoformat() if self.cached_at else None,
            "entity_version": self.entity_version,
        }

    @staticmethod
    def from_dict(data: dict):
        print(data)

        price_agorot = int(decimal.Decimal(str(data.get("price_agorot", 0))))
        if "price_agorot" not in data:
            price_agorot = int(decimal.Decimal(str(data.get("price", 0))) * 100)

        return Product(
            id=data.get("id"),
            name=data.get("name"),
            quantity=data.get("quantity"),
            store_id=data.get("store_id"),
            price_agorot=price_agorot,
            category=data.get("category"),
            tag=data.get("tag"),
            brand=data.get("brand"),
            cached_at=datetime.fromisoformat(data["cached_at"]) if data.get("cached_at") else None,
            entity_version=data.get("entity_version", 1),
        )

class ProductRef(BaseModel):
    """Lightweight reference to a product when the full details are not needed."""

    id: str = Field(..., alias="product_id")
    name: str | None = Field(None, alias="product_name")
    quantity: int = Field(1, alias="qty")
    store_id: str = Field(..., alias="store_id")
@dataclass
class ProductToolInput:
    id: str
    product_name: str
    store_id: str
    quantity: int
    price: decimal

    def to_dict(self):
        return {
            "id": self.id,
            "product_name": self.product_name,
            "store_id": self.store_id,
            "quantity": self.quantity,
            "price": float(self.price)
        }

class UpdateRequest(BaseModel):
    """Represents a quantity update for a product in the cart.

    Accepts both the canonical field names (``product_name``, ``new_quantity``)
    and common synonyms coming from the LLM/agent outputs (``description`` for
    product name and ``quantity``/``qty`` for the new quantity)."""

    product_name: str = Field(..., alias="description")
    new_quantity: int = Field(..., alias="quantity")

    model_config = {
        "populate_by_name": True,
        "extra": "ignore",
    }

    def to_dict(self):
        return {
            "product_name": self.product_name,
            "new_quantity": self.new_quantity,
        }

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
    chat_id: str = None
    messages: List[Message] = field(default_factory=list)
    preferences: List[str] = field(default_factory=list)  # For storing user preferences
    order: List[Product] = field(default_factory=list)
    latitude: decimal = 32.046923
    longitude: decimal = 34.759446
    products_to_search: List[Product] = field(default_factory=list)
    products_suggested: List[Dict] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: str(datetime.now()))
    updated_at: str = field(default_factory=lambda: str(datetime.now()))
    stores_carts: Dict[str, List] = field(default_factory=dict)

    @property
    def active_store_id(self) -> Optional[str]:
        s = {p.store_id for p in self.order if p.store_id}
        return next(iter(s)) if s else None

    def touch(self):
        self.updated_at = datetime.utcnow()

    def add_message(self, message: Message):
        self.messages.append(message)

    def add_to_order(self, product: Product):
        self.order.append(product)

    def update_quantity(self, update: UpdateRequest):
        for p in self.order:
            if p.id == update.product_id and p.store_id == update.store_id:
                p.quantity = update.new_quantity
        self.order = [p for p in self.order if p.quantity > 0]

    @staticmethod
    def from_dict(data: dict):
        chat = Chat(client_id=data["client_id"])
        chat.chat_id = data["chat_id"]
        chat.latitude = decimal.Decimal(str(data.get("latitude", 32.046923)))
        chat.longitude = decimal.Decimal(str(data.get("longitude", 34.759446)))
        chat.created_at = data["created_at"]
        chat.updated_at = data["updated_at"]
        chat.messages = [Message(**m) for m in data.get("messages", [])]
        chat.products_suggested = data.get("products_suggested", [])

        # Convert price back to Decimal for Product objects
        products = []
        for p in data.get("order", []):
            p_copy = p.copy()
            if "price" in p_copy:
                p_copy["price"] = decimal.Decimal(str(p_copy["price"]))
            products.append(Product(**p_copy))
        chat.order = products
        chat.preferences = data.get("preferences", [])
        chat.stores_carts = data.get("stores_carts", {})

        return chat

    def to_dict(self):
        return {
            "client_id": self.client_id,
            "chat_id": self.chat_id,
            "messages": [m.to_dict() for m in self.messages],
            "order": [p.to_dict() for p in self.order],
            "latitude": decimal.Decimal(str(self.latitude)),
            "longitude": decimal.Decimal(str(self.longitude)),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "active_store_id": self.active_store_id,
            "preferences": self.preferences,
            "stores_carts" : self.stores_carts,
            "products_suggested": self.products_suggested
        }

    def add_to_stores_carts(self, products: List[Product]):
        #print(f"adding to the stores carts: {products}")
        for product in products:
            if isinstance(product, dict):
                product = Product.from_dict(product)

            if product.store_id not in self.stores_carts:
                self.stores_carts[product.store_id] = []

            p_dict = product.to_dict()
            if p_dict not in self.stores_carts[product.store_id]:
                self.stores_carts[product.store_id].append(p_dict)

        print(f"\n\nstores carts now: {self.stores_carts}")

