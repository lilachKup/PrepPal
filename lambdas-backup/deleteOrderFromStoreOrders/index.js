import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const ordersTable = "Orders";

const responseWithCORS = (statusCode, bodyObj) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
  },
  body: JSON.stringify(bodyObj)
});

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return responseWithCORS(200, { message: "CORS preflight success" });
    }

    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const orderNum = body.order_num;
    const storeId = body.store_id;

    if (!orderNum || !storeId) {
      return responseWithCORS(400, { message: "Missing order_num or store_id" });
    }

    await docClient.send(new DeleteCommand({
      TableName: ordersTable,
      Key: {
        order_num: orderNum,
        store_id: storeId
      }
    }));

    return responseWithCORS(200, { message: `Order ${orderNum} deleted successfully.` });

  } catch (error) {
    console.error("❌ Lambda error:", error);
    return responseWithCORS(500, { message: "Internal server error" });
  }
};
