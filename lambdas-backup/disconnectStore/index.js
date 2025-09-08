const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await ddb.send(new DeleteCommand({
      TableName: "connections",
      Key: { connectionId }
    }));

    console.log(`🧹 Disconnected and removed connectionId: ${connectionId}`);
    return { statusCode: 200 };
  } catch (e) {
    console.error("❌ Error on disconnect:", e);
    return { statusCode: 500, body: e.stack };
  }
};
