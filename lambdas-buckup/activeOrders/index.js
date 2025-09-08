// index.mjs  (ESM)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

const TABLE = "Orders";
const GSI_BY_CUSTOMER = process.env.GSI_BY_CUSTOMER || "gsi_customer_id";

// נחזיר תמיד רק pending
const DESIRED_STATUS = "pending";

export const handler = async (event) => {
  // ---- CORS / Preflight ----
  if (event?.httpMethod === "OPTIONS" || event?.requestContext?.http?.method === "OPTIONS") {
    return cors(200, { ok: true });
  }

  try {
    const qs = event?.queryStringParameters || {};
    const customerId =
      qs.customer_id ?? qs.customerId ??
      event?.pathParameters?.customer_id ?? event?.pathParameters?.customerId ?? null;

    if (!customerId) {
      return resp(400, { error: "missing customer_id" });
    }

    try {
      const orders = await queryByCustomerId(customerId);
      return resp(200, onlyPending(customerId, orders));
    } catch (e) {
      console.warn("GSI query failed, falling back to Scan:", e?.message || String(e));
      const orders = await scanByCustomerId(customerId);
      return resp(200, { ...onlyPending(customerId, orders), fallback: "scan" });
    }
  } catch (err) {
    console.error(err);
    return resp(500, { error: "server_error", details: String(err) });
  }
};

async function queryByCustomerId(customerId) {
  const orders = [];
  let lek;

  do {
    const params = {
      TableName: TABLE,
      IndexName: GSI_BY_CUSTOMER,
      KeyConditionExpression: "#cid = :cid",
      ExpressionAttributeNames: { "#cid": "customer_id", "#st": "status" },
      ExpressionAttributeValues: { ":cid": customerId, ":s": DESIRED_STATUS },
      FilterExpression: "#st = :s",
      ExclusiveStartKey: lek,
    };

    const out = await ddb.send(new QueryCommand(params));
    if (out.Items?.length) {
      for (const o of out.Items) orders.push(normalizeOrder(o));
    }
    lek = out.LastEvaluatedKey;
  } while (lek);

  return orders;
}

async function scanByCustomerId(customerId) {
  const orders = [];
  let lek;

  do {
    const params = {
      TableName: TABLE,
      FilterExpression: "#cid = :cid AND #st = :s",
      ExpressionAttributeNames: { "#cid": "customer_id", "#st": "status" },
      ExpressionAttributeValues: { ":cid": customerId, ":s": DESIRED_STATUS },
      ExclusiveStartKey: lek,
    };

    const out = await ddb.send(new ScanCommand(params));
    if (out.Items?.length) {
      for (const o of out.Items) orders.push(normalizeOrder(o));
    }
    lek = out.LastEvaluatedKey;
  } while (lek);

  return orders;
}

// סינון הגנתי נוסף לפני ההחזרה – למקרה שסטטוס יופיע באותיות גדולות/שגוי
function onlyPending(customerId, orders) {
  const filtered = (orders || []).filter(
    (o) => String(o.status || "").toLowerCase() === DESIRED_STATUS
  );
  return { customer_id: customerId, count: filtered.length, orders: filtered };
}

function normalizeOrder(o) {
  const items = Array.isArray(o.items) ? o.items : (o.items != null ? [o.items] : []);
  return {
    order_id: o.order_id ?? o.order_num ?? o.id,
    store_id: o.store_id,
    status: o.status,
    total_price: o.total_price,
    items,
  };
}

function resp(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function cors(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyObj),
  };
}
