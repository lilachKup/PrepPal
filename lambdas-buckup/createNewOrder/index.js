const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const responseWithCORS = (statusCode, bodyObj) => ({
        statusCode,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        body: JSON.stringify(bodyObj)
      });
    
    try {
        const {storeId, customerName, customerLocation, totalPrice, customerMail,items} = JSON.parse(event.body);
        const orderNum = `${randomUUID()}`;

        const orderParams = {
            TableName: "Orders",
            Item: {
                store_id: storeId,
                order_num: orderNum,
                customer_mail: customerMail,
                customer_name: customerName,
                customer_Location: customerLocation,
                total_price: totalPrice,
                items
            }
        }
        await docClient.send(new PutCommand(orderParams));
        return responseWithCORS(200, 
             orderParams.Item
          );

    } catch (err) {
        console.error("Error adding order:", err);
        return responseWithCORS(404, { error: err.message });
    }
}