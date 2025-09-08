const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const connectionsTable = "connections";
const ordersTable = "Orders";

exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;

    const apigwClient = new ApiGatewayManagementApiClient({
        endpoint: `https://${domain}/${stage}`
    });

    try {
        // 🧠 שלב 1: שלוף את ה-store_id מתוך connectionId
        const connRes = await docClient.send(new GetCommand({
            TableName: connectionsTable,
            Key: { connectionId }
        }));

        const storeId = connRes.Item?.store_id;

        if (!storeId) {
            throw new Error("Store ID not found for this connection.");
        }

        // 📦 שלב 2: בקשת ההזמנות לפי store_id
        const params = {
            TableName: ordersTable,
            KeyConditionExpression: "store_id = :store_id",
            ExpressionAttributeValues: {
                ":store_id": storeId
            }
        };

        const data = await docClient.send(new QueryCommand(params));

        await apigwClient.send(new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: JSON.stringify({
                action: "orderList",
                orders: data.Items
            })
        }));

        return { statusCode: 200 };
    } catch (error) {
        console.error("❌ Error fetching orders via WebSocket:", error);

        return {
            statusCode: 500,
            body: "Failed to fetch orders"
        };
    }
};
