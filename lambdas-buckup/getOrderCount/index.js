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
        // שלב 1: שלוף את store_id לפי connectionId
        const connRes = await docClient.send(new GetCommand({
            TableName: connectionsTable,
            Key: { connectionId }
        }));

        const storeId = connRes.Item?.store_id;

        if (!storeId) {
            throw new Error("Store ID not found for this connection.");
        }

        // שלב 2: בקשת כמות ההזמנות מהטבלה
        const result = await docClient.send(new QueryCommand({
            TableName: ordersTable,
            KeyConditionExpression: "store_id = :sid",
            ExpressionAttributeValues: {
                ":sid": storeId
            },
            Select: "COUNT"
        }));

        // שלב 3: שלח את מספר ההזמנות דרך WebSocket
        await apigwClient.send(new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: JSON.stringify({
                action: "orderCount",
                count: result.Count
            })
        }));

        return { statusCode: 200 };
    } catch (error) {
        console.error("❌ Error in getOrderCount:", error);
        return {
            statusCode: 500,
            body: "Failed to get order count"
        };
    }
};
