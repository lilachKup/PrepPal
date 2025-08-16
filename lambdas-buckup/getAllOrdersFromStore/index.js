const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const responseWithCORS = (statusCode, bodyObj) => ({
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        body: JSON.stringify(bodyObj)
    });

    try {
        const storeId = event.pathParameters?.store_id;

        if (!storeId) {
            return responseWithCORS(400, { error: "Missing store_id" });
        }

        const params = {
            TableName: "Orders", 
            KeyConditionExpression: "store_id = :store_id",
            ExpressionAttributeValues: {
                ":store_id": storeId
            }
        };

        const data = await docClient.send(new QueryCommand(params));

        console.log("Fetched orders:", JSON.stringify(data.Items));

        return responseWithCORS(200, {
            orders: data.Items
        });

    } catch (error) {
        console.error("❌ Error fetching orders:", error);
        return responseWithCORS(500, { error: "Failed to fetch orders" });
    }
};
