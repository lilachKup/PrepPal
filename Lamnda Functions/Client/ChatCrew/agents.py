import json
from itertools import product
from typing import List, Dict, ClassVar, Type, Any

from crewai import Agent
from crewai.project import agent
from langchain.chains.question_answering.map_reduce_prompt import messages
from pydantic import BaseModel, Field, conint, ConfigDict

from llms import get_llm
from models import Product


#------------------------------------------
#               Intent Agent
#------------------------------------------

class IntentInput(BaseModel):
    user_message: str
    chat_history: List[Dict[str, str]]  # List of messages with 'role' and 'content'
    possible_flows: List[Any]
    current_cart: List[Dict[str, Any]] = Field(default_factory=list)  # Current cart items
    current_store: Dict[str,str] | None # Current store info, at least id and name

class IntentOutput(BaseModel):
    selected_flow: str = Field(..., description="Name of the selected flow")
    reason: str  = Field(..., description="Reason for selecting this flow")

class IntentAgent:
    def __init__(self):
        self.name: ClassVar[str] = "IntentAgent"
        self.description: ClassVar[str] = "Determines the user's intent based on their message and chat history."
        self.llm: ClassVar[Any] = get_llm(response_format=IntentOutput)


    def call(self, inputs: IntentInput) -> IntentOutput:
        prompt = f"""
        You are PrePal's Intent Agent. 
        Based on the User's message, chat_history, and possible_flows,
        determine the most appropriate flow to handle the user's request.
        
        possible_flows: {inputs.possible_flows}\n\n
        current_cart: {inputs.current_cart}\n\n
        current_store: {inputs.current_store}\n\n
        when determining the intent:
        1. Choose the flow that best matches the user's request
        2. Consider the context provided by the chat_history
        
        Respond with the selected_flow and a brief reason.
        """

        messages = [{"role": "system", "content": prompt}]
        for m in inputs.chat_history[-10:]:
            messages.append(m)
        messages.append({"role": "user", "content": inputs.user_message})

        response = self.llm.call(messages)
        response_dict = json.loads(response)
        print(response_dict)
        return IntentOutput(**response_dict)

#------------------------------------------
#               Search Agent
#------------------------------------------

class SearchInput(BaseModel):
    user_message: str
    chat_history: List[Dict[str, str]]  # List of messages with 'role' and 'content'
    preferrences: List[str] = Field(default_factory=list)

class SearchOutput(BaseModel):
    tags: List[str] = Field(..., description="List of relevant tags or keywords extracted from the user's message")

class SearchAgent:
    def __init__(self):
        self.name: ClassVar[str] = "SearchAgent"
        self.description: ClassVar[str] = "Extracts relevant tags or keywords from the user's message to aid in product search."
        self.llm: ClassVar[Any] = get_llm(response_format=SearchOutput)


    def call(self, inputs: SearchInput) -> SearchOutput:
        prompt = f"""
        You are PrePal's Search Agent. 
        Based on the User's message, chat_history, and user preferences,
        extract 6-10 or more relevant tags or keywords that can help in searching for products.
        1. Tags should be concise (1 word)
        2. Tags should be relevant to the user's request
        3. Include the requested items names as tags, each word as a separate tag and the full name as a tag too
        4. Include any relevant preferences as tags (only if relevant)
        5. Avoid overly generic tags (e.g., "food", "item")
        6. Avoid overly specific tags (e.g., "organic gluten-free almond butter")
        7. Do not include duplicates
        8. Include only tags that relevant to the last user's request and preferences
        9. Use as a tag floral names of fruits and vegetables (e.g., "apple","apples", "banana","bananas", "carrot", "carrots")
        10. DONT create tags for previous requests if they are not relevant to the current request
        
        user preferences: {inputs.preferrences}
        
        Respond with a list of relevant tags or keywords.
        """

        messages = [{"role": "system", "content": prompt}]
        for m in inputs.chat_history[-10:]:
            messages.append(m)
        messages.append({"role": "user", "content": inputs.user_message})

        response = self.llm.call(messages)
        response_dict = json.loads(response)
        print(response_dict)
        return SearchOutput(**response_dict)

#------------------------------------------
#            Product Selector Agent
#------------------------------------------

class ProductSelectorInput(BaseModel):
    user_message: str
    chat_history: List[Dict[str, str]]  # List of messages with 'role' and 'content'
    available_products: List[Dict[str, Any]] = Field(default_factory=list)  # Products from product DB
    preferences: List[str] = Field(default_factory=list)  # User preferences

class ProductSelectorOutput(BaseModel):
    selected_products_names: List[str] = Field(..., description="List of selected products names. only the names with no other info")
    reason: str  = Field(..., description="Reason for selecting these products")

class ProductSelectorAgent:

    def __init__(self):
        self.name: ClassVar[str] = "ProductSelectorAgent"
        self.description: ClassVar[str] = "Selects the most relevant products based on the user's message, chat history, available products, and preferences."
        self.llm: ClassVar[Any] = get_llm(response_format=ProductSelectorOutput, llm_model="gpt-5-nano")


    def call(self, inputs: ProductSelectorInput) -> (List[Dict[str, Any]], str):
        prompt = f"""
        You are PrePal's Product Selector Agent. 
        Based on the User's message, chat_history, available_products, and user preferences,
        select the most relevant products that match the user's intent.
        1. Choose products that best fit the user's request
        2. Consider user preferences when selecting products
        3. Provide a brief reason for your selection
        4. Choose only from the available_products
        5. Do not make up products
        6. If no products match, return an empty list
        7. When selecting products names, return only the names with no other info
        
        
        available_products: {inputs.available_products}\n\n
        user preferences: {inputs.preferences}
        
        Respond with a list of selected products (with details) and a brief reason for selection.
        """

        messages = [{"role": "system", "content": prompt}]
        for m in inputs.chat_history[-10:]:
            messages.append(m)
        messages.append({"role": "user", "content": inputs.user_message})

        response = self.llm.call(messages)
        response_dict = json.loads(response)
        print(response_dict)

        selected_products = response_dict.get("selected_products_names", [])
        # Ensure products are from available_products
        filtered_products = [p for p in inputs.available_products if p.get('name') in selected_products]

        return filtered_products, response_dict['reason']




#------------------------------------------
#               Cart Agent
#------------------------------------------

class AddCartInput(BaseModel):
    user_message: str
    chat_history: List[Dict[str, str]]  # List of messages with 'role' and 'content'
    current_cart: List[Dict[str, Any]] = Field(default_factory=list)  # Current cart items
    stores_carts: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)  # Carts per store
    suggested_products: List[Dict[str, Any]] = Field(default_factory=list)  # Suggested products

class ProductAgentResult(BaseModel):
    name: str = Field(..., description="Product name")
    quantity: int = Field(..., description="Final quantity in cart")
    available_stores : List[str] = Field(..., description="List of store IDs where this product is available")

class AddCartOutput(BaseModel):
    updated_cart_products: List[Dict] = Field(..., description="List of updated cart products name and quantity (here is the all the products in the cart, not only the changes), list of dict with name and quantity")
    chosen_store_id: str = Field(..., description="Store ID of the chosen store for the cart")
    reason: str  = Field(..., description="Reason for the cart update")

cart_agent_response_format = {
    "type": "json_schema",
    "json_schema": {
        "name": "CartOutput",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "updated_cart_products": {
                    "type": "array",
                    "description": "All products currently in the cart with final quantities.",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "Product name, only the name, no id or other info"
                            },
                            "quantity": {
                                "type": "integer",
                                "minimum": 0,
                                "description": "Final quantity in cart, use 1 as default if the user dont specify quantity"
                            },
                            "available_stores": {
                                "type": "array",
                                "description": "List of store IDs where this product is available",
                                "items": {
                                    "type": "string"
                                }
                            }
                        },
                        "required": ["name", "quantity", "available_stores"]
                    }
                },
                "chosen_store_id": {
                    "type": "string",
                    "description": "Store ID of the chosen store for the cart"
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for the cart update, explain also quantity you chose for each product that more than 1"
                }
            },
            "required": ["updated_cart_products", "chosen_store_id", "reason"]
        }
    }
}


class AddCartAgent:

    def __init__(self):
        self.name: ClassVar[str] = "CartAgent"
        self.description: ClassVar[str] = "Manages the shopping cart based on the user's message, chat history, current cart, and suggested products."
        self.llm: ClassVar[Any] = get_llm(response_format=cart_agent_response_format, llm_model="gpt-5-nano")


    def call(self, inputs: AddCartInput) -> AddCartOutput:

        prompt = f"""
        You are PrePal's Cart Agent. 
        Based on the User's message, chat_history, current_cart, stores_supply, and suggested_products,
        update the shopping cart as needed.
        
        Your main goal is to craft the best cart for the user that fit their request and preferences.
        the stores_supply is a dict with store_id as key and list of products as value.
        
        You choose with store the cart will be from, you can choose to keep the current store or switch to another store.
        
        current_cart: {inputs.current_cart}\n\n
        stores_supply: { "\n".join(f"{k}: {v}" for k, v in inputs.stores_carts.items())}\n\n
        suggested_products: {inputs.suggested_products}
        current_cart_store_id: {inputs.current_cart[0]['store_id'] if inputs.current_cart else 'None'}
        stores in stores_supply: {list(inputs.stores_carts.keys())}
        
        pay attention:
        1. the quantity in the stores_supply is the available quantity in the store, you can set a quantity in the cart that is less or equal to it, if the user dont ask fot specific quantity choose 1.
        2. Just what the user have in his current_cart is what he has in his cart. the supply in stores_supply is what is available in tha stores.
        
        when updating the cart:
        1. Add suggested products if relevant to the user's request
        2. Choose 1 store for the cart, if the user requested products from multiple stores, choose the store that has the most products that fit the user's request
        3. You can switch store if the user requested products that are not in the current store
        4. DONT make up products
        5. DONT make up stores
        6. If the user requested to remove a product, set its quantity to 0
        7. Ensure the cart aligns with the user's preferences
        8. If the user requested a specific quantity, set it accordingly, otherwise use 1 as default
        
        
        Respond with the updated cart and a brief reason for the update.
        """

        messages = [{"role": "system", "content": prompt}]
        for m in inputs.chat_history[-10:]:
            messages.append(m)

        messages.append({"role": "user", "content": inputs.user_message})


        response = self.llm.call(messages)
        response_dict = json.loads(response)
        print(response_dict)
        return AddCartOutput(**response_dict)


class URCartInput(BaseModel):
    user_message: str
    chat_history: List[Dict[str, str]]  # List of messages with 'role' and 'content'
    current_cart: List[Dict[str, Any]] = Field(default_factory=list)  # Current cart items

class URCartOutput(BaseModel):
    updated_products: List[Dict] = Field(..., description="List of updated cart products name and quantity (only the changes), list of dict with name and quantity")
    reason: str  = Field(..., description="Reason for the cart update")

ur_cart_agent_response_format = {
    "type": "json_schema",
    "json_schema": {
        "name": "URCartOutput",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "updated_products": {
                    "type": "array",
                    "description": "List of updated cart products name and quantity (only the changes).",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "Product name"
                            },
                            "quantity": {
                                "type": "integer",
                                "minimum": 0,
                                "description": "Final quantity in cart"
                            }
                        },
                        "required": ["name", "quantity"]
                    }
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for the cart update"
                }
            },
            "required": ["updated_products", "reason"]
        }
    }
}

class URCartAgent:
    def __init__(self):
        self.name: ClassVar[str] = "URCartAgent"
        self.description: ClassVar[str] = "Understands and applies user requests to update the shopping cart."
        self.llm: ClassVar[Any] = get_llm(response_format=ur_cart_agent_response_format, llm_model="gpt-4o-mini")


    def call(self, inputs: URCartInput) -> URCartOutput:

        prompt = f"""
        You are PrePal's UR Cart Agent. 
        Based on the User's message, chat_history, and current_cart,
        understand and apply the user's requests to update the shopping cart.
        
        current_cart: {inputs.current_cart}\n\n
        when updating the cart:
        1. Understand user requests to only to remove or modify products in the cart
        2. If the user requests to remove a product, set its quantity to 0
        3. If the user requests to add a product that is already in the cart, increase its quantity accordingly
        4. DONT make up products
        5. DONT make up stores
        6. Ensure the cart aligns with the user's preferences
        
        
        Respond with only the products that were changed (name and quantity) and a brief reason for the update.
        """

        messages = [{"role": "system", "content": prompt}]
        for m in inputs.chat_history[-10:]:
            messages.append(m)

        messages.append({"role": "user", "content": inputs.user_message})

        response = self.llm.call(messages)
        response_dict = json.loads(response)
        print(response_dict)
        return URCartOutput(**response_dict)


#------------------------------------------
#               Preference Agent
#------------------------------------------

class PreferenceInput(BaseModel):
    user_message: str
    chat_history: List[Dict[str, str]]  # List of messages with 'role' and 'content'
    current_preferences: List[str] = Field(default_factory=list)  # Current user preferences

class PreferenceOutput(BaseModel):
    new_preferences: List[str] = Field(..., description="List of NEW user preferences")
    reason: str  = Field(..., description="Reason for the preference update")

class PreferenceAgent:
    def __init__(self):
        self.name: ClassVar[str] = "PreferenceAgent"
        self.description: ClassVar[str] = "Updates user preferences based on their message and chat history."
        self.llm: ClassVar[Any] = get_llm(response_format=PreferenceOutput)


    def call(self, inputs: PreferenceInput) -> PreferenceOutput:
        prompt = f"""
        You are PrePal's Preference Agent. 
        Based on the User's message, chat_history, and current_preferences,
        identify any new preferences expressed by the user.
        
        current_preferences: {inputs.current_preferences}\n\n
        when updating preferences:
        1. Identify only NEW preferences expressed by the user
        2. Do not repeat existing preferences
        3. Ensure preferences are relevant to the user's requests
        
        
        Respond with a list of new preferences and a brief reason for the update.
        
        The preferences should be easy to LLM understand and use in future searches.
        """

        messages = [{"role": "system", "content": prompt}]
        for m in inputs.chat_history[-10:]:
            messages.append(m)

        messages.append({"role": "user", "content": inputs.user_message})

        response = self.llm.call(messages)
        response_dict = json.loads(response)
        print(response_dict)
        return PreferenceOutput(**response_dict)

        
#------------------------------------------
#               Response Agent
#------------------------------------------

class ResponseInput(BaseModel):
    user_message: str
    chat_history: List[Dict[str, str]]  # List of messages with 'role' and 'content'
    extra_context: Dict[str, Any] = Field(default_factory=dict)
    flow_summery: str = Field("", description="Summary of the flow's purpose and capabilities.")

class ResponseAgent:

    def __init__(self):
        self.name: ClassVar[str] = "ResponseAgent"
        self.description: ClassVar[str] = "Generates a response to the user's message based on chat history and extra context."
        self.llm: ClassVar[Any] = get_llm()


    def call(self, inputs: ResponseInput) -> str:
        prompt = f"""
        You are PrePal's Response Agent. 
        You are the last step in chain of agents. 
        The agents before you could change the cart, suggest products, change store and more.
        Pay attention to any changes that happened to the cart or store.
        Based on the User's message, chat_history, extra_context, and flow_summery,
        generate a helpful, concise, and relevant response to the user's request.
        DONT make up anything that is not in the chat_history or extra_context.
        Be precise and to the point.
        
        chat_history: {inputs.chat_history}\n\n
        extra_context: {inputs.extra_context}\n\n
        flow_summery: {inputs.flow_summery}
        
        IMPORTANT:
        1. If you have before_user_message_cart in the extra_context, this is what the user had in their cart before their last message. Use it to understand changes the user requested.
        2. The user dont know yet the changes that happened to their cart. you need to explain it to them in the response. It in the extra_context as before_user_message_cart and current_cart.
        3. NEVER mention the ids of the products, only their names.
        4. NEVER mention the id of the store.
        5. NEVER reveal any internal process or agent names to the user.
        6. When mentioning price use the format ₪X.XX
        
        when generating the response:
        1. Ensure the response aligns with the flow_summery
        2. If there are suggested products, mention them in the response
        3. Pay attention for duplicate products in the suggested products and current cart - avoid mentioning duplicates
        4. If there are a few suggested products that are the same product but from different stores, mention only one of them
        5. Do not mention quantity on suggested products
        6. If there is a current store, mention only products from that store.
        7. If there is suggestion to change store, mention it.
        8. if there is not current store, and there are suggested products from multiple stores, mention it and suggest the user to pick a store. and mention that can be choose only one store at a time.
        9. Dont mention stores ids or names, only mention products names.
        10. DOnt metion that all the products are from the same store (if they are), its not important to the user.
        
        
        Respond directly to the user's message.
        """

        messages = [{"role": "system", "content": prompt}]
        for m in inputs.chat_history[-10:]:
            messages.append(m)

        messages.append({"role": "user", "content": inputs.user_message})

        response = self.llm.call(messages)
        return response


#------------------------------------------
#         Custom Response Agent
#------------------------------------------

class CustomResponseInput(BaseModel):
    prompt: str
    user_message: str
    chat_history: List[Dict[str, str]]  # List of messages with 'role' and 'content'

class CustomResponseOutput(BaseModel):
    response: str = Field(..., description="The generated response to the user's message")
    reason: str = Field(..., description="Reason for the response content")


class CustomResponseAgent(ResponseAgent):

    def __init__(self):
        super().__init__()
        self.name: ClassVar[str] = "CustomResponseAgent"
        self.description: ClassVar[str] = "Generates a response to the user's message based on chat history and extra context, with custom instructions."
        self.llm: ClassVar[Any] = get_llm(CustomResponseOutput)


    def call(self, inputs: CustomResponseInput) -> CustomResponseOutput:

        system_prompt= f"""
        You are PrePal's Response Agent.
        You are the last step in chain of agents.
            
        {inputs.prompt}
            
        Respond directly to the user's message.
"""

        messages = [{"role": "system", "content": system_prompt}]
        for m in inputs.chat_history[-10:]:
            messages.append(m)
        messages.append({"role": "user", "content": inputs.user_message})

        response = self.llm.call(messages)
        response_dict = json.loads(response)
        return CustomResponseOutput(**response_dict)


