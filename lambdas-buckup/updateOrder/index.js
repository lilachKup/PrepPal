import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  UpdateCommand,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const ordersTable = "Orders";
const completedTable = "preppal-orders-completed";

const responseWithCORS = (statusCode, bodyObj) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
  },
  body: JSON.stringify(bodyObj),
});

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return responseWithCORS(200, { message: "CORS preflight success" });
    }

    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    const orderNum = body?.order_num;
    const storeId = body?.store_id;
    const orderStatus = body?.order_status;

    if (!orderNum || !storeId) {
      return responseWithCORS(400, { message: "Missing order_num or store_id" });
    }

    if (orderStatus === "rejected") {
      await docClient.send(
        new DeleteCommand({
          TableName: ordersTable,
          Key: { store_id: storeId, order_num: orderNum },
        })
      );
      return responseWithCORS(200, { message: `Order ${orderNum} rejected and deleted.` });
    }

    if (orderStatus === "ready") {
      await docClient.send(
        new UpdateCommand({
          TableName: ordersTable,
          Key: { store_id: storeId, order_num: orderNum },
          UpdateExpression: "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": "ready" },
        })
      );

      const orderRes = await docClient.send(
        new GetCommand({
          TableName: ordersTable,
          Key: { store_id: storeId, order_num: orderNum },
        })
      );

      const orderItem = orderRes.Item;
      if (orderItem) {
        const completedOrder = {
          customer_id: orderItem.customer_id,
          order_id: orderItem.order_num,
          items: orderItem.items,
        };

        await docClient.send(
          new PutCommand({
            TableName: completedTable,
            Item: completedOrder,
          })
        );
      }

      return responseWithCORS(200, {
        message: `Order ${orderNum} updated to READY and copied.`,
      });
    }

    if (orderStatus === "in delivery") {
      const driverId = body?.driver_id;
      if (!driverId) {
        return responseWithCORS(400, { message: "driver_id is required for 'in delivery' status" });
      }

      // עדכון אטומי: רק אם ההזמנה כרגע READY
      const nowIso = new Date().toISOString();
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: ordersTable,
            Key: { store_id: storeId, order_num: orderNum },
            UpdateExpression:
              "SET #s = :inDelivery, driver_id = :d, delivery_started_at = :t",
            ConditionExpression: "#s = :ready", // מבטיח מעבר READY -> IN DELIVERY בלבד
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: {
              ":inDelivery": "in delivery",
              ":ready": "ready",
              ":d": driverId,
              ":t": nowIso,
            },
            ReturnValues: "ALL_NEW",
          })
        );
      } catch (err) {
        // אם התנאי נכשל או שההזמנה אינה קיימת — מסר מדויק
        if (err?.name === "ConditionalCheckFailedException") {
          // נשלוף סטטוס נוכחי רק בשביל הודעה טובה
          const cur = await docClient.send(
            new GetCommand({
              TableName: ordersTable,
              Key: { store_id: storeId, order_num: orderNum },
            })
          );
          const currentStatus = cur.Item?.status ?? "NOT_FOUND";
          return responseWithCORS(400, {
            message: `Order ${orderNum} is not in READY status (current: ${currentStatus})`,
          });
        }
        throw err;
      }

      return responseWithCORS(200, {
        message: `Order ${orderNum} moved from READY to IN DELIVERY with driver_id ${driverId}.`,
      });
    }

    return responseWithCORS(400, { message: "Unknown order_status" });
  } catch (error) {
    console.error("❌ Lambda error:", error);
    return responseWithCORS(500, { message: "Internal server error" });
  }
};
