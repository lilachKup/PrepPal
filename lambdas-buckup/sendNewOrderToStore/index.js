const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const ordersTable = "Orders";
const connectionsTable = "connections";

exports.handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const newOrder = body.order;
    const storeId = newOrder.store_id;

    if (!storeId || !newOrder.order_num) {
      return { statusCode: 400, body: "Missing order_num or store_id" };
    }

    await docClient.send(new PutCommand({
      TableName: ordersTable,
      Item: newOrder
    }));

    console.log("✅ Order saved:", newOrder.order_num);

    const scanRes = await docClient.send(new ScanCommand({
      TableName: connectionsTable,
      FilterExpression: "store_id = :sid",
      ExpressionAttributeValues: {
        ":sid": storeId
      }
    }));

    if (!scanRes.Items || scanRes.Items.length === 0) {
      console.warn("⚠️ No active connections for store:", storeId);
      return { statusCode: 200, body: "Order saved, but no store connections found" };
    }

    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;

    const apigwClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${domain}/${stage}`
    });

    for (const conn of scanRes.Items) {
      const connectionId = conn.connectionId;

      try {
        await apigwClient.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            action: "newOrder",
            order: newOrder
          })
        }));
        console.log(`📤 Sent order to connection: ${connectionId}`);
      } catch (err) {
        console.warn(`❌ Failed to send to connection ${connectionId}:`, err.message);
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",  
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Order deleted" }),
    };
    

  } catch (error) {
    console.error("❌ Error in sendNewOrderToStore:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",  
        "Access-Control-Allow-Credentials": true,
      },
      body: "Failed to create and send order"
    };
  }
};
