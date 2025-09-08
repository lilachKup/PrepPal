# split_payment_lambda.py

import os
import json
import requests
import uuid

# Environment variables
PAYPAL_CLIENT_ID = os.environ["PAYPAL_CLIENT_ID"]
PAYPAL_SECRET = os.environ["PAYPAL_SECRET"]
PREPAL_SANDBOX_EMAIL = os.environ.get("PREPAL_SANDBOX_EMAIL")  # used only in sandbox
PREPAL_SANDBOX_STROE_EMAIL = os.environ.get("PREPAL_SANDBOX_STORE_EMAIL")  # used only in sandbox
PREPAL_SANDBOX_DELIVERY_EMAIL = os.environ.get("PREPAL_SANDBOX_DELIVERY_EMAIL")  # used only in sandbox
USE_SANDBOX = os.environ.get("USE_SANDBOX", "true").lower() == "true"

# PayPal API base
BASE_URL = "https://api-m.sandbox.paypal.com" if USE_SANDBOX else "https://api-m.paypal.com"


def get_access_token():
    """Get PayPal OAuth token"""
    try:
        resp = requests.post(
            f"{BASE_URL}/v1/oauth2/token",
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET)
        )
        resp.raise_for_status()
        return resp.json()["access_token"]
    except Exception as e:
        raise Exception(f"Error fetching access token: {e}")


def get_order_status(order_id, access_token):
    """Get PayPal order status"""
    resp = requests.get(
        f"{BASE_URL}/v2/checkout/orders/{order_id}",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    resp.raise_for_status()
    return resp.json()


def capture_order(order_id, access_token):
    """Capture PayPal order only if not captured yet"""
    order = get_order_status(order_id, access_token)
    status = order.get("status")

    if status == "COMPLETED":
        # Already captured
        return order
    elif status in ["CREATED", "APPROVED"]:
        # Capture now
        resp = requests.post(
            f"{BASE_URL}/v2/checkout/orders/{order_id}/capture",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        )
        resp.raise_for_status()
        return resp.json()
    else:
        raise Exception(f"Order status {status} cannot be captured")


def create_payout(amount, store_email, delivery_email, currency="USD"):
    """Prepare payout payload"""
    sender_batch_id = str(uuid.uuid4())

    if USE_SANDBOX:
        # In sandbox, use sandbox emails
        store_email = PREPAL_SANDBOX_STROE_EMAIL or store_email
        delivery_email = PREPAL_SANDBOX_DELIVERY_EMAIL or delivery_email

    payout_payload = {
        "sender_batch_header": {
            "sender_batch_id": sender_batch_id,
            "email_subject": "PrePal Payment"
        },
        "items": [
            {
                "recipient_type": "EMAIL",
                "receiver": store_email,
                "amount": {"value": f"{amount * 0.70:.2f}", "currency": currency},
                "note": "Store Payment"
            },
            {
                "recipient_type": "EMAIL",
                "receiver": delivery_email,
                "amount": {"value": f"{amount * 0.20:.2f}", "currency": currency},
                "note": "Delivery Payment"
            },
#            {
#                "recipient_type": "EMAIL",
#                "receiver": PREPAL_SANDBOX_EMAIL if USE_SANDBOX else os.environ["PREPAL_EMAIL"],
#                "amount": {"value": f"{amount * 0.10:.2f}", "currency": currency},
#                "note": "PrePal Fee"
#            }
        ]
    }
    return payout_payload


def send_payout(payout_payload, access_token):
    """Send PayPal payout"""
    resp = requests.post(
        f"{BASE_URL}/v1/payments/payouts",
        json=payout_payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {access_token}"}
    )
    resp.raise_for_status()
    return resp.json()


def lambda_handler(event, context):
    """Split payment lambda"""
    try:
        body = json.loads(event.get("body", "{}"))
        order_id = body.get("order_id")
        store_email = body.get("store_email")
        delivery_email = body.get("delivery_email")
        currency = body.get("currency", "USD")

        if not all([order_id, store_email, delivery_email]):
            return {"statusCode": 400, "body": json.dumps({"error": "Missing required fields"})}

        access_token = get_access_token()
        capture_data = capture_order(order_id, access_token)

        # Amount from captured order
        try:
            amount = float(capture_data["purchase_units"][0]["payments"]["captures"][0]["amount"]["value"])
        except (KeyError, IndexError):
            return {"statusCode": 400, "body": json.dumps({"error": "Cannot determine captured amount"})}

        payout_payload = create_payout(amount, store_email, delivery_email, currency)
        payout_resp = send_payout(payout_payload, access_token)

        return {
            "statusCode": 200,
            "body": json.dumps({"capture": capture_data, "payout": payout_resp})
        }

    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
