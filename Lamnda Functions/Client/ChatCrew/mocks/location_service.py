"""
Mock Location Service API.
Simulates the external location service that returns store IDs within a radius.
"""
from typing import List
from urllib.parse import parse_qs, urlparse
from .mock_data import get_stores_in_radius


class MockLocationService:
    """
    Mock implementation of the Location Service API.
    
    The real API expects:
    - URL: {base_url}?coordinates={lat},{lon}&radius={radius_meters}
    - Response: Comma-separated store IDs
    """
    
    @staticmethod
    def get_stores_in_radius(coordinates: str, radius: str) -> str:
        """
        Mock the location service API call.
        
        Args:
            coordinates: String in format "lat,lon" (e.g., "40.7589,-73.9851")
            radius: Radius in meters as string (e.g., "10000")
            
        Returns:
            Comma-separated store IDs (e.g., "S1,S2,S3")
        """
        try:
            # Parse coordinates
            lat_str, lon_str = coordinates.split(',')
            lat = float(lat_str.strip())
            lon = float(lon_str.strip())
            
            # Parse radius
            radius_meters = int(radius)
            
            # Get stores within radius
            store_ids = get_stores_in_radius(lat, lon, radius_meters)
            
            # Return as comma-separated string (matching real API format)
            return ",".join(store_ids)
            
        except (ValueError, IndexError) as e:
            # Return empty string for invalid input (graceful degradation)
            return ""
    
    @staticmethod
    def simulate_api_call(url: str) -> str:
        """
        Simulate a full API call by parsing the URL and extracting parameters.
        
        Args:
            url: Full URL like "https://api.example.com/stores?coordinates=40.7589,-73.9851&radius=10000"
            
        Returns:
            Comma-separated store IDs
        """
        try:
            parsed_url = urlparse(url)
            query_params = parse_qs(parsed_url.query)
            
            # Extract coordinates and radius from query parameters
            coordinates = query_params.get('coordinates', [''])[0]
            radius = query_params.get('radius', ['10000'])[0]
            
            return MockLocationService.get_stores_in_radius(coordinates, radius)
            
        except Exception:
            # Return empty string for any parsing errors
            return ""


# Convenience function for direct use
def mock_location_api_call(lat: float, lon: float, radius_meters: int = 10000) -> List[str]:
    """
    Direct mock API call with numeric parameters.
    
    Args:
        lat: Latitude as float
        lon: Longitude as float  
        radius_meters: Radius in meters (default: 10000)
        
    Returns:
        Comma-separated store IDs
    """
    coordinates = f"{lat},{lon}"
    radius = str(radius_meters)
    return MockLocationService.get_stores_in_radius(coordinates, radius).split(',')
