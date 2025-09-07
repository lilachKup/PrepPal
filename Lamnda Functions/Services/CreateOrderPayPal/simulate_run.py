from lambda_handler import lambda_handler
import json

def create_event(products, currency = 'USD'):
    return {
        'body':json.dumps({
            'currency' : currency,
            'products' : products
        })
    }

def simulate_run():
    products = [
        {'name': 'Apple', 'price': 5.0, 'quantity': 1},
        {'name': 'Banana', 'price': 7.49, 'quantity': 2},
        {'name': 'Lemon', 'price': 2.0, 'quantity': 1}
    ]

    event = create_event(products)
    context = {}

    response = lambda_handler(event, context)

    print(json.dumps(response, indent=2))

if __name__ == "__main__":
    simulate_run()
