import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const ordersTable = "Orders";

const responseWithCORS = (statusCode, bodyObj) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,GET"
  },
  body: JSON.stringify(bodyObj)
});

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return responseWithCORS(200, { message: "CORS preflight success" });
    }

    if (event.httpMethod !== "GET") {
      return responseWithCORS(405, { message: "Method Not Allowed" });
    }

    const driverId =
      event.pathParameters?.driver_id ||
      event.queryStringParameters?.driver_id;

    if (!driverId) {
      return responseWithCORS(400, { message: "Missing driver_id" });
    }

    let items = [];
    try {
      // 🔹 ננסה קודם עם GSI
      const res = await docClient.send(new QueryCommand({
        TableName: ordersTable,
        IndexName: "driver_id-index", 
        KeyConditionExpression: "driver_id = :d",
        FilterExpression: "#s = :inDelivery",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":d": driverId,
          ":inDelivery": "in delivery"
        }
      }));
      items = res.Items || [];
    } catch (err) {
      console.warn("⚠️ Falling back to Scan (no GSI on driver_id)", err);
      const res = await docClient.send(new ScanCommand({
        TableName: ordersTable,
        FilterExpression: "driver_id = :d AND #s = :inDelivery",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":d": driverId,
          ":inDelivery": "in delivery"
        }
      }));
      items = res.Items || [];
    }

    if (items.length > 0) {
      // נחזיר גם customer_location בתוך האובייקט
      return responseWithCORS(200, {
        message: "Driver has active in_delivery order",
        orders: items.map(order => ({
          ...order,
          customer_location: order.customer_location ?? "—"
        }))
      });
    }

    return responseWithCORS(200, { message: "No in_delivery orders for this driver" });

  } catch (err) {
    console.error("❌ Lambda error:", err);
    return responseWithCORS(500, { message: "Internal server error" });
  }
};
