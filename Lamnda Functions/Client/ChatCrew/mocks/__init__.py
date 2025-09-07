"""
Mock APIs for testing PrepPal Lambda functions.

This module provides mock implementations of external APIs:
- Location Service API (returns stores within radius)
- Products Service API (returns products by tags and store IDs)
- MockToolRegistry (drop-in replacement for real ToolRegistry)

Usage:
    # Use mock tool registry instead of real one
    from mocks import MockToolRegistry
    tools = MockToolRegistry(logger)
    
    # Or use individual mock services
    from mocks.location_service import mock_location_api_call
    from mocks.products_service import mock_products_api_call
    
    stores = mock_location_api_call(40.7589, -73.9851, 10000)
    products = mock_products_api_call(["milk", "bread"], ["S1", "S2"])
"""


from .location_service import MockLocationService, mock_location_api_call
from .products_service import MockProductsService, mock_products_api_call
from .mock_data import MOCK_STORES, MOCK_PRODUCTS, get_stores_in_radius, get_products_by_tags_and_stores

__all__ = [
    "MockLocationService", 
    "MockProductsService",
    "mock_location_api_call",
    "mock_products_api_call",
    "MOCK_STORES",
    "MOCK_PRODUCTS", 
    "get_stores_in_radius",
    "get_products_by_tags_and_stores"
]
