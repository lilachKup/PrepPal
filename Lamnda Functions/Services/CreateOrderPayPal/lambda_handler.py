import json
import os
import requests

# Constants / Environment variables
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID")
PAYPAL_SECRET = os.environ.get("PAYPAL_SECRET")
USE_SANDBOX = os.environ.get("USE_SANDBOX", "True").lower() == "true"
BASE_URL = "https://api-m.sandbox.paypal.com" if USE_SANDBOX else "https://api-m.paypal.com"
RETURN_URL = "https://your-frontend.com/payment-success"
CANCEL_URL = "https://your-frontend.com/payment-cancel"
DEFAULT_CURRENY = "ILS"

# --------------------------
# PAYPAL API UTILITIES
# --------------------------
def get_access_token() -> str:
    """Get OAuth access token from PayPal."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise ValueError("PayPal credentials not set in environment variables")

    response = requests.post(
        f"{BASE_URL}/v1/oauth2/token",
        headers={"Accept": "application/json", "Accept-Language": "en_US"},
        data={"grant_type": "client_credentials"},
        auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
        timeout=10
    )
    response.raise_for_status()
    return response.json()["access_token"]

def create_paypal_order(access_token: str, order_payload: dict) -> dict:
    """Send order creation request to PayPal."""
    response = requests.post(
        f"{BASE_URL}/v2/checkout/orders",
        json=order_payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        },
        timeout=10
    )
    response.raise_for_status()
    return response.json()

def get_approval_url(order_response: dict) -> str:
    """Extract approval URL from PayPal order response."""
    links = order_response.get("links", [])
    approval_url = next((link["href"] for link in links if link.get("rel") == "approve"), None)
    if not approval_url:
        raise ValueError("Approval URL not found in PayPal response")
    return approval_url

# --------------------------
# VALIDATION UTILITIES
# --------------------------
def validate_products(products: list) -> None:
    """Validate product list and individual items."""
    if not products or not isinstance(products, list):
        raise ValueError("Products must be a non-empty list")

    for i, p in enumerate(products):
        if not all(k in p for k in ["name", "price"]):
            raise ValueError(f"Product at index {i} missing 'name' or 'price'")
        if not isinstance(p["price"], (int, float)) or float(p["price"]) < 0:
            raise ValueError(f"Product price at index {i} must be positive")
        if "quantity" in p and (not isinstance(p["quantity"], int) or p["quantity"] <= 0):
            raise ValueError(f"Product quantity at index {i} must be positive integer")

def calculate_total_amount(products: list) -> float:
    """Calculate total amount from products list."""
    return sum(float(p["price"]) * int(p.get("quantity", 1)) for p in products)

def build_order_payload(products: list, currency: str) -> dict:
    """Build PayPal order payload with items and total."""
    total_amount = calculate_total_amount(products)
    items = [
        {
            "name": p["name"],
            "unit_amount": {"currency_code": currency, "value": f"{float(p['price']):.2f}"},
            "quantity": str(p.get("quantity", 1))
        }
        for p in products
    ]

    return {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {
                    "currency_code": currency,
                    "value": f"{total_amount:.2f}",
                    "breakdown": {"item_total": {"currency_code": currency, "value": f"{total_amount:.2f}"}}
                },
                "items": items
            }
        ],
        "application_context": {
            "return_url": RETURN_URL,
            "cancel_url": CANCEL_URL
        }
    }

# --------------------------
# LAMBDA HANDLER
# --------------------------
def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        products = body.get("products")
        currency = body.get("currency", DEFAULT_CURRENY).upper()

        # Validation
        validate_products(products)
        if calculate_total_amount(products) <= 0:
            return {"statusCode": 400, "body": json.dumps({"error": "Total amount must be > 0"})}

        # Build order
        payload = build_order_payload(products, currency)
        access_token = get_access_token()
        order_response = create_paypal_order(access_token, payload)
        approval_url = get_approval_url(order_response)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"order_id": order_response.get("id"), "approval_url": approval_url})
        }

    except ValueError as ve:
        return {"statusCode": 400, "body": json.dumps({"error": str(ve)})}
    except requests.RequestException as re:
        return {"statusCode": 502, "body": json.dumps({"error": f"PayPal API request failed: {str(re)}"})}
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": f"Unexpected error: {str(e)}"})}
