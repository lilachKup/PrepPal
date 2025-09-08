const sendCustomerEmail = require('./SendEmail');

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",               
    "Access-Control-Allow-Headers": "Content-Type"   
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS preflight OK" })
    };
  }

  try {
    const { customerMail, customerName, orderId, orderInfo } = JSON.parse(event.body);

    await sendCustomerEmail(customerMail, customerName, orderId, orderInfo);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Email sent successfully!" })
    };
  } catch (err) {
    console.error("Error sending email:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to send email" })
    };
  }
};
