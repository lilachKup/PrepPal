const express = require('express');
const app = express();
const productRoutes = require('./routes/products');
const storeRoutes = require('./routes/stores');
const serverless = require("serverless-http");

app.use(express.json());
app.use('/api/products', productRoutes);
app.use('/api/stores', storeRoutes);

/*app.listen(3000, () => {
    console.log('Server is running on port 3000');
});*/
module.exports.handler = serverless(app);