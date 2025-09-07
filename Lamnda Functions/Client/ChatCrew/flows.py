import json
import logging
import os
from typing import List, Dict, Any, Set

import requests
from pydantic import BaseModel
from crewai.flow.flow import Flow, listen, start, router, or_

from agents import IntentAgent, IntentInput, ResponseAgent, ResponseInput, IntentOutput, SearchInput, SearchAgent, \
    ProductSelectorAgent, ProductSelectorInput, AddCartAgent, AddCartInput, AddCartOutput, CustomResponseAgent, \
    CustomResponseInput, CustomResponseOutput, URCartAgent, URCartInput, URCartOutput, \
    PreferenceAgent, PreferenceInput, PreferenceOutput

from models import Chat, Product
from mocks.products_service import mock_products_api_call
from mocks.location_service import mock_location_api_call


#------------------------------------------
#               Models
#------------------------------------------

class FlowDescription(BaseModel):
    name: str
    description: str

class FlowOutput(BaseModel):
    success: bool
    fail_reason: str | None = None
    summary: str
    details: Dict[str, Any]

#------------------------------------------
#               Main Flow
#------------------------------------------

class MainFlow(Flow):
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Enable verbose mode for better logging
        self.verbose = True
        self.state['fail'] = False
        print("🏗️ MainFlow initialized with verbose logging")

    @start()
    def find_intent(self):

        chat = self.state.get("chat")
        if not chat:
            raise ValueError("Chat object is required to start the flow.")

        user_message = self.state.get("user_message")
        if not user_message:
            raise ValueError("User message is required to start the flow.")

        self.state["before_user_message_cart"] = [prod.to_dict() for prod in chat.order]

        intent, flows_names = self.determine_intent(chat, user_message)

        if intent.selected_flow not in flows_names:
            print(f"Intent agent selected unknown flow: {intent.selected_flow}")
            self.state['error'] = f"Intent agent selected unknown flow: {intent.selected_flow}"
            self.state['fail'] = True
            return "I'm sorry, I couldn't determine how to assist with that request."

        return intent.selected_flow

    def determine_intent(self, chat: Chat, user_message: str) -> (IntentOutput, List[str]):
        possible_flows = [
            FlowDescription(name="ProductSearchFlow", description="Handles product search queries. call when searching for products. even if we suggested products to the user, you can call this flow to search for the products if the user need new searching."),
            FlowDescription(name="UpdateOrRemoveCartFlow", description="Handles updating quantities of items in the cart or remove from the cart. call when the user wants to change quantities of items in the cart or remove from the cart."),
            FlowDescription(name="AddToCartFlow", description="Handles adding products to the cart. call it if we suggested to the user items and he accepted it if no call the search flow. this is only for adding new products after searching for them. not for search or edit the cart."),
            FlowDescription(name="PreferencesFlow", description="Handles updating user preferences. call it when the user wants to update his preferences. need to be understood that this flow does not change the cart and it need to be understood from the user message and context"),
        ]
        intent_agent = IntentAgent()
        intent_input = IntentInput(
            user_message=user_message,
            chat_history=[{"role": msg.role, "content": msg.content} for msg in chat.messages],
            possible_flows=possible_flows,
            current_cart= [prod.to_dict() for prod in chat.order],
            current_store={"id": chat.order[0].store_id} if chat.order and len(chat.order) > 0 else None
        )
        return intent_agent.call(intent_input), [possible_flow.name for possible_flow in possible_flows]

    @router(find_intent)
    def route_flows(self, selected_flow) -> str:
        if self._state['fail']:
            return "I'm sorry, I couldn't complete your request due to an internal problem. Please try again."

        self._printer.print(f"Routing to flow: {selected_flow}", color="green")

        if selected_flow == "ProductSearchFlow":
            return "flow_router.ProductSearchFlow"

        elif selected_flow == "AddToCartFlow":
            return "flow_router.AddToCartFlow"

        elif selected_flow == "UpdateOrRemoveCartFlow":
            return "flow_router.UpdateOrRemoveCartFlow"

        elif selected_flow == "PreferencesFlow":
            return "flow_router.PreferencesFlow"

        return "I'm sorry, I couldn't determine how to assist with that request."

# --------------------------------------------------
#               Preferences Flow
# --------------------------------------------------

    @listen("flow_router.PreferencesFlow")
    def handle_preferences(self):
        chat: Chat = self.state.get("chat")
        user_message: str = self.state.get("user_message")

        if not chat or not user_message:
            raise ValueError("Chat and user_message are required to start the flow.")

        preferences = chat.preferences

        preference_agent = PreferenceAgent()
        preference_input = PreferenceInput(
            user_message=user_message,
            chat_history=[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]],  # last 10 messages
            current_preferences=preferences
        )

        try:
            preference_output: PreferenceOutput = preference_agent.call(preference_input)
            self._printer.print(f"Extracted preferences: {preference_output.new_preferences}, reason: {preference_output.reason}", color="blue")

            # Update chat preferences
            chat.preferences = list(set(chat.preferences + preference_output.new_preferences))

            self.state['last_flow_output'] = FlowOutput(
                success=True,
                summary=f"Updated user preferences. reason: {preference_output.reason}",
                details={"new_preferences": preference_output.new_preferences}
            )




        except Exception as e:
            logging.error(f"Error extracting preferences: {e}")
            self._state['error'] = f"Error extracting preferences: {e}"
            self._state['fail'] = True

            self.state['last_flow_output'] = FlowOutput(
                success=False,
                fail_reason=f"Error extracting preferences: {e}",
                summary="Failed to update user preferences.",
                details={}
            )






#------------------------------------------
#           Product Search Flow
#------------------------------------------

    @listen("flow_router.ProductSearchFlow")
    def craft_tags(self) -> List[str]:
        self._printer.print("Crafting tags", color="green")
        chat: Chat = self.state.get("chat")
        user_message: str = self.state.get("user_message")

        if not chat or not user_message:
            raise ValueError("Chat and user_message are required to start the flow.")
        tags = []
        try:
            tags = self._generate_tags(chat, user_message)
            self._printer.print(tags, color="blue")

        except:
            logging.error("Error generating tags")
            self._state['error'] = "Error generating tags"
            self._state['fail'] = True

        self._state['tags'] = tags

    @listen(craft_tags)
    def search_products(self) -> List[Product]:
        if self._state['fail']:
            self._printer.print(f"srearch_prosucts skipped due to previous error", color="red")
            return []

        tags: List[str] = self._state.get('tags', [])
        products = []
        try:
            products = self._get_products(tags) if os.getenv("USE_MOCK_STORES_PRODUCTS", "true") == "false" else self._get_products_mock(tags)
            self._printer.print(f"Found {len(products)} products", color="blue")
        except Exception as e:
            logging.error(f"Error fetching products: {e}")
            self._state['error'] = f"Error fetching products: {e}"
            self._state['fail'] = True

        return products


    @listen(search_products)
    def select_fit_products(self, products: List[Product]):
        chat: Chat = self.state.get("chat")
        if not chat:
            raise ValueError("Chat object is required for selecting products.")

        selected_products = self._choose_best_products(chat, products)
        self._printer.print(f"Selected {len(selected_products)} products", color="blue")
        return selected_products


    @router(select_fit_products)
    def finalize_search_flow(self, selected_products: List[Dict]) -> str | None:
        chat: Chat = self.state.get("chat")
        if not chat:
            raise ValueError("Chat object is required for finalizing the flow.")

        if self._state['fail']:
            self.state['last_flow_output'] = FlowOutput(
                success=False,
                fail_reason=self._state.get('error', 'Unknown error'),
                summary="Product search flow failed.",
                details={}
            )
            return "search_flow.ResponseFlow"

        if not selected_products:
            self.state['last_flow_output'] = FlowOutput(
                success=False,
                fail_reason="No products found",
                summary="No products matched your search criteria.",
                details={}
            )
            return "search_flow.ResponseFlow"

        chat.products_suggested = selected_products
        chat.add_to_stores_carts(selected_products)


        self.state['products_suggested'] = [{"name": prod['name'], "brand": prod['brand'] } for prod in selected_products]

        next_flow = self._search_flow_decide_next()
        self._printer.print(f"Next flow decided: {next_flow.selected_flow} , reason: {next_flow.reason}", color="green")

        self.state['last_flow_output'] = FlowOutput(
            success=True,
            summary=f"Found {len(selected_products)} products matching your request.",
            details={"found_products": [prod for prod in selected_products], "reason_calling_this_flow": next_flow.reason}
        )

        if next_flow.selected_flow == "AddToCartFlow":
            return "search_flow.AddToCartFlow"  # Not implemented yet

        elif next_flow.selected_flow == "ResponseFlow":
            return "search_flow.response"


    #@router(select_fit_products)
    def suggest_products(self, selected_products: List[Product]):

        chat: Chat = self.state.get("chat")
        if not chat:
            raise ValueError("Chat object is required for finalizing the flow.")

        if self._state['fail']:
            self.state['last_flow_output'] = FlowOutput(
                success=False,
                fail_reason=self._state.get('error', 'Unknown error'),
                summary="Product search flow failed.",
                details={}
            )
            return "search_flow.ResponseFlow"

        if not selected_products:
            self.state['last_flow_output'] = FlowOutput(
                success=False,
                fail_reason="No products found",
                summary="No products matched your search criteria.",
                details={}
            )
            return "search_flow.ResponseFlow"

        chat.products_suggested = selected_products
        chat.add_to_stores_carts(selected_products)

        if len(chat.order) == 0:
            self._printer.print(f"cart is empty", color="red")
            self.state['last_flow_output'] = FlowOutput(
                success=True,
                fail_reason="Suggested products to empty cart.",
                summary="The user need to pick from the products because the cart is empty and there are no comparisons to be made.",
                details={"products": selected_products}
            )
            return "search_flow.suggest_for_empty_cart"

        all_products = [p.to_dict() for p in chat.order] + [p for p in chat.products_suggested]


        best_match = self._find_best_store_for_products(chat=chat, products={p['name'] for p in all_products})
        self._printer.print(f"Best store match: {best_match}", color="bold_blue")

        if best_match['ratio'] < 0.3:
            #TODO : ask the user to choose a store
            self._printer.print(f"Low match ratio, need to ask user to choose a store", color="red")
            self.state['last_flow_output'] = FlowOutput(
                success=False,
                fail_reason="Suggested products do not fit well with any store.",
                summary="The suggested products do not fit well with any of your preferred stores. Please specify a store to proceed.",
                details={"products":selected_products}
            )

            return "search_flow.suggest_for_empty_cart"

        if best_match['store_id'] == chat.active_store_id:
            self._printer.print(f"Suggested products fit well with current store {chat.active_store_id}", color="green")

            fit_products = [prod for prod in all_products if prod['name'] in {p['name'] for p in chat.stores_carts[chat.active_store_id]}]

            if best_match['ratio']  > 0.99:
                self.state['last_flow_output'] = FlowOutput(
                    success=True,
                    summary=f"All suggested products fit well with the current store {chat.active_store_id}.",
                    details={"products":selected_products}
                )
                self.state['all_fit'] = True

            else:
                self.state['last_flow_output'] = FlowOutput(
                    success=True,
                    summary=f"Most of the suggested products fit well with the current store {chat.active_store_id}.",
                    details={
                        "all_fit_products": [prod['name'] for prod in fit_products],
                        "found_products": [prod['name'] for prod in selected_products if
                                         prod['name'] in {p['name'] for p in chat.stores_carts[chat.active_store_id]}]
                    }
                )

                self.state['all_fit'] = False

            chat.products_suggested = fit_products

            return "search_flow.response"

        else:
            self._printer.print(f"Suggested products fit better with store {best_match['store_id']} than current store {chat.active_store_id}", color="yellow")
            self.state['last_flow_output'] = FlowOutput(
                success=True,
                summary=f"Most of the suggested products fit well with the current store {best_match['store_id']}, with match ratio of {best_match['ratio']}.",
                details={
                    "suggested_store": best_match['store_id'],
                    "suggested_cart": [prod for prod in all_products if
                                     prod in [p['name'] for p in chat.stores_carts[best_match['store_id']]]],
                }
            )

            return "search_flow.suggest_new_store"

    @listen("search_flow.response")
    def search_flow_response(self):

        response_agent : CustomResponseAgent = CustomResponseAgent()
        chat: Chat = self.state.get("chat")
        user_message: str = self.state.get("user_message")

        if not chat or not user_message:
            raise ValueError("Chat and user_message are required to start the flow.")

        custom_response_input = CustomResponseInput(
            user_message=user_message,
            chat_history=[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]],  # last 10 messages
            prompt=f"""
            You provide a summary of the products that you suggested to the user.
            You should list the products that fit well with the current store {chat.active_store_id}.
            You should not ask the user to switch to another store.
            
            if it all fit well don't mention that it fit well.
            if it fit well only partially, mention that it fit well only partially.
            is_fit_well: {self.state.get('all_fit', False)}
            
            Write the summary to the user in a nice way.
            Write to the user the new products that you suggested. {self.state['last_flow_output'].details['found_products']}
            
            dont include how many each store have from each product (quantity field in the product).
            if there is the same product in multiple stores, just mention the product once, from the store that fit best to the user cart or requests.
            DONT write the tags of the products.
            
            more context to pay attention to:
            summery of what you did: {self.state['last_flow_output'].summary}
            current store: {chat.active_store_id}
            current cart: {[prod.to_dict() for prod in chat.order]}
            """
        )

        try:
            response : CustomResponseOutput = response_agent.call(custom_response_input)
            self._printer.print(f"Custom response: {response.response},\n reason: {response.reason}", color="blue")
            return response.response
        except Exception as e:
            logging.error(f"Error generating custom response: {e}")
            self._state['error'] = f"Error generating custom response: {e}"
            self._state['fail'] = True
            return "I'm sorry, I couldn't generate a response after searching for products."




    @listen("search_flow.suggest_for_empty_cart")
    def suggest_for_empty_cart(self):

        selected_products = self.state.get("last_flow_output").details.get("products", [])
        chat: Chat = self.state.get("chat")
        if not chat:
            raise ValueError("Chat object is required for finalizing the flow.")
        if not selected_products or len(selected_products) == 0:
            raise ValueError("No products to suggest.")
        response_agent : CustomResponseAgent = CustomResponseAgent()
        user_message: str = self.state.get("user_message")
        if not user_message:
            raise ValueError("User message is required to start the flow.")

        products_names = {prod['name'] for prod in selected_products}

        custom_response_input = CustomResponseInput(
            user_message=user_message,
            prompt=f"""
            You provide a summary of the products that you suggested to the user.
            You should list the products that you suggested to the user.
            You should ask the user to choose a store to add these products to.
            Write the summary to the user in a nice way.
            Write to the user the products that you suggested. {products_names}
            
            more context to pay attention to:
            the cart right now is empty.
            summery of what you did: {self.state['last_flow_output'].summary}
            chat history: {[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]]}
            """
        )
        try:
            response : CustomResponseOutput = response_agent.call(custom_response_input)
            self._printer.print(f"Custom response: {response.response},\n reason: {response.reason}", color="blue")
            return response.response

        except Exception as e:
            logging.error(f"Error generating custom response: {e}")
            self._state['error'] = f"Error generating custom response: {e}"
            self._state['fail'] = True
            return "I'm sorry, I couldn't generate a response to suggest products."



    @listen("search_flow.suggest_new_store")
    def search_flow_suggest_new_store(self):
        response_agent : CustomResponseAgent = CustomResponseAgent()

        chat: Chat = self.state.get("chat")
        user_message: str = self.state.get("user_message")

        if not chat or not user_message:
            raise ValueError("Chat and user_message are required to start the flow.")

        custom_response_input = CustomResponseInput(
            user_message=user_message,
            prompt=f"""
            You suggest to the user to switch to store {self.state['last_flow_output'].details['suggested_store']}
            because most of the products that you suggested fit well with this store.
            You should list the products that fit well with this store.
            You should ask the user if he wants to switch to this store.
            
            The cart that most fit to the suggested products is: {self.state['last_flow_output'].details['suggested_cart']}
            write it to the user in a nice way.
            
            if the current cart is empty so dont mention the switching of the store, and
            just suggest the products that we suggested.
            current cart len: {len(chat.order)}
            
            more context to pay attention to:
            current store: {chat.active_store_id}
            current cart: {[prod.to_dict() for prod in chat.order]}
            chat history: {[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]]}
            """
        )

        try:
            custom_response_output: CustomResponseOutput = response_agent.call(custom_response_input)
            self._printer.print(f"Custom response: {custom_response_output.response},\n reason: {custom_response_output.reason}", color="blue")
            return custom_response_output.response

        except Exception as e:
            logging.error(f"Error generating custom response: {e}")
            self._state['error'] = f"Error generating custom response: {e}"
            self._state['fail'] = True
            return "I'm sorry, I couldn't generate a response to suggest switching stores."


    def _find_best_store_for_products(self, products: Set[str], chat: Chat) -> Dict:

        stores_match_ratio = {}

        for store_id, store_products in chat.stores_carts.items():
            match_count = sum(1 for prod in store_products if prod['name'] in products)
            stores_match_ratio[store_id] = match_count / len(products) if products else 0

        max_fit = {"store_id": None, "ratio": 0}
        for store_id, ratio in stores_match_ratio.items():
            if ratio > max_fit['ratio']:
                max_fit['store_id'] = store_id
                max_fit['ratio'] = ratio

        return max_fit


    def _search_flow_decide_next(self):
        decide_agent = IntentAgent()
        chat: Chat = self.state.get("chat")
        user_message: str = self.state.get("user_message")

        intent_input = IntentInput(
            user_message=user_message,
            chat_history=[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]],  # last 10 messages
            possible_flows=[
                FlowDescription(name="AddToCartFlow", description="Handles adding products to the cart. call it only if the user actively wants to add products to the cart."),
                FlowDescription(name="ResponseFlow", description="Ends the current interaction and provides a response to the user. call it when you have provided enough information to the user and no further action is needed.")
            ],
            current_cart=[prod.to_dict() for prod in chat.order],
            current_store={"id": chat.order[0].store_id} if chat.order and len(chat.order) > 0 else None
        )

        intent_output = None
        try:
            intent_output = decide_agent.call(intent_input)
        except Exception as e:
            logging.error(f"Error determining next flow: {e}")
            self._state['error'] = f"Error determining next flow: {e}"
            self._state['fail'] = True
            return "ResponseFlow"

        if intent_output.selected_flow not in ["AddToCartFlow", "ResponseFlow"]:
            logging.error(f"Decide agent selected unknown flow: {intent_output.selected_flow}")
            self._state['error'] = f"Decide agent selected unknown flow: {intent_output.selected_flow}"
            self._state['fail'] = True
            return "ResponseFlow"

        return intent_output

    def _generate_tags(self, chat, user_message):
        search_agent = SearchAgent()
        search_input = SearchInput(
            user_message=user_message,
            chat_history=[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]],  # last 10 messages
            preferrences=chat.preferences
        )
        search_output = search_agent.call(search_input)
        return search_output.tags

    def _get_products(self, tags: List[str]) -> List[Product]:

        stores_match_ratio = {}
        chat: Chat = self.state.get("chat")
        lat, log = chat.latitude, chat.longitude

        stores_response =  requests.get(
            url= "https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/location/stores",
            params={
                "coordinates": f"{lat},{log}",
                "radius": 10000
            }
        )

        if stores_response.status_code != 200:
            self._printer.print(stores_response.text, color="red")
            raise ValueError(f"Error fetching stores: {stores_response.text}")

        stores = stores_response.text.split(",")

        self._printer.print(f"Found stores: {"\n".join(stores)}", color="blue")

        print(f"Searching products with tags: {tags}")
        prod_response = requests.post(
            url="https://xgpbt0u4ql.execute-api.us-east-1.amazonaws.com/prod/getProductsFromStoreByTags",
            json={
                "tags": tags,
                "store_ids": stores
            }
        )

        if prod_response.status_code != 200:
            self._printer.print(prod_response.text, color="red")
            raise ValueError(f"Error fetching products: {prod_response.text}")

        products_data : List[Dict] = prod_response.json()

        print(json.dumps(products_data, indent=4))

        products =[]
        try:
            products = [Product.from_dict(prod) for prod in products_data]
        except Exception as e:
            print(f"Error parsing products: {e}")
            self._state['error'] = f"Error parsing products: {e}"
            self._state['fail'] = True

        print("Products: ", products)
        return products







    def _get_products_mock(self, tags: List[str]) -> List[Product]:
        chat: Chat = self.state.get("chat")
        lat, log = chat.latitude, chat.longitude
        print('looking for store in the area')
        stores = mock_location_api_call(lat, log)
        print(f"Searching products with tags: {tags}")
        products_data = mock_products_api_call(tags=tags, store_ids=stores)

        print(json.dumps(products_data, indent=4))
        products =[]
        try:
            products = [Product.from_dict(prod) for prod in products_data]
        except Exception as e:
            print(f"Error parsing products: {e}")
            self._state['error'] = f"Error parsing products: {e}"
            self._state['fail'] = True

        print(f"Found {len(products)} products.")

        return products

    def _choose_best_products(self, chat: Chat, products: List[Product]) -> List[Product]:

        select_agent = ProductSelectorAgent()
        selector_input = ProductSelectorInput(
            user_message=self.state.get("user_message"),
            chat_history=[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]],  # last 10 messages
            available_products=[prod.to_dict() for prod in products],
            preferences=chat.preferences
        )

        selected_products = []
        try:
            selected_products, reason = select_agent.call(selector_input)
            self._printer.print(f"Selector reason: {reason}", color="bold_blue")
            self._printer.print(f"Selected products: {selected_products}", color="bold_blue")

        except Exception as e:
            print(f"Error parsing selected products: {e}")
            self._state['error'] = f"Error parsing selected products: {e}"
            self._state['fail'] = True

        return selected_products

# -------------------------------------------------
#                 Cart Operators
# -------------------------------------------------



    #@router("flow_router.AddToCartFlow")
    def add_to_cart(self):

        return "search_flow.AddToCartFlow"

        chat : Chat = self.state.get("chat")
        if not chat:
            raise ValueError("Chat object is required to start the flow.")

        if len(chat.order) == 0:
            return "search_flow.AddToEmptyCartFlow"

        suggested_products = chat.products_suggested

        if not suggested_products or len(suggested_products) == 0:
            raise ValueError("Chat object is required to start the flow.")

        chat.order = [Product.from_dict(p) for p in suggested_products]
        chat.products_suggested = []
        self.state['last_flow_output'] = FlowOutput(
            success=True,
            summary=f"Updated the cart.",
            details={"added_products": [prod for prod in suggested_products]}
        )

        return "cart_flow.response"

    @listen("cart_flow.response")
    def cart_flow_response(self):

        response_agent : CustomResponseAgent = CustomResponseAgent()
        chat: Chat = self.state.get("chat")
        user_message: str = self.state.get("user_message")

        if not chat or not user_message:
            raise ValueError("Chat and user_message are required to start the flow.")

        custom_response_input = CustomResponseInput(
            user_message=user_message,
            prompt=f"""
            You provide a summary of the products that you added to the cart.
            You should list the products that you added to the cart.
            Write the summary to the user in a nice way.
            Write to the user the products that you added. {[prod.to_dict() for prod in chat.order]}
            
            more context to pay attention to:
            summery of what you did: {self.state['last_flow_output'].summary}
            current store: {chat.active_store_id}
            current cart: {[prod.to_dict() for prod in chat.order]}
            chat history: {[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]]}
            """
        )

        try:
            custom_response_output: CustomResponseOutput = response_agent.call(custom_response_input)
            self._printer.print(f"Custom response: {custom_response_output.response},\n reason: {custom_response_output.reason}", color="blue")
            return custom_response_output.response

        except Exception as e:
            logging.error(f"Error generating custom response: {e}")
            self._state['error'] = f"Error generating custom response: {e}"
            self._state['fail'] = True
            return "I'm sorry, I couldn't generate a response after updating the cart."





    @listen(or_("search_flow.AddToEmptyCartFlow", "flow_router.AddToCartFlow", "search_flow.AddToCartFlow"))
    def add_to_cart_best_store(self):

        if self._state['fail']:
            return "I'm sorry, I couldn't complete your request due to an internal problem. Please try again."

        cart_agent = AddCartAgent()
        chat: Chat = self.state.get("chat")
        user_message: str = self.state.get("user_message")
        if not chat or not user_message:
            raise ValueError("Chat and user_message are required to start the flow.")

        relevant_stores :List[str] = self._extract_relvent_stores(chat)

        stores_carts = {}
        for store in relevant_stores:
            stores_carts[store] = chat.stores_carts[store]

        self._printer.print(f"relevant stores: {stores_carts}", color="bold_blue")

        cart_input = AddCartInput(
            user_message=user_message,
            chat_history=[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]],  # last 10 messages
            current_cart=[prod.to_dict() for prod in chat.order],
            suggested_products=[prod for prod in chat.products_suggested],
            stores_carts=stores_carts,
        )

        print(f"\n\ncart input: {cart_input}\n\n")

        try:
            cart_output = cart_agent.call(cart_input)
            print(f"Cart agent output: {cart_output}")
            if cart_output.updated_cart_products and cart_output.chosen_store_id:

                cart_output.chosen_store_id = self._extract_store_from_agent_output(cart_output.chosen_store_id)
                self._printer.print(f"chosen store id: {cart_output.chosen_store_id}", color="bold_blue")
                self._printer.print(f"supply in the cart: {chat.stores_carts[cart_output.chosen_store_id]}", color="bold_blue")

                chat.order = []
                updated_cart_products_names = [prod['name'] for prod in cart_output.updated_cart_products]
                for prod in chat.stores_carts[cart_output.chosen_store_id]:

                    if prod['name'] in updated_cart_products_names:
                        product = Product.from_dict(prod)
                        quantity = next((p['quantity'] for p in cart_output.updated_cart_products if p['name'] == prod['name']), 0)
                        product.quantity = quantity
                        self._printer.print(f'updating cart with: {product.to_dict()}', color="bold_green")
                        if product.quantity > 0:
                            product.quantity = 1
                            chat.order.append(product)

                self._printer.print(f"current cart after update: {[prod.to_dict() for prod in chat.order]}", color="bold_magenta")

                self.state['last_flow_output'] = FlowOutput(
                    success=True,
                    #summary=f"Changes that made to cart {self._changes_in_cart(self.state['before_user_message_cart'], chat.order)}",
                    summary="Updated the cart with the selected products.",
                    details={"updated_cart": chat.order, "last_agent_reason": cart_output.reason}
                )



            else:
                self._printer._print_red("Cart agent did not return an updated cart.")
                self._state['error'] = "Cart agent did not return an updated cart."
                self._state['fail'] = True

                self.state['last_flow_output'] = FlowOutput(
                    success=False,
                    fail_reason="AddToCartFlow is not implemented yet.",
                    summary="AddToCartFlow is not implemented yet.",
                    details={}
                    )


        except Exception as e:
            self._printer.print(f"Error in Cart agent: {e}", color="red")
            self._state['error'] = f"Error in Cart agent: {e}"
            self._state['fail'] = True

            self.state['last_flow_output'] = FlowOutput(
                success=False,
                fail_reason=f"Error in Cart agent",
                summary="Failed to add products to cart.",
                details={}
            )

        chat.products_suggested = []


    @listen("flow_router.UpdateOrRemoveCartFlow")
    def update_cart_or_remove_from_cart(self):
        user_message : str = self.state.get("user_message")
        chat: Chat = self.state.get("chat")
        if not chat or not user_message:
            raise ValueError("Chat and user_message are required to start the flow.")

        if len(chat.order) == 0:
            self._printer.print(f"cart is empty", color="red")
            self.state['last_flow_output'] = FlowOutput(
                success=False,
                fail_reason="Cart is empty.",
                summary="Your cart is currently empty. Please add items to your cart before attempting to update or remove them.",
                details={}
            )
            return

        urcart_agent = URCartAgent()
        urcart_input = URCartInput(
            user_message=user_message,
            chat_history=[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]],  # last 10 messages
            current_cart=[prod.to_dict() for prod in chat.order],
        )

        try:
            urcart_output = urcart_agent.call(urcart_input)
            self._printer.print(f"URCart agent output: {urcart_output}", color="bold_blue")

            for prod in urcart_output.updated_products:
                for cart_prod in chat.order:
                    if cart_prod.name == prod['name']:
                        cart_prod.quantity = prod['quantity']

                        if cart_prod.quantity <= 0:
                            chat.order.remove(cart_prod)
                            self._printer.print(f"Removed product {cart_prod.name} from cart", color="yellow")

                        break

            self.state['last_flow_output'] = FlowOutput(
                success=True,
                summary="Updated the cart as per your request.",
                details={"updated_cart": chat.order, "last_agent_reason": urcart_output.reason}
            )

        except Exception as e:
            self._printer.print(f"Error in URCart agent: {e}", color="red")
            self._state['error'] = f"Error in URCart agent: {e}"
            self._state['fail'] = True

            self.state['last_flow_output'] = FlowOutput(
                success=False,
                fail_reason=f"Error in URCart agent",
                summary="Failed to update or remove items from cart.",
                details={}
            )


    def _changes_in_cart(self, before: List[Product], after: List[Product]) -> List[Any]:

        changes = []
        before_dict = {prod.id: prod.quantity for prod in before}
        after_dict = {prod.id: prod.quantity for prod in after}

        all_product_ids = set(before_dict.keys()).union(set(after_dict.keys()))

        for prod_id in all_product_ids:
            before_qty = before_dict.get(prod_id, 0)
            after_qty = after_dict.get(prod_id, 0)

            if before_qty != after_qty:
                changes.append({
                    "product_id": prod_id,
                    "before_quantity": before_qty,
                    "after_quantity": after_qty,
                    "change": after_qty - before_qty
                })

        return changes



    def _extract_relvent_stores(self, chat: Chat) -> List[str]:
        """
        Extracts relevant stores that can fulfill even part of the order including suggested products.
        """
        relevant_stores_dict = {}

        for store in chat.stores_carts.keys():
            relevant_stores_dict[store] = False

        product_to_search_from = chat.order

        for sp in chat.products_suggested:
            prod = Product.from_dict(sp)
            product_to_search_from.append(prod)


        for prod in product_to_search_from:

            for store in chat.stores_carts.keys():

                if relevant_stores_dict.get(store):
                    continue

                relevant = False

                for p in chat.stores_carts[store]:
                    if p['id'] == prod.id:
                        relevant = True
                        break

                if relevant:
                    relevant_stores_dict[store] = True

        return [store for store, is_relevant in relevant_stores_dict.items() if is_relevant]



    def _extract_store_from_agent_output(self, agent_chosen_store : str) -> str:

        without_store = agent_chosen_store.replace("store", "")

        return without_store.strip() if without_store in self.state.get('chat').stores_carts.keys() else agent_chosen_store.strip()

        stores_options = [id for id in self.state.get('chat').stores_carts.keys() if id == without_store]

        self._printer.print(f"Chosen store id: {agent_chosen_store}", color="bold_blue")

        if not stores_options:
            self._printer.print(f"Agent chose unknown store: {agent_chosen_store}", color="red")
            self._state['error'] = f"Agent chose unknown store: {agent_chosen_store}"
            self._state['fail'] = True
            raise Exception("Agent chose unknown store")

        if len(stores_options) > 1:
            for id in stores_options:
                if id == without_store:
                    return id

        return stores_options[0]




#--------------------------------------------------
#               Response Generation
#--------------------------------------------------
    @listen(or_("search_flow.ResponseFlow", add_to_cart_best_store, update_cart_or_remove_from_cart, handle_preferences))
    def generate_response(self) -> str:
        if self._state['fail']:
            return f"I'm sorry, I couldn't complete your request dou internal problem. please try again"

        flow_result: FlowOutput = self.state.get("last_flow_output")

        agent = ResponseAgent()
        chat: Chat = self.state.get("chat")
        user_message: str = self.state.get("user_message")

        if not chat or not user_message:
            raise ValueError("Chat and user_message are required to generate a response.")

        extra_context: Dict[str, Any] = {}
        if 'before_user_message_cart' in self.state:
            extra_context['before_user_message_cart'] = self.state['before_user_message_cart']
            extra_context['current_user_cart'] = [prod.to_dict() for prod in chat.order]
            extra_context['attention'] = "The different between the carts is important to understand what we have changed in the cart"

        for res in flow_result.details.keys():
            extra_context[res] = flow_result.details[res]

        response_input = ResponseInput(
            user_message=user_message,
            chat_history=[{"role": msg.role, "content": msg.content} for msg in chat.messages[-10:]],
            # last 10 messages
            flow_summery=flow_result.summary if flow_result.success else f"The flow failed due to: {flow_result.fail_reason}",
            extra_context=extra_context if flow_result.success else {}
        )

        #print(response_input)

        response = agent.call(response_input)
        print(response)

        return response

if __name__ == "__main__":
    flow = MainFlow()
    flow.plot("main_flow.png")

