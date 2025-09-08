import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const ordersTable = "Orders";

const responseWithCORS = (statusCode, bodyObj) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
  },
  body: JSON.stringify(bodyObj)
});

// helper למניעת תקיעות בבקשות חיצוניות (כולל פיענוח טקסט/JSON ולכידת timeout)
async function fetchWithTimeout(url, { timeoutMs = 8000, ...opts } = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, json, text };
  } finally {
    clearTimeout(id);
  }
}

export const handler = async (event /*, context*/) => {
  try {
    // CORS preflight
    if (event?.httpMethod === "OPTIONS") {
      return responseWithCORS(200, { message: "CORS preflight success" });
    }
    if (event?.httpMethod !== "POST") {
      return responseWithCORS(405, { message: "Method Not Allowed" });
    }

    const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});

    const storeId     = body.store_id;
    const orderId     = body.order_num;   // משמש אותנו ל-DB/מיילים בלבד
    const driverId    = body.driver_id;
    const driverEmail = body.driver_email;
    const price       = body.price;

    if (!storeId || !orderId || !driverId || !driverEmail) {
      return responseWithCORS(400, { message: "Missing store_id, order_num or driver_id or driver_email" });
    }
    if (price == null) {
      return responseWithCORS(400, { message: "Missing price" });
    }

    // ----- קריאה להזמנה לצורך ולידציה/מייל -----
    const getRes = await docClient.send(new GetCommand({
      TableName: ordersTable,
      Key: { store_id: storeId, order_num: orderId }
    }));

    if (!getRes.Item) {
      return responseWithCORS(404, { message: "Order not found" });
    }

    // ----- סכום לתשלום -----
    const amountRaw = (typeof price === "number")
      ? price
      : Number.parseFloat(String(price ?? "").replace(/,/g, ""));
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      return responseWithCORS(400, { message: "Invalid price" });
    }
    const amount = Math.round(amountRaw * 100) / 100;

    // ----- יצירת תשלום (לפי הדוגמה: deliver_email ברמה העליונה, ללא order_id/metadata) -----
    const paymentUrl = process.env.PAYMENT_API_URL
      || "https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/payment/create";

    const paymentPayload = {
      products: [{ name: "prepal order", price: amount, quantity: 1 }],
      currency: "ILS",
      store_id: storeId,
      deliver_email: driverEmail
    };

    console.log("→ creating payment", paymentPayload);
    const pay = await fetchWithTimeout(paymentUrl, {
      method: "POST",
      timeoutMs: 12000,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload)
    });

    if (!pay.ok) {
      console.error("❌ Payment create failed:", pay.status, pay.text);
      return responseWithCORS(502, {
        message: "Failed to create payment order",
        upstream_status: pay.status,
        upstream_body: pay.text
      });
    }

    const approvalUrl    = pay.json?.approval_url || null;
    const paymentOrderId = pay.json?.order_id || null;
    console.log("✓ payment created:", { approvalUrl, paymentOrderId });

    if (!approvalUrl || !paymentOrderId) {
      console.error("❌ Payment response missing approval_url/order_id:", pay.json);
      return responseWithCORS(502, { message: "Payment service bad response" });
    }

    // ----- מחיקה מהטבלה רק אחרי יצירת תשלום מוצלחת -----
    await docClient.send(new DeleteCommand({
      TableName: ordersTable,
      Key: { store_id: storeId, order_num: orderId }
    }));

    // ----- שליחת מייל ללקוח עם הקישור -----
    const mailEndpoint =
      "https://2h3yf1xica.execute-api.us-east-1.amazonaws.com/dev/mailToCustomer/infoCustomerAboutOrder";

    const customerMail =
      body.customerMail ??
      getRes.Item?.customer_mail ??
      getRes.Item?.customer_email ??
      null;

    const customerName =
      body.customerName ??
      getRes.Item?.customer_name ??
      getRes.Item?.customerName ??
      "";

    if (customerMail) {
      const orderInfo = [
        "prepal order",
        "quantity: 1",
        `price: ${amount} ILS`,
        "",
        `payment link: ${approvalUrl}`
      ].join("\n");

      console.log("→ sending email to customer", { customerMail, customerName });
      const mail = await fetchWithTimeout(mailEndpoint, {
        method: "POST",
        timeoutMs: 8000,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerMail,
          customerName,
          orderId: paymentOrderId,
          orderInfo
        })
      });

      console.log("📧 mailToCustomer status:", mail.status, mail.text);
      if (!mail.ok) {
        console.error("❌ mailToCustomer failed:", mail.status, mail.text);
      }
    } else {
      console.warn("⚠️ Missing customerMail – skipping customer email.");
    }

    return responseWithCORS(200, {
      message: `Order ${orderId} processed successfully.`,
      payment: {
        order_id: paymentOrderId,
        approval_url: approvalUrl
      }
    });

  } catch (err) {
    console.error("❌ Lambda error:", err);
    return responseWithCORS(500, { message: "Internal server error" });
  }
};
