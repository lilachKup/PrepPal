import json
import os
import requests
import uuid
import pymysql  # For RDS MySQL

# Environment variables
PAYPAL_CLIENT_ID = os.environ["PAYPAL_CLIENT_ID"]
PAYPAL_SECRET = os.environ["PAYPAL_SECRET"]
STORE_SANDBOX_EMAIL = os.environ["STORE_SANDBOX_EMAIL"]
DELIVERY_SANDBOX_EMAIL = os.environ.get("PREPAL_SANDBOX_DELIVERY_EMAIL")
USE_PAYPAL_SANDBOX = os.environ.get("USE_PAYPAL_SANDBOX", "true").lower() == "true"  # Sandbox flag

RDS_HOST = os.environ["RDS_HOST"]
RDS_USER = os.environ["RDS_USER"]
RDS_PASSWORD = os.environ["RDS_PASSWORD"]
RDS_DB = os.environ["RDS_DB"]

# PayPal endpoints
BASE_URL = "https://api-m.sandbox.paypal.com" if USE_PAYPAL_SANDBOX else "https://api-m.paypal.com"

# --------------------------
# PAYPAL UTILITIES
# --------------------------
def get_access_token() -> str:
    """Get OAuth token from PayPal."""
    response = requests.post(
        f"{BASE_URL}/v1/oauth2/token",
        headers={"Accept": "application/json", "Accept-Language": "en_US"},
        data={"grant_type": "client_credentials"},
        auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
        timeout=10
    )
    response.raise_for_status()
    return response.json()["access_token"]

def capture_order(order_id: str, access_token: str) -> dict:
    """Capture a PayPal order."""
    response = requests.post(
        f"{BASE_URL}/v2/checkout/orders/{order_id}/capture",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {access_token}"},
        timeout=10
    )
    response.raise_for_status()
    return response.json()

def send_payout(amount: float, market_email: str, delivery_email: str ,access_token: str) -> dict:
    """Send payout split: 95% to store, 5% to PrePal."""
    sender_batch_id = str(uuid.uuid4())
    payout_payload = {
        "sender_batch_header": {"sender_batch_id": sender_batch_id, "email_subject": "PrePal Payment"},
        "items": [
            {
                "recipient_type": "EMAIL",
                "receiver": market_email,
                "amount": {"value": f"{amount*0.95:.2f}", "currency": "USD"},
                "note": "Market Owner Payment"
            },
            {
                "recipient_type": "EMAIL",
                "receiver": delivery_email if not USE_PAYPAL_SANDBOX else DELIVERY_SANDBOX_EMAIL,
                "amount": {"value": f"{amount*0.05:.2f}", "currency": "USD"},
                "note": "Delivery Fee"
            }
        ]
    }
    response = requests.post(
        f"{BASE_URL}/v1/payments/payouts",
        json=payout_payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {access_token}"},
        timeout=10
    )
    response.raise_for_status()
    return response.json()

# --------------------------
# DATABASE UTILITIES
# --------------------------
def get_market_email(market_id: str) -> str:
    """Fetch market owner's email from RDS Stores table (market_id is UUID)."""
    if USE_PAYPAL_SANDBOX:
        return STORE_SANDBOX_EMAIL

    connection = pymysql.connect(
        host=RDS_HOST,
        user=RDS_USER,
        password=RDS_PASSWORD,
        database=RDS_DB,
        cursorclass=pymysql.cursors.DictCursor
    )
    try:
        with connection.cursor() as cursor:
            sql = "SELECT email FROM Stores WHERE market_id = %s LIMIT 1"
            cursor.execute(sql, (market_id,))
            result = cursor.fetchone()
            if not result or "email" not in result:
                raise ValueError(f"No email found for market_id {market_id}")
            # Use sandbox email if environment variable is set
            return result["email"]
    finally:
        connection.close()

# --------------------------
# LAMBDA HANDLER
# --------------------------
def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        order_id = body.get("order_id")
        market_id = body.get("store_id")
        delivery_email = body.get("delivery_email")

        if not order_id or not market_id:
            return {"statusCode": 400, "body": json.dumps({"error": "Missing order_id or market_id"})}

        # Get market email (sandbox or real)
        market_email = get_market_email(market_id)

        # Capture PayPal order
        access_token = get_access_token()
        capture_data = capture_order(order_id, access_token)
        amount = float(capture_data["purchase_units"][0]["payments"]["captures"][0]["amount"]["value"])

        # Send payout
        payout_data = send_payout(amount, market_email,delivery_email, access_token)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"capture": capture_data, "payout": payout_data})
        }

    except ValueError as ve:
        return {"statusCode": 400, "body": json.dumps({"error": str(ve)})}
    except requests.RequestException as re:
        return {"statusCode": 502, "body": json.dumps({"error": f"PayPal API request failed: {str(re)}"})}
    except pymysql.MySQLError as db_err:
        return {"statusCode": 500, "body": json.dumps({"error": f"Database error: {str(db_err)}"})}
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": f"Unexpected error: {str(e)}"})}
