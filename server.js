import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';

const app = express();
dotenv.config();
const PORT = process.env.PORT || 3000;


// Middleware to capture the raw body before JSON parsing
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString(); // Save raw body as a string for HMAC verification
  }
}));

function verifyShopifyWebhook(req, res, next){

    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    // generate signature from server using secret
    const generatedHash = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET).update(req.rawBody, 'utf8').digest('base64');

    if(hmacHeader === generatedHash){

        return next(); // confirming valid webhook
    } else {

        return res.status(401).send('Unauthorized - Invalid HMAC signature'); // Invalid webhook
    }
}

app.post('/shopify-order-webhook', verifyShopifyWebhook, async (req, res) => {
    try{
    const orderData = req.body;
    // console.log('Received order data from Shopify:', orderData); // Log the received order data

    // Extract necessary information from Shopify order data
    const orderId = orderData.id;
    const orderNumber = orderData.order_number;
    const customerName = `${orderData.customer.first_name} ${orderData.customer.last_name}`;
    const customerEmail = orderData.customer.email;
    const lineItems = orderData.line_items.map(item => ({
        name: item.title,
        quantity: item.quantity,
        unitPrice: item.price
    }));
    const totalPrice = orderData.current_subtotal_price;

    console.log("Order ID: ", orderId);
    console.log("Order Number: ", orderNumber);
    console.log("Customer Name: ", customerName);
    console.log("Email: ", customerEmail);
    console.log("Line Items: ", lineItems);
    console.log("Total Price: ", totalPrice);

    await axios.post('http://10.0.0.3:3000/print', {
        orderId,
        customerName,
        lineItems,
        totalPrice
    });

    res.status(200).send('Order received and print job sent');
    console.log("Success");
    } catch (error) {
        console.error('Error processing Shopify order: ', error);
        res.status(500).send('Internal server error');
    }
    // Format data for Clover POS
    // const cloverOrderData = {
    //     items: lineItems.map(item => ({
    //         name: item.name,
    //         price: Math.round(parseFloat(item.price) * 100), // Clover API expects price in cents
    //         quantity: item.quantity,
    //     })),
    //     customer: {
    //         email: customerEmail,
    //         firstName: orderData.customer.first_name,
    //         lastName: orderData.customer.last_name,
    //     },
    //     order: {
    //         id: orderId,
    //         total: Math.round(parseFloat(totalPrice) * 100),
    //     }
    // };
    // try {
    //      // Send formatted order data to Clover POS
    //      await axios.post('https://api.clover.com/v3/merchants/{merchantId}/orders', cloverOrderData, {
    //         headers: {
    //             'Authorization': 'Bearer {your_clover_api_token}',
    //             'Content-Type': 'application/json'
    //         }
    //     });

    //     res.status(200).send('Order sent to Clover');
    // } catch (error) {
    //     console.error('Error sending order to Clover:', error);
    //     res.status(500).send('Failed to send order to Clover');
    // }
});

app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
})