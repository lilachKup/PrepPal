// index.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

export const handler = async (event) => {
  // CORS / Preflight
  if (event?.httpMethod === "OPTIONS" || event?.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,x-customer-id",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
      },
      body: JSON.stringify({ ok: true })
    };
  }

  try {
    // קבלת customer_id מכל מקום סביר
    let cid =
      event?.queryStringParameters?.customer_id ??
      event?.queryStringParameters?.customerId ??
      event?.pathParameters?.customer_id ??
      event?.pathParameters?.customerId ??
      event?.headers?.["x-customer-id"] ??
      event?.headers?.["X-Customer-Id"] ?? null;

    if (!cid && event?.body) {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
      try {
        const parsed = JSON.parse(raw);
        cid = parsed?.customer_id ?? parsed?.customerId ?? null;
      } catch {}
    }
    if (!cid) return reply(400, { error: "missing customer_id" });

    // שליפת כל ההזמנות של הלקוח – שומרים כל הזמנה בנפרד
    const orders = [];
    let lek;

    do {
      const out = await ddb.send(new QueryCommand({
        TableName: "preppal-orders-completed",
        KeyConditionExpression: "#cid = :cid",
        ExpressionAttributeNames: {
          "#cid": "customer_id",
          "#it": "items",      // alias כי items מילה שמורה
          "#oid": "order_id"
        },
        ExpressionAttributeValues: { ":cid": cid },
        ProjectionExpression: "#oid, #it",
        ExclusiveStartKey: lek
      }));

      if (out.Items?.length) {
        for (const o of out.Items) {
          const v = o.items; // DocumentClient כבר unmarshalled
          orders.push({
            order_id: o.order_id,
            items: Array.isArray(v) ? v : (v != null ? [v] : [])
          });
        }
      }
      lek = out.LastEvaluatedKey;
    } while (lek);


    return reply(200, { customer_id: cid, orders });

  } catch (err) {
    console.error(err);
    return reply(500, { error: "server_error", details: String(err) });
  }
};

function reply(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,x-customer-id",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(bodyObj)
  };
}
