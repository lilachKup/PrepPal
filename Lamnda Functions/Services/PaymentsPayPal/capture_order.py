import json
import os
import requests
import boto3

PAYPAL_CLIENT_ID = os.environ["PAYPAL_CLIENT_ID"]
PAYPAL_SECRET = os.environ["PAYPAL_SECRET"]
PAYMENT_SPLIT_URL = os.environ.get("PAYMENT_SPLIT_URL")
USE_SANDBOX = os.environ.get("USE_PAYPAL_SANDBOX", "true").lower() == "true"
BASE_URL = "https://api-m.sandbox.paypal.com" if USE_SANDBOX else "https://api-m.paypal.com"

order_table = boto3.resource("dynamodb").Table(os.environ.get("ORDER_DB_TABLE", "Orders"))


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "body": json.dumps(body),
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
        }
    }


def split_payment(order_id, store_id, delivery_email, amount, currency):
    if not PAYMENT_SPLIT_URL:
        raise ValueError("PAYMENT_SPLIT_URL is not set in environment variables")

    payload = {
        "order_id": order_id,
        "store_id": store_id,
        "delivery_email": delivery_email,
        "amount": amount,
        "currency": currency
    }

    try:
        resp = requests.post(PAYMENT_SPLIT_URL, json=payload)
        print(f"split response: {resp}")
        # resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise Exception(f"Error calling payment split service: {str(e)}")


def get_access_token():
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
        raise Exception(f"Error getting access token: {str(e)}")


def get_order(order_id):
    """Check current status of the order"""
    token = get_access_token()
    resp = requests.get(
        f"{BASE_URL}/v2/checkout/orders/{order_id}",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )
    resp.raise_for_status()
    return resp.json()


def capture_order(order_id):
    """Capture the order"""
    token = get_access_token()
    resp = requests.post(
        f"{BASE_URL}/v2/checkout/orders/{order_id}/capture",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )
    resp.raise_for_status()
    return resp.json()


def lambda_handler(event, context):
    try:
        print(event)
        body = json.loads(event.get("body", "{}"))
        print(body)
        order_id = body.get("order_id")
        if not order_id:
            return _response(400, {"error": "Missing order_id"})

        order_item = order_table.get_item(Key={"order_id": order_id})
        print(f'Order item from DB: {order_item}')

        order_item = order_item.get("Item")

        if order_item['store_id'] is None or order_item['store_id'] == "":
            return _response(400, {"error": "Missing store_id"})

        if order_item['deliver_email'] is None or order_item['deliver_email'] == "":
            return _response(400, {"error": "Missing deliver_email"})

        # 1️⃣ Check order status first
        order_data = get_order(order_id)
        order_status = order_data.get("status")
        if order_status != "APPROVED":
            return _response(200, {"status": order_status})

        captured = ""
        retries = 0
        capture_data: dict = {}
        while captured != "COMPLETED" and retries < 5:
            import time
            capture_data = capture_order(order_id)
            captured = capture_data.get("status")
            print("Capture data: ", capture_data)
            print("Status: ", capture_data.get("status"))
            if captured != "COMPLETED":
                print(f"Order not captured yet, retrying... ({retries + 1}/5)")
                time.sleep(2)

        split_res: dict | None = None
        if captured == "COMPLETED":
            split_res = split_payment(order_item['order_id'], order_item['store_id'], order_item['deliver_email'],
                                      order_item['amount'], order_item['currency'])
            print("Split payment response: ", split_res)

        # print("Split payment response: ", split_res)
        if split_res is not None and split_res.get("payout").get("batch_header").get("batch_status") != "PENDING":
            print("⚠️ Payout batch not pending, something went wrong.")
            return _response(500, {"error": "Payout batch not pending"})

        print("Updating order status in DB")
        order_table.update_item(
            Key={"order_id": order_id},
            UpdateExpression="SET #status = :status",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={":status": "COMPLETED"}
        )

        return _response(200, {
            "status": capture_data.get("status"),
            "order_id": order_id
        })

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return _response(http_err.response.status_code, {"error": str(http_err), "response": http_err.response.text})
    except Exception as e:
        print(f"Error occurred: {e}")
        return _response(500, {"error": str(e)})
