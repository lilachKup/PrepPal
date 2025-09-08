const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  let store_id;

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    store_id = body?.store_id;

    if (!store_id) throw new Error("Missing store_id");
  } catch (e) {
    console.error("❌ Failed to extract store_id:", e);
    return { statusCode: 400, body: "Invalid store_id payload" };
  }

  try {
    await ddb.send(new PutCommand({
      TableName: "connections",
      Item: { connectionId, store_id }
    }));

    console.log(`✅ Registered store ${store_id} with connection ${connectionId}`);
    return { statusCode: 200 };
  } catch (err) {
    console.error("registerStore error:", err);
    return { statusCode: 500, body: "Failed to register store." };
  }
};
