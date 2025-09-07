import json
from datetime import datetime

from chat_repository import get_chat, save_chat
from models import Message
from utils import validation_error_response, not_found_response, success_response, \
    internal_server_error_response, handle_cors

from flows import MainFlow
from utils import validate_request

def lambda_handler(event,  context = None):

    #print("Received event: " + json.dumps(event, indent=2))
    print(event)

    try:
        # Handle CORS preflight
        cors_response = handle_cors(event)
        if cors_response:
            return cors_response

        print('start handling request')

        print(f"event body: {event.get('body', '')}")
        print(f"event body type: {type(event.get('body', ''))}")
        data = json.loads(event.get('body', ''))
        print(f'body: {data}')

        print('validate request')
        is_valid, error_message = validate_request(data)

        if not is_valid:
            print(error_message)
            return validation_error_response(error_message)

        print('finding chat')
        chat = get_chat(data['chat_id'], data['client_id'])
        if not chat:
            print('chat not found, sending error')
            return not_found_response('The specific chat id was not found for this client')

        print('chat found')

        print('user message: ', data['message'])
        user_input = data['message']

        print("🤖 Thinking...")
        #response = run_shopping_assistant(chat, user_input)
        flow = MainFlow()
        response = flow.kickoff(inputs={'chat': chat, 'user_message': user_input})

        print(f"\n🤖 Assistant: {response}")


        print('saving chat')
        # Add user message to chat
        chat.messages.append(Message(
            role="user",
            content=user_input,
            timestamp=datetime.now()
        ))

        # Add assistant response to chat
        chat.messages.append(Message(
            role="assistant",
            content=str(response),
            timestamp=datetime.now()
        ))

        chat.updated_at = str(datetime.now())

        save_chat(chat)

        print('chat saved')

        print('building response')

        products = [product.to_dict() for product in chat.order]
        for i in range(len(products)):
            products[i]['price'] = products[i]['price_agorot'] / 100
            del products[i]['price_agorot']

        response_body ={
            'message': response,
            'products': products,
            'store_id': chat.order[0].store_id if chat.order and len(chat.order) > 0 else ''
        }

        print('sending response')

        return success_response(response_body)


    except Exception as e:
        return internal_server_error_response(str(e))

