from lambda_handler import lambda_handler
import json

def simulate_event(order_id = '3LL11783HV071770K', market_owner_email = 'prepalseller@business.example.com'):
    return {
        "body": json.dumps({
            "order_id": order_id,
            "market_owner_email": market_owner_email
        })
    }

def simulate_run():
    event = simulate_event()
    context = {}  # Simulated context, can be empty or filled with necessary data
    response = lambda_handler(event, context)

    print("Response Status Code:", response["statusCode"])
    print("Response Body:", response["body"])

if __name__ == "__main__":
    simulate_run()