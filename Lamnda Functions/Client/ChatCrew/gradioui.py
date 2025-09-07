# ui.py
from __future__ import annotations
import json
import gradio as gr
import lambda_handler as lambda_mod  # your AWS Lambda "handler(event, context)"
import time
import requests

LOCAL_CLIENT_ID = "local_gradio_client_id"
local_chat_id = "local_chat_id"  # filled after create_chat=True

import logging, sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

# optional: line-buffer stdout (Py3.7+)
try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass

logger = logging.getLogger("prep-pal")
logger.info("Gradio UI starting…")

def build_event(chat_id: str | None, client_id: str, message: str, create_chat: bool) -> dict:
    body = {
        "chat_id": chat_id,
        "client_id": client_id,
        "message": message,
        "create_chat": create_chat,
    }
    return {
        "resource": "/message",
        "path": "/message",
        "httpMethod": "POST",
        "headers": {"Content-Type": "application/json"},
        "isBase64Encoded": False,
        "body": json.dumps(body, ensure_ascii=False),
    }

def start_chat():
    """Create a new chat once at startup and store chat_id."""
    global local_chat_id
    event = build_event(local_chat_id, LOCAL_CLIENT_ID, "Hello, world!", True)

    response = requests.post(url=
                             "https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/client/createchat?client_id=local_gradio_client_id",
                             headers={"Content-Type": "application/json"},
                                data=json.dumps({
                                    "address": "Tel Aviv, Aza 25"
                                })
                             )
    body = json.loads(response.text)
    print(f"start_chat: {body}")  # logs
    local_chat_id = body["chat_id"]

def chat_function(message: str, history: list[dict]):
    """
    Gradio will pass the Chatbot's current messages as `history`
    (list of dicts with keys: role, content) when type='messages'.
    This function must yield/return the updated messages list.
    """
    # 1) Show the user message immediately
    messages = (history or []) + [{"role": "user", "content": message}, {"role": "assistant", "content": ""}]
    yield messages  # assistant placeholder shown

    # 2) Call your Lambda
    event = build_event(local_chat_id, LOCAL_CLIENT_ID, message, False)
    response = lambda_mod.lambda_handler(event, {})
    body = json.loads(response["body"])
    print(body)  # logs

    # 3) Build the assistant full reply text
    if body.get("ok") is False:
        full_reply = f"Error: {body.get('message', 'Unknown error')}"
    else:
        products_str = " , ".join(f"{p['name']} ({p['quantity']})" for p in body.get("products", []))
        full_reply = body.get("message", "")
        if products_str:
            full_reply += "\n\n" + f"Store {body.get('store_id', '')} :"
            full_reply += "\n\n" + products_str

    # 4) Stream it token-by-token (word streaming demo)
    acc = ""
    for tok in full_reply.split(" "):
        acc += tok + " "
        messages[-1]["content"] = acc
        time.sleep(0.05)
        yield messages

    # 5) Final yield to ensure clean trailing spaces trimmed (optional)
    messages[-1]["content"] = full_reply.strip()
    #time.sleep(3)
    yield messages

def clear_chat():
    """Return empty messages and clear the input."""
    return [], ""

def main():
    #start_chat()

    with gr.Blocks(title="PrepPal Chat") as demo:
        start_chat()
        gr.Markdown("## 🛒 PrepPal — Local Gradio Chat\nType a message and press Enter.")
        chatbot_ui = gr.Chatbot(type="messages", height=480, bubble_full_width=False, label="Conversation")

        with gr.Row():
            message_input = gr.Textbox(placeholder="Enter your message…", autofocus=True, scale=8)
            send_button = gr.Button("Send", variant="primary", scale=1)

        with gr.Row():
            clear_button = gr.Button("Clear")

        # Wire up events (both Enter and button click)
        message_input.submit(chat_function, inputs=[message_input, chatbot_ui], outputs=chatbot_ui).then(lambda: "", None, message_input)  # clear textbox
        send_button.click(chat_function, inputs=[message_input, chatbot_ui], outputs=chatbot_ui).then(lambda: "", None, message_input)  # clear textbox

        # Clear should reset both the chatbot and the textbox
        clear_button.click(fn=clear_chat, inputs=None, outputs=[chatbot_ui, message_input])

        demo.queue()  # enable streaming/concurrency
        demo.launch(share=False)

if __name__ == "__main__":
    main()
