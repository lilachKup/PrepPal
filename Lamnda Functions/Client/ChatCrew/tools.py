from typing import List, Type
from datetime import datetime
from pydantic import BaseModel, Field, PrivateAttr
from crewai.tools import BaseTool
from models import Chat, Product, ProductToolInput, UpdateRequest, Message, ProductRef
import httpx

# ---------------- Tool Input Schemas ----------------

class SearchTagsInput(BaseModel):
    tags: List[str] = Field(..., description="List of 6–8 lowercase product tags")

class AddProductInput(BaseModel):
    products: List[ProductRef] = Field(..., description="Products to add to order")

class UpdateCartInput(BaseModel):
    products: List[UpdateRequest] = Field(..., description="Updated product quantities")

class MarkPrimaryInput(BaseModel):
    role: str = Field(..., description="Message sender role (e.g., client)")
    content: str = Field(..., description="Long-term fact to store (e.g., allergy)")

# ---------------- Tool Classes ----------------

class SearchProductsTool(BaseTool):
    name: str = "search_products_by_tags"
    description: str = "Search for products using tags and location"
    args_schema: Type[BaseModel] = SearchTagsInput

    _chat: Chat = PrivateAttr()

    def __init__(self, chat: Chat):
        super().__init__()
        self._chat = chat

    def _run(self, tags: List[str]) -> str:
        """Search for products matching the given tags."""
        import asyncio

        async def get_store_ids():
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/location/stores",
                    params={"coordinates": f"{self._chat.latitude},{self._chat.longitude}", "radius": "10000"}
                )
                response.raise_for_status()
                return response.text.strip().split(",")

        store_ids = asyncio.run(get_store_ids())

        for _ in range(3):
            try:
                async def do_search():
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            "https://xgpbt0u4ql.execute-api.us-east-1.amazonaws.com/prod/getProductsFromStoreByTags",
                            json={"tags": tags, "store_ids": store_ids}
                        )
                        response.raise_for_status()
                        print(response.json())
                        return response.json()

                data = asyncio.run(do_search())

                products = [
                    Product(
                        id=p["id"],
                        name=p["name"],
                        quantity=p.get("quantity", 1),
                        store_id=p["store_id"],
                        price=float(p.get("price", 0))
                    ) for p in data
                ]
                print(products)
                self._chat.products_to_search = products
                return products
            except Exception as e:
                print(f"Search error: {e}")
        raise Exception("Failed to search products after 3 attempts.")

class AddProductsTool(BaseTool):
    name: str = "add_products_to_order"
    description: str = "Add products to the user's cart from the previous search"
    args_schema: Type[BaseModel] = AddProductInput

    _chat: Chat = PrivateAttr()

    def __init__(self, chat: Chat):
        super().__init__()
        self._chat = chat

    def _run(self, products: List[ProductRef]) -> str:
        """Add non-duplicate products from same store to the cart."""
        print(products)
        added = []
        for prod in products:
            match: List[Product] = [p for p in self._chat.products_to_search
                                    if p.id == prod['id'] and p.store_id == prod['store_id'] and p.quantity >= prod['quantity']]

            print(f'match: {match}')
            if not match or any(p.id == match[0].id and p.store_id == match[0].store_id for p in self._chat.order):
                continue

            match[0].quantity = prod['quantity']
            self._chat.order.append(match[0])
            added.append(match[0].name)

        return f"Added: {', '.join(added)}" if added else "No valid products added."

class UpdateCartTool(BaseTool):
    name: str = "update_products_quantity_in_order"
    description: str = "Update quantities of products already in the cart"
    args_schema: Type[BaseModel] = UpdateCartInput

    _chat: Chat = PrivateAttr()

    def __init__(self, chat: Chat):
        super().__init__()
        self._chat = chat

    def _run(self, products: List[UpdateRequest]) -> str:
        """Update quantities or remove products if quantity is zero."""
        updated = []
        for update in products:
            for p in self._chat.order:
                if p.id == update.product_id and p.store_id == update.store_id:
                    p.quantity = update.new_quantity
                    updated.append(p.name)

        self._chat.order = [p for p in self._chat.order if p.quantity > 0]
        return f"Updated: {', '.join(updated)}" if updated else "No matching products updated."

class MarkMessageTool(BaseTool):
    name: str = "mark_message_as_primary"
    description: str = "Store user preferences like allergies or diets"
    args_schema: Type[BaseModel] = MarkPrimaryInput

    _chat: Chat = PrivateAttr()

    def __init__(self, chat: Chat):
        super().__init__()
        self._chat = chat

    def _run(self, role: str, content: str) -> str:
        """Mark a user message as long-term memory."""
        msg = Message(role=role, content=content, timestamp=datetime.now())
        self._chat.messages.append(msg)
        return "Message marked as primary."

# ---------------- Tool Factory ----------------

def build_tools_with_chat(chat: Chat):
    return [
        SearchProductsTool(chat),
        AddProductsTool(chat),
        UpdateCartTool(chat),
        MarkMessageTool(chat),
    ]
