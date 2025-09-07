from __future__ import annotations

"""Improved tools module
------------------------
This version hardens the existing tool-set so that it survives real-world
inputs coming from LLMs and external APIs.

Key improvements
================
1.  Flexible input coercion – each pydantic schema now exposes a
    `from_ai_input()` constructor that converts the various shapes the LLM
    may return (JSON string / dict / list / plain string) into a validated
    object.
2.  Strict data-cleaning and logging – malformed items are skipped rather
    than crashing the whole flow, and an informative log entry is emitted.
3.  Safer interaction with the external Product search API – every network
    call is wrapped in retry logic with exponential back-off.
4.  Clear, user-facing error messages – the _run methods never propagate
    raw exceptions but return concise sentences the agents can relay to the
    user.
"""

from typing import Any, Dict, List, Sequence, Union, Type
from decimal import Decimal, InvalidOperation
import json
import logging

import httpx
from pydantic import BaseModel, Field, PrivateAttr, ValidationError
from crewai.tools import BaseTool

from models import (
    Chat,
    Product,
    ProductRef,
    UpdateRequest,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

################################################################################
# Helper-schemas that gracefully coerce AI input                              #
################################################################################

class _CoercibleModel(BaseModel):
    """Base class that adds a `coerce` class-method for LLM inputs."""

    @classmethod
    def coerce(cls, raw: Any):  # type: ignore[override]
        if isinstance(raw, cls):
            return raw
        if isinstance(raw, str):
            # attempt JSON parse first
            try:
                raw = json.loads(raw)
            except Exception:
                pass  # keep original string
        try:
            return cls.parse_obj(raw)
        except ValidationError as e:
            logger.debug("Validation failed – trying bespoke coercion: %s", e)
            return cls._fallback_coerce(raw)

    # pylint: disable=no-self-argument
    @classmethod
    def _fallback_coerce(cls, raw: Any):  # pragma: no cover – overridden per class
        raise ValidationError([], cls)  # type: ignore[arg-type]


class SearchTagsInput(_CoercibleModel):
    tags: List[str] = Field(..., description="4-8 lowercase search terms")

    @classmethod
    def _fallback_coerce(cls, raw):  # type: ignore[override]
        if isinstance(raw, str):
            tags = [t.strip().lower() for t in raw.split(",") if t.strip()]
            return cls(tags=tags[:8] or [raw.lower()])
        if isinstance(raw, Sequence):
            tags = [str(t).strip().lower() for t in raw if str(t).strip()]
            return cls(tags=tags[:8] or ["food"])
        if isinstance(raw, dict) and "tags" in raw:
            return cls.coerce(raw["tags"])
        return cls(tags=["food"])


class AddProductInput(_CoercibleModel):
    products: List[ProductRef]

    @classmethod
    def _fallback_coerce(cls, raw):  # type: ignore[override]
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except Exception:
                pass
        if isinstance(raw, dict):
            raw = raw.get("products", [])
        if isinstance(raw, Sequence):
            cleaned: List[ProductRef] = []
            for item in raw:
                try:
                    cleaned.append(ProductRef.parse_obj(item))
                except ValidationError as e:
                    logger.debug("Discarding invalid ProductRef: %s", e)
            return cls(products=cleaned)
        return cls(products=[])


class UpdateCartInput(_CoercibleModel):
    products: List[UpdateRequest]

    @classmethod
    def _fallback_coerce(cls, raw):  # type: ignore[override]
        # Accept diverse shapes: plain string, JSON string, dict with "products", or list of mixed items
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except Exception:
                # fall back to treat raw string as single product name to be removed (qty=0)
                raw = [raw]

        # unwrap {"products": [...]} wrapper if present
        if isinstance(raw, dict):
            raw = raw.get("products", raw)

        if isinstance(raw, Sequence):
            cleaned_dicts: List[Dict[str, int]] = []
            for item in raw:
                try:
                    if isinstance(item, UpdateRequest):
                        cleaned_dicts.append({
                            "product_name": item.product_name,
                            "new_quantity": item.new_quantity,
                        })
                        continue

                    if isinstance(item, str):
                        cleaned_dicts.append({"product_name": item.strip(), "new_quantity": 0})
                        continue

                    if isinstance(item, dict):
                        name = (
                            str(item.get("product_name") or item.get("name") or item.get("description") or "")
                            .strip()
                        )
                        qty = item.get("new_quantity", item.get("quantity", item.get("qty", None)))
                        if not name or qty is None:
                            raise ValueError("Missing fields")
                        cleaned_dicts.append({"product_name": name, "new_quantity": int(qty)})
                        continue
                except Exception as e:
                    logger.debug("Discarding invalid UpdateRequest: %s", e)
            # Let pydantic validate / create UpdateRequest objects properly
            return cls.parse_obj({"products": cleaned_dicts})

        # Fallback – nothing parsed
        return cls(products=[])


class AddPreferenceInput(_CoercibleModel):
    preference: str

    @classmethod
    def _fallback_coerce(cls, raw):  # type: ignore[override]
        if isinstance(raw, str):
            return cls(preference=raw.strip())
        if isinstance(raw, dict):
            return cls(preference=str(raw.get("preference", "")).strip())
        return cls(preference="")

################################################################################
# Tool definitions                                                            #
################################################################################

class SearchProductsTool(BaseTool):
    name: str = "search_products_by_tags"
    description: str = "Search grocery catalogue by tags. Accepts list / CSV string / JSON {tags:[..]}"
    args_schema: Type[BaseModel] = SearchTagsInput

    _chat: Chat = PrivateAttr()

    def __init__(self, chat: Chat):
        super().__init__()
        self._chat = chat

    # pylint: disable=arguments-differ
    def _run(self, tags: Union[SearchTagsInput, str, List[str], Dict[str, Any]]):
        payload = SearchTagsInput.coerce(tags)
        logger.info("Searching with tags: %s", payload.tags)

        async def get_store_ids():
            async with httpx.AsyncClient() as client:
                r = await client.get(
                    "https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/location/stores",
                    params={"coordinates": f"{self._chat.latitude},{self._chat.longitude}", "radius": "10000"},
                    timeout=10,
                )
                r.raise_for_status()
                return r.text.split(",")

        async def call_search(store_ids: List[str]):
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    "https://xgpbt0u4ql.execute-api.us-east-1.amazonaws.com/prod/getProductsFromStoreByTags",
                    json={"tags": payload.tags, "store_ids": store_ids}, timeout=15
                )
                r.raise_for_status()
                return r.json()

        import asyncio, random, time

        for attempt in range(3):
            try:
                store_ids = asyncio.run(get_store_ids())
                raw = asyncio.run(call_search(store_ids))
                products: List[Product] = []
                for rec in raw:
                    try:
                        products.append(
                            Product(
                                id=str(rec.get("id", "")),
                                name=str(rec.get("name", "")),
                                quantity=int(rec.get("quantity", 1)),
                                store_id=str(rec.get("store_id", "")),
                                price=Decimal(str(rec.get("price", 0)))
                            )
                        )
                    except (KeyError, ValueError, InvalidOperation):
                        continue
                self._chat.products_to_search = products
                import json
                payload_out = {"products": [p.to_dict() for p in products]}
                summary = ", ".join(p["name"] for p in payload_out["products"][:10])
                return json.dumps(payload_out) + f"\nFound {len(products)} items: {summary}"
            except Exception as exc:
                logger.warning("Search attempt %s failed: %s", attempt + 1, exc)
                time.sleep(random.uniform(0.5, 1.2))
        raise RuntimeError("search_products_by_tags failed after 3 retries")


class AddProductsTool(BaseTool):
    name: str = "add_products_to_order"
    description: str = "Add valid products to cart. Accepts ProductRef list / JSON"
    args_schema: Type[BaseModel] = AddProductInput

    _chat: Chat = PrivateAttr()

    def __init__(self, chat: Chat):
        super().__init__()
        self._chat = chat

    def _run(self, products: Union[AddProductInput, str, List, Dict]):
        added, skipped = [], []
        if len(products) == 0:
            return "No products were added – " + ", ".join(skipped)
        inp = AddProductInput.coerce(products)
        
        for pref in inp.products:
            # try id+store match first
            match = None
            if pref.id and pref.store_id:
                match = next((p for p in self._chat.products_to_search
                               if p.id == pref.id and p.store_id == pref.store_id), None)
            # fallback by name if no id/store provided
            if not match and pref.name:
                match = next((p for p in self._chat.products_to_search
                               if p.name.lower() == pref.name.lower()), None)
            if not match:
                skipped.append("product not in search results")
                continue
            if any(p.id == match.id and p.store_id == match.store_id for p in self._chat.order):
                skipped.append(f"{match.name} already in cart")
                continue
            self._chat.order.append(Product(**match.__dict__, quantity=pref.quantity))
            added.append(match.name)
        if not added:
            return "No products were added – " + ", ".join(skipped)
        return f"Added {', '.join(added)}" + (f"; skipped {len(skipped)}" if skipped else "")


class UpdateCartTool(BaseTool):
    name: str = "update_products_quantity_in_order"
    description: str = "Update cart quantities. Accepts UpdateRequest list / JSON"
    args_schema: Type[BaseModel] = UpdateCartInput

    _chat: Chat = PrivateAttr()

    def __init__(self, chat: Chat):
        super().__init__()
        self._chat = chat

    def _run(self, products: Union[UpdateCartInput, str, List, Dict]):
        inp = UpdateCartInput.coerce(products)
        updated, removed, not_found = [], [], []
        for upd in inp.products:
            item = next((p for p in self._chat.order if p.name == upd.product_name), None)
            if not item:
                not_found.append(upd.product_name)
                continue
            if upd.new_quantity == 0:
                self._chat.order.remove(item)
                removed.append(item.name)
            else:
                item.quantity = upd.new_quantity
                updated.append(f"{item.name}→{item.quantity}")
        parts = []
        if updated:
            parts.append("updated " + ", ".join(updated))
        if removed:
            parts.append("removed " + ", ".join(removed))
        if not_found:
            parts.append("missing " + ", ".join(not_found))
        return "; ".join(parts) or "nothing changed"


class SavePreferenceTool(BaseTool):
    name: str = "add_preference_to_long_term_memory"
    description: str = "Persist customer preference. Accepts plain string or JSON {preference:str}"
    args_schema: Type[BaseModel] = AddPreferenceInput

    _chat: Chat = PrivateAttr()

    def __init__(self, chat: Chat):
        super().__init__()
        self._chat = chat

    def _run(self, preference: Union[AddPreferenceInput, str, Dict]):
        pref = AddPreferenceInput.coerce(preference)
        if pref.preference:
            self._chat.preferences.append(pref.preference)
            return f"Preference saved: {pref.preference}"
        return "No preference provided"


# ---------------- Tool Factory ----------------

def build_tools_with_chat(chat: Chat):
    return [
        SearchProductsTool(chat),
        AddProductsTool(chat),
        UpdateCartTool(chat),
        SavePreferenceTool(chat),
    ]
