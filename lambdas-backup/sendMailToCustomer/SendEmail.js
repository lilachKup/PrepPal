const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "prepalsmartgrocery@gmail.com",       
      pass: "bvqt mtij ebqd fzit"           
    }
  });
  
const sendCustomerEmail = (customerMail, customerName, orderId, orderInfo) => {
    const mailOptions = {
        from: "prepalsmartgrocery@gmail.com",
        to: customerMail,
        subject: "Thank you for your order! Your order ID is: " + orderId,
        text: `${orderInfo}`
    };

    return transporter.sendMail(mailOptions);  
};

module.exports = sendCustomerEmail;
