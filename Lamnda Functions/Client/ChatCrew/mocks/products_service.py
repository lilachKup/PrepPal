"""
Mock Products Service API.
Simulates the external products service that returns products by tags and store IDs.
"""
from typing import List, Dict, Any
import json
from .mock_data import get_products_by_tags_and_stores


class MockProductsService:
    """
    Mock implementation of the Products Service API.
    
    The real API expects:
    - Method: POST
    - URL: {products_api_url}
    - Body: {"tags": ["tag1", "tag2"], "store_ids": ["S1", "S2"]}
    - Response: JSON array of product objects
    """
    
    @staticmethod
    def search_products(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Mock the products service API call.
        
        Args:
            payload: Dictionary with "tags" and "store_ids" keys
                    e.g., {"tags": ["milk", "bread"], "store_ids": ["S1", "S2"]}
            
        Returns:
            List of product dictionaries matching the API format
        """
        try:
            tags = payload.get("tags", [])
            store_ids = payload.get("store_ids", [])
            
            # Get matching products from mock data
            products = get_products_by_tags_and_stores(tags, store_ids)
            
            return products
            
        except Exception:
            # Return empty list for any errors (graceful degradation)
            return []
    
    @staticmethod
    def search_products_json(json_payload: str) -> List[Dict[str, Any]]:
        """
        Mock API call accepting JSON string payload.
        
        Args:
            json_payload: JSON string with tags and store_ids
            
        Returns:
            List of product dictionaries
        """
        try:
            payload = json.loads(json_payload)
            return MockProductsService.search_products(payload)
        except (json.JSONDecodeError, Exception):
            return []
    
    @staticmethod
    def simulate_api_response(tags: List[str], store_ids: List[str]) -> str:
        """
        Simulate a full API response as JSON string.
        
        Args:
            tags: List of search tags
            store_ids: List of store IDs to search in
            
        Returns:
            JSON string response (as the real API would return)
        """
        payload = {"tags": tags, "store_ids": store_ids}
        products = MockProductsService.search_products(payload)
        return json.dumps(products, indent=2)


# Convenience functions for direct use
def mock_products_api_call(tags: List[str], store_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Direct mock API call with list parameters.
    
    Args:
        tags: List of search tags (e.g., ["milk", "bread"])
        store_ids: List of store IDs (e.g., ["S1", "S2"])
        
    Returns:
        List of product dictionaries
    """
    payload = {"tags": tags, "store_ids": store_ids}
    return MockProductsService.search_products(payload)


def mock_products_api_post(json_body: str) -> str:
    """
    Mock a POST request to the products API.
    
    Args:
        json_body: JSON string request body
        
    Returns:
        JSON string response
    """
    try:
        payload = json.loads(json_body)
        products = MockProductsService.search_products(payload)
        return json.dumps(products)
    except Exception:
        return "[]"
