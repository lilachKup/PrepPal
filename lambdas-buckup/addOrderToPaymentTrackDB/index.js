const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "OrdersTable";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // אפשר לשים דומיין קבוע אם צריך
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
  };

  // אם מדובר בבקשת preflight (OPTIONS), החזר רק headers
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Preflight OK" })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { order_num, customer_id, store_id, delivery_email, amount } = body;

    if (!order_num || !customer_id || !store_id || !delivery_email || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing order_num or customer_id" }),
      };
    }

    const item = {
      order_num,
      customer_id,
      store_id: store_id || null,
      delivery_email: delivery_email || null,
      amount: amount || 0
    };

    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: item,
    }).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "✅ Order saved", item }),
    };
  } catch (err) {
    console.error("❌ Error saving order:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to save order" }),
    };
  }
};
