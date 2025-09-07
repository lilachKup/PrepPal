"""
Mock data for stores and products to simulate real API responses.
"""
from typing import Dict, List, Any

# Mock store locations with realistic coordinates in Tel Aviv area
# Default chat location: 32.046923, 34.759446 (within 10km radius)
MOCK_STORES = {
    "S1": {"name": "Sarona Market", "lat": 32.0704, "lon": 34.7869},  # Tel Aviv Central
    "S2": {"name": "Carmel Market Fresh", "lat": 32.0597, "lon": 34.7667},  # Carmel Market
    "S3": {"name": "Rothschild Grocery", "lat": 32.0596, "lon": 34.7703},  # Rothschild Blvd
    "S4": {"name": "Florentin Foods", "lat": 32.0540, "lon": 34.7625},  # Florentin
    "S5": {"name": "Jaffa Port Market", "lat": 32.0533, "lon": 34.7522},  # Jaffa
    "S6": {"name": "Dizengoff Center", "lat": 32.0739, "lon": 34.7741},  # Dizengoff
    "S7": {"name": "Ramat Aviv Mall", "lat": 32.1133, "lon": 34.8044},  # Ramat Aviv
    "S8": {"name": "TLV Marina Fresh", "lat": 32.0853, "lon": 34.7692},  # Tel Aviv Marina
    
    # Additional stores near default location for optimization testing
    "S9": {"name": "Neve Tzedek Market", "lat": 32.0520, "lon": 34.7650},  # Neve Tzedek
    "S10": {"name": "HaTachana SuperMarket", "lat": 32.0505, "lon": 34.7570},  # HaTachana
    "S11": {"name": "Yafo Street Grocers", "lat": 32.0580, "lon": 34.7720},  # Yafo Street
    "S12": {"name": "SheinkinExpress", "lat": 32.0610, "lon": 34.7710},  # Sheinkin Street
    "S13": {"name": "Bauhaus Market", "lat": 32.0650, "lon": 34.7650},  # White City area
    "S14": {"name": "Gordon Beach Fresh", "lat": 32.0800, "lon": 34.7700},  # Gordon Beach
    "S15": {"name": "Ibn Gabirol Plaza", "lat": 32.0750, "lon": 34.7800},  # Ibn Gabirol
    "S16": {"name": "King George Corner", "lat": 32.0630, "lon": 34.7750},  # King George Street
    "S17": {"name": "Allenby Market", "lat": 32.0570, "lon": 34.7690},  # Allenby Street
    "S18": {"name": "Kerem HaTeimanim Fresh", "lat": 32.0580, "lon": 34.7620},  # Kerem HaTeimanim
}

# Mock products with realistic variety
MOCK_PRODUCTS = [
    # Dairy & Eggs
    {"id": "P001", "name": "Organic Whole Milk", "category": "Dairy", "tag": "milk", "brand": "Horizon", "price": "4.99", "store_id": "S1", "quantity": 100},
    {"id": "P002", "name": "Grade AA Large Eggs", "category": "Dairy", "tag": "eggs", "brand": "Eggland's Best", "price": "3.49", "store_id": "S1", "quantity": 12},
    {"id": "P003", "name": "Greek Yogurt Plain", "category": "Dairy", "tag": "yogurt", "brand": "Chobani", "price": "5.99", "store_id": "S1", "quantity": 32},
    {"id": "P004", "name": "Unsalted Butter", "category": "Dairy", "tag": "butter", "brand": "Land O'Lakes", "price": "4.29", "store_id": "S2", "quantity": 16},
    {"id": "P005", "name": "Sharp Cheddar Cheese", "category": "Dairy", "tag": "cheese", "brand": "Tillamook", "price": "6.99", "store_id": "S2", "quantity": 8},
    
    # Produce
    {"id": "P006", "name": "Organic Bananas", "category": "Produce", "tag": "bananas", "brand": "Organic", "price": "1.99", "store_id": "S1", "quantity": 150},
    {"id": "P007", "name": "Gala Apples", "category": "Produce", "tag": "apples", "brand": "Fresh", "price": "3.99", "store_id": "S1", "quantity": 100},
    {"id": "P008", "name": "Baby Spinach", "category": "Produce", "tag": "spinach", "brand": "Organic Girl", "price": "2.99", "store_id": "S2", "quantity": 50},
    {"id": "P009", "name": "Roma Tomatoes", "category": "Produce", "tag": "tomatoes", "brand": "Fresh", "price": "2.49", "store_id": "S3", "quantity": 80},
    {"id": "P010", "name": "Sweet Yellow Onions", "category": "Produce", "tag": "onions", "brand": "Fresh", "price": "1.79", "store_id": "S3", "quantity": 120},
    {"id": "P011", "name": "Organic Carrots", "category": "Produce", "tag": "carrots", "brand": "Organic", "price": "2.29", "store_id": "S1", "quantity": 90},
    {"id": "P012", "name": "Red Bell Peppers", "category": "Produce", "tag": "peppers", "brand": "Fresh", "price": "4.99", "store_id": "S2", "quantity": 60},
    
    # Meat & Seafood
    {"id": "P013", "name": "Ground Beef 80/20", "category": "Meat", "tag": "beef", "brand": "Fresh", "price": "8.99", "store_id": "S1", "quantity": 50},
    {"id": "P014", "name": "Boneless Chicken Breast", "category": "Meat", "tag": "chicken", "brand": "Perdue", "price": "7.99", "store_id": "S2", "quantity": 70},
    {"id": "P015", "name": "Atlantic Salmon Fillet", "category": "Seafood", "tag": "salmon", "brand": "Fresh", "price": "12.99", "store_id": "S3", "quantity": 30},
    {"id": "P016", "name": "Turkey Deli Slices", "category": "Meat", "tag": "turkey", "brand": "Boar's Head", "price": "9.99", "store_id": "S1", "quantity": 40},
    
    # Pantry Staples
    {"id": "P017", "name": "Whole Wheat Bread", "category": "Bakery", "tag": "bread", "brand": "Dave's Killer", "price": "4.99", "store_id": "S1", "quantity": 25},
    {"id": "P018", "name": "Jasmine Rice", "category": "Pantry", "tag": "rice", "brand": "Mahatma", "price": "3.99", "store_id": "S2", "quantity": 100},
    {"id": "P019", "name": "Spaghetti Pasta", "category": "Pantry", "tag": "pasta", "brand": "Barilla", "price": "1.99", "store_id": "S1", "quantity": 80},
    {"id": "P020", "name": "Extra Virgin Olive Oil", "category": "Pantry", "tag": "oil", "brand": "Bertolli", "price": "8.99", "store_id": "S3", "quantity": 60},
    {"id": "P021", "name": "Sea Salt", "category": "Pantry", "tag": "salt", "brand": "Morton", "price": "2.49", "store_id": "S1", "quantity": 150},
    {"id": "P022", "name": "Black Pepper", "category": "Pantry", "tag": "pepper", "brand": "McCormick", "price": "3.99", "store_id": "S2", "quantity": 100},
    {"id": "P023", "name": "All-Purpose Flour", "category": "Pantry", "tag": "flour", "brand": "King Arthur", "price": "4.49", "store_id": "S1", "quantity": 70},
    {"id": "P024", "name": "Granulated Sugar", "category": "Pantry", "tag": "sugar", "brand": "Domino", "price": "3.29", "store_id": "S2", "quantity": 90},

    # Beverages
    {"id": "P025", "name": "Orange Juice", "category": "Beverages", "tag": "juice", "brand": "Tropicana",
     "price": "4.99", "store_id": "S1", "quantity": 120},
    {"id": "P026", "name": "Sparkling Water", "category": "Beverages", "tag": "water", "brand": "LaCroix",
     "price": "5.99", "store_id": "S2", "quantity": 80},
    {"id": "P027", "name": "Ground Coffee", "category": "Beverages", "tag": "coffee", "brand": "Folgers",
     "price": "6.99", "store_id": "S3", "quantity": 50},

    # Frozen
    {"id": "P028", "name": "Frozen Mixed Vegetables", "category": "Frozen", "tag": "vegetables", "brand": "Green Giant",
     "price": "3.99", "store_id": "S1", "quantity": 100},
    {"id": "P029", "name": "Vanilla Ice Cream", "category": "Frozen", "tag": "ice cream", "brand": "Ben & Jerry's",
     "price": "6.99", "store_id": "S2", "quantity": 60},
    {"id": "P030", "name": "Frozen Pizza", "category": "Frozen", "tag": "pizza", "brand": "DiGiorno", "price": "7.99",
     "store_id": "S3", "quantity": 40},

    # Snacks
    {"id": "P031", "name": "Potato Chips", "category": "Snacks", "tag": "chips", "brand": "Lay's", "price": "3.99",
     "store_id": "S1", "quantity": 140},
    {"id": "P032", "name": "Mixed Nuts", "category": "Snacks", "tag": "nuts", "brand": "Planters", "price": "8.99",
     "store_id": "S2", "quantity": 90},
    {"id": "P033", "name": "Granola Bars", "category": "Snacks", "tag": "bars", "brand": "Nature Valley",
     "price": "4.99", "store_id": "S1", "quantity": 70},

    # Additional products for different stores
    {"id": "P034", "name": "Organic Almond Milk", "category": "Dairy", "tag": "milk", "brand": "Silk", "price": "3.99",
     "store_id": "S4", "quantity": 50},
    {"id": "P035", "name": "Free Range Eggs", "category": "Dairy", "tag": "eggs", "brand": "Vital Farms",
     "price": "5.99", "store_id": "S4", "quantity": 30},
    {"id": "P036", "name": "Sourdough Bread", "category": "Bakery", "tag": "bread", "brand": "Boudin", "price": "5.99",
     "store_id": "S4", "quantity": 40},
    {"id": "P037", "name": "Wild Caught Salmon", "category": "Seafood", "tag": "salmon", "brand": "Alaska",
     "price": "15.99", "store_id": "S4", "quantity": 25},
    {"id": "P038", "name": "Grass Fed Ground Beef", "category": "Meat", "tag": "beef", "brand": "Organic Prairie",
     "price": "12.99", "store_id": "S5", "quantity": 35},
    {"id": "P039", "name": "Organic Chicken Thighs", "category": "Meat", "tag": "chicken", "brand": "Bell & Evans",
     "price": "9.99", "store_id": "S5", "quantity": 45},
    {"id": "P040", "name": "Artisan Pasta", "category": "Pantry", "tag": "pasta", "brand": "De Cecco", "price": "3.99",
     "store_id": "S5", "quantity": 60},

    # OPTIMIZATION TESTING PRODUCTS - Same items across multiple stores with different prices
    # This enables the optimizer to make decisions about where to shop

    # MILK - Available in multiple stores with different prices
    {"id": "P041", "name": "Organic Whole Milk", "category": "Dairy", "tag": "milk", "brand": "Horizon",
     "price": "5.49", "store_id": "S9", "quantity": 90},
    {"id": "P042", "name": "Organic Whole Milk", "category": "Dairy", "tag": "milk", "brand": "Horizon",
     "price": "4.79", "store_id": "S10", "quantity": 110},
    {"id": "P043", "name": "Organic Whole Milk", "category": "Dairy", "tag": "milk", "brand": "Horizon",
     "price": "4.49", "store_id": "S11", "quantity": 130},
    {"id": "P044", "name": "Organic Almond Milk", "category": "Dairy", "tag": "milk", "brand": "Silk", "price": "4.49",
     "store_id": "S9", "quantity": 50},
    {"id": "P045", "name": "Organic Almond Milk", "category": "Dairy", "tag": "milk", "brand": "Silk", "price": "3.79",
     "store_id": "S12", "quantity": 70},
    {"id": "P046", "name": "Organic Almond Milk", "category": "Dairy", "tag": "milk", "brand": "Silk", "price": "4.19",
     "store_id": "S13", "quantity": 40},

    # BREAD - Different prices across stores
    {"id": "P047", "name": "Whole Wheat Bread", "category": "Bakery", "tag": "bread", "brand": "Dave's Killer",
     "price": "5.49", "store_id": "S9", "quantity": 60},
    {"id": "P048", "name": "Whole Wheat Bread", "category": "Bakery", "tag": "bread", "brand": "Dave's Killer",
     "price": "4.79", "store_id": "S10", "quantity": 50},
    {"id": "P049", "name": "Whole Wheat Bread", "category": "Bakery", "tag": "bread", "brand": "Dave's Killer",
     "price": "4.29", "store_id": "S14", "quantity": 40},
    {"id": "P050", "name": "Sourdough Bread", "category": "Bakery", "tag": "bread", "brand": "Boudin", "price": "6.49",
     "store_id": "S11", "quantity": 30},
    {"id": "P051", "name": "Sourdough Bread", "category": "Bakery", "tag": "bread", "brand": "Boudin", "price": "5.79",
     "store_id": "S15", "quantity": 20},

    # EGGS - Price variations
    {"id": "P052", "name": "Grade AA Large Eggs", "category": "Dairy", "tag": "eggs", "brand": "Eggland's Best",
     "price": "3.99", "store_id": "S9", "quantity": 100},
    {"id": "P053", "name": "Grade AA Large Eggs", "category": "Dairy", "tag": "eggs", "brand": "Eggland's Best",
     "price": "3.29", "store_id": "S12", "quantity": 120},
    {"id": "P054", "name": "Grade AA Large Eggs", "category": "Dairy", "tag": "eggs", "brand": "Eggland's Best",
     "price": "3.79", "store_id": "S16", "quantity": 80},
    {"id": "P055", "name": "Free Range Eggs", "category": "Dairy", "tag": "eggs", "brand": "Vital Farms",
     "price": "6.49", "store_id": "S10", "quantity": 40},
    {"id": "P056", "name": "Free Range Eggs", "category": "Dairy", "tag": "eggs", "brand": "Vital Farms",
     "price": "5.79", "store_id": "S17", "quantity": 30},

    # BANANAS - Price competition
    {"id": "P057", "name": "Organic Bananas", "category": "Produce", "tag": "bananas", "brand": "Organic",
     "price": "2.29", "store_id": "S9", "quantity": 140},
    {"id": "P058", "name": "Organic Bananas", "category": "Produce", "tag": "bananas", "brand": "Organic",
     "price": "1.79", "store_id": "S13", "quantity": 130},
    {"id": "P059", "name": "Organic Bananas", "category": "Produce", "tag": "bananas", "brand": "Organic",
     "price": "2.09", "store_id": "S18", "quantity": 120},

    # APPLES - Multiple stores
    {"id": "P060", "name": "Gala Apples", "category": "Produce", "tag": "apples", "brand": "Fresh", "price": "4.29",
     "store_id": "S10", "quantity": 110},
    {"id": "P061", "name": "Gala Apples", "category": "Produce", "tag": "apples", "brand": "Fresh", "price": "3.79",
     "store_id": "S14", "quantity": 90},
    {"id": "P062", "name": "Gala Apples", "category": "Produce", "tag": "apples", "brand": "Fresh", "price": "4.49",
     "store_id": "S15", "quantity": 80},

    # CHICKEN - Meat optimization
    {"id": "P063", "name": "Boneless Chicken Breast", "category": "Meat", "tag": "chicken", "brand": "Perdue",
     "price": "8.49", "store_id": "S9", "quantity": 70},
    {"id": "P064", "name": "Boneless Chicken Breast", "category": "Meat", "tag": "chicken", "brand": "Perdue",
     "price": "7.79", "store_id": "S11", "quantity": 60},
    {"id": "P065", "name": "Boneless Chicken Breast", "category": "Meat", "tag": "chicken", "brand": "Perdue",
     "price": "8.99", "store_id": "S16", "quantity": 50},
    {"id": "P066", "name": "Organic Chicken Thighs", "category": "Meat", "tag": "chicken", "brand": "Bell & Evans",
     "price": "10.49", "store_id": "S12", "quantity": 40},
    {"id": "P067", "name": "Organic Chicken Thighs", "category": "Meat", "tag": "chicken", "brand": "Bell & Evans",
     "price": "9.79", "store_id": "S17", "quantity": 30},

    # COFFEE - Beverage optimization
    {"id": "P068", "name": "Ground Coffee", "category": "Beverages", "tag": "coffee", "brand": "Folgers",
     "price": "7.49", "store_id": "S9", "quantity": 50},
    {"id": "P069", "name": "Ground Coffee", "category": "Beverages", "tag": "coffee", "brand": "Folgers",
     "price": "6.79", "store_id": "S12", "quantity": 40},
    {"id": "P070", "name": "Ground Coffee", "category": "Beverages", "tag": "coffee", "brand": "Folgers",
     "price": "7.99", "store_id": "S18", "quantity": 30},

    # UNIQUE PRODUCTS - Only available at specific stores to force multi-store shopping

    # S9 - Neve Tzedek Market Specialties
    {"id": "P071", "name": "Artisan Goat Cheese", "category": "Dairy", "tag": "cheese", "brand": "Local Farm",
     "price": "12.99", "store_id": "S9", "quantity": 20},
    {"id": "P072", "name": "Heirloom Tomatoes", "category": "Produce", "tag": "tomatoes", "brand": "Specialty",
     "price": "5.99", "store_id": "S9", "quantity": 30},
    {"id": "P073", "name": "Truffle Oil", "category": "Pantry", "tag": "oil", "brand": "Gourmet", "price": "24.99",
     "store_id": "S9", "quantity": 25},

    # S10 - HaTachana SuperMarket Unique Items
    {"id": "P074", "name": "Quinoa Ancient Grains", "category": "Pantry", "tag": "quinoa", "brand": "Ancient Harvest",
     "price": "8.99", "store_id": "S10", "quantity": 40},
    {"id": "P075", "name": "Coconut Water", "category": "Beverages", "tag": "water", "brand": "Vita Coco",
     "price": "3.99", "store_id": "S10", "quantity": 50},
    {"id": "P076", "name": "Kimchi", "category": "Produce", "tag": "kimchi", "brand": "Seoul Food", "price": "6.99",
     "store_id": "S10", "quantity": 30},

    # S11 - Yafo Street Grocers Exclusives
    {"id": "P077", "name": "Tahini Premium", "category": "Pantry", "tag": "tahini", "brand": "Joyva", "price": "9.99",
     "store_id": "S11", "quantity": 40},
    {"id": "P078", "name": "Pomegranate Juice", "category": "Beverages", "tag": "juice", "brand": "POM",
     "price": "7.99", "store_id": "S11", "quantity": 50},
    {"id": "P079", "name": "Za'atar Spice Blend", "category": "Pantry", "tag": "spice", "brand": "Traditional",
     "price": "4.99", "store_id": "S11", "quantity": 30},

    # S12 - SheinkinExpress Organic Focus
    {"id": "P080", "name": "Organic Kale", "category": "Produce", "tag": "kale", "brand": "Organic", "price": "3.99",
     "store_id": "S12", "quantity": 40},
    {"id": "P081", "name": "Coconut Milk", "category": "Dairy", "tag": "milk", "brand": "So Delicious", "price": "4.99",
     "store_id": "S12", "quantity": 50},
    {"id": "P082", "name": "Gluten-Free Pasta", "category": "Pantry", "tag": "pasta", "brand": "Jovial",
     "price": "5.99", "store_id": "S12", "quantity": 30},

    # S13 - Bauhaus Market European Style
    {"id": "P083", "name": "German Rye Bread", "category": "Bakery", "tag": "bread", "brand": "European",
     "price": "6.99", "store_id": "S13", "quantity": 40},
    {"id": "P084", "name": "Emmental Cheese", "category": "Dairy", "tag": "cheese", "brand": "Swiss", "price": "8.99",
     "store_id": "S13", "quantity": 30},
    {"id": "P085", "name": "Sparkling Mineral Water", "category": "Beverages", "tag": "water",
     "brand": "San Pellegrino", "price": "2.99", "store_id": "S13", "quantity": 50},

    # S14 - Gordon Beach Fresh Seafood Focus
    {"id": "P086", "name": "Fresh Tuna Steaks", "category": "Seafood", "tag": "tuna", "brand": "Fresh",
     "price": "18.99", "store_id": "S14", "quantity": 20},
    {"id": "P087", "name": "Sea Bass Fillet", "category": "Seafood", "tag": "fish", "brand": "Mediterranean",
     "price": "22.99", "store_id": "S14", "quantity": 25},
    {"id": "P088", "name": "Shrimp Jumbo", "category": "Seafood", "tag": "shrimp", "brand": "Gulf Fresh",
     "price": "16.99", "store_id": "S14", "quantity": 30},

    # S15 - Ibn Gabirol Plaza Health Focus
    {"id": "P089", "name": "Protein Powder", "category": "Health", "tag": "protein", "brand": "Optimum", "price": "39.99", "store_id": "S15", "quantity": 20},
    {"id": "P090", "name": "Chia Seeds", "category": "Health", "tag": "seeds", "brand": "Spectrum", "price": "12.99", "store_id": "S15", "quantity": 30},
    {"id": "P091", "name": "Kombucha", "category": "Beverages", "tag": "kombucha", "brand": "GT's", "price": "4.99", "store_id": "S15", "quantity": 20},
    
    # S16 - King George Corner International
    {"id": "P092", "name": "Basmati Rice", "category": "Pantry", "tag": "rice", "brand": "Tilda", "price": "5.99", "store_id": "S16", "quantity": 30},
    {"id": "P093", "name": "Curry Paste", "category": "Pantry", "tag": "curry", "brand": "Thai Kitchen", "price": "3.99", "store_id": "S16", "quantity": 40},
    {"id": "P094", "name": "Soy Sauce", "category": "Pantry", "tag": "sauce", "brand": "Kikkoman", "price": "4.49", "store_id": "S16", "quantity": 50},
    
    # S17 - Allenby Market Local Produce
    {"id": "P095", "name": "Israeli Cucumber", "category": "Produce", "tag": "cucumber", "brand": "Local", "price": "2.99", "store_id": "S17", "quantity": 60},
    {"id": "P096", "name": "Jaffa Oranges", "category": "Produce", "tag": "oranges", "brand": "Jaffa", "price": "3.49", "store_id": "S17", "quantity": 70},
    {"id": "P097", "name": "Fresh Herbs Mix", "category": "Produce", "tag": "herbs", "brand": "Local", "price": "2.49", "store_id": "S17", "quantity": 80},
    
    # S18 - Kerem HaTeimanim Fresh Traditional
    {"id": "P098", "name": "Halva", "category": "Snacks", "tag": "halva", "brand": "Traditional", "price": "7.99", "store_id": "S18", "quantity": 90},
    {"id": "P099", "name": "Turkish Delight", "category": "Snacks", "tag": "sweets", "brand": "Istanbul", "price": "9.99", "store_id": "S18", "quantity": 100},
    {"id": "P100", "name": "Pita Bread Fresh", "category": "Bakery", "tag": "pita", "brand": "Traditional", "price": "2.99", "store_id": "S18", "quantity": 110},
    
    # Additional common products with price variations for more optimization opportunities
    {"id": "P101", "name": "Roma Tomatoes", "category": "Produce", "tag": "tomatoes", "brand": "Fresh", "price": "2.79", "store_id": "S9", "quantity": 120},
    {"id": "P102", "name": "Roma Tomatoes", "category": "Produce", "tag": "tomatoes", "brand": "Fresh", "price": "2.29", "store_id": "S12", "quantity": 130}, # Cheaper than S3
    {"id": "P103", "name": "Sweet Yellow Onions", "category": "Produce", "tag": "onions", "brand": "Fresh", "price": "1.99", "store_id": "S10", "quantity": 140},
    {"id": "P104", "name": "Sweet Yellow Onions", "category": "Produce", "tag": "onions", "brand": "Fresh", "price": "1.59", "store_id": "S14", "quantity": 20}, # Cheaper than S3
    {"id": "P105", "name": "Sparkling Water", "category": "Beverages", "tag": "water", "brand": "LaCroix", "price": "6.49", "store_id": "S11", "quantity": 30},
    {"id": "P106", "name": "Sparkling Water", "category": "Beverages", "tag": "water", "brand": "LaCroix", "price": "5.79", "store_id": "S16", "quantity": 40}, # Cheaper than S2
    {"id": "P107", "name": "Orange Juice", "category": "Beverages", "tag": "juice", "brand": "Tropicana", "price": "5.29", "store_id": "S13", "quantity": 50},
    {"id": "P108", "name": "Orange Juice", "category": "Beverages", "tag": "juice", "brand": "Tropicana", "price": "4.79", "store_id": "S17", "quantity": 60}, # Cheaper than S1
]

def get_stores_in_radius(lat: float, lon: float, radius_meters: int = 10000) -> List[str]:
    """
    Calculate which stores are within the given radius of the coordinates.
    Uses simple distance calculation for mock purposes.
    """
    import math
    
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance in meters using Haversine formula."""
        R = 6371000  # Earth's radius in meters
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    nearby_stores = []
    for store_id, store_data in MOCK_STORES.items():
        distance = calculate_distance(lat, lon, store_data["lat"], store_data["lon"])
        if distance <= radius_meters:
            nearby_stores.append(store_id)
    
    # Sort by distance for consistent results
    nearby_stores.sort()
    return nearby_stores

def get_products_by_tags_and_stores(tags: List[str], store_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Filter products by tags and store IDs.
    Matches products where tag appears in the product tag or name.
    """
    if not tags or not store_ids:
        return []
    
    # Convert tags to lowercase for case-insensitive matching
    search_tags = [tag.lower() for tag in tags]
    
    matching_products = []
    for product in MOCK_PRODUCTS:
        # Check if product is in one of the specified stores
        if product["store_id"] not in store_ids:
            continue
        
        # Check if any search tag matches product tag or appears in name
        product_matches = False
        
        # Check product tag
        if product.get("tag"):
            if product["tag"].lower() in search_tags:
                product_matches = True
        
        # Check product name for tag matches
        if not product_matches and product.get("name"):
            product_name_lower = product["name"].lower()
            for tag in search_tags:
                if tag in product_name_lower:
                    product_matches = True
                    break
        
        if product_matches:
            matching_products.append(product.copy())
    
    return matching_products
