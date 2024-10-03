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

// Function to send print job to PrintNode
async function printOrder(orderDetails) {

    const apiKey = process.env.PRINTNODE_API_KEY;
    const printerId = process.env.PRINTER_ID;

    // Create receipt content
    const printContent = `
      Order ID: ${orderDetails.orderId}
      Customer: ${orderDetails.customerName}
      ------------------------------
      ${orderDetails.lineItems.map(item => `${item.quantity} x ${item.name} - $${item.unitPrice}`).join('\n')}
      ------------------------------
      Total: $${orderDetails.totalPrice}
    `;

    console.log("Printing content: ", printContent);
    console.log("Print order function confirmed");

    try {
      const response = await axios.post(
        'https://api.printnode.com/printjobs',
        {
          printer: printerId,
          title: `Order #${orderDetails.orderId}`,
          contentType: 'raw_base64',
          content: Buffer.from(printContent).toString('base64'),
          source: 'Shopify Order Webhook',
        },
        {
          auth: {
            username: apiKey,
            password: '', // No password needed, API key as username
          },
        }
      );
  
      console.log('Print job created:', response.data);
    } catch (error) {
      console.error('Error sending print job:', error.response ? error.response.data : error.message);
    }
  }

app.post('/shopify-order-webhook', verifyShopifyWebhook, async (req, res) => {
    try{
    const orderData = req.body;

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

    // Send order details to PrintNode for printing
    await printOrder({ orderId, customerName, lineItems, totalPrice });

    res.status(200).send('Order received and print job sent');
    console.log("Success");
    } catch (error) {
        console.error('Error processing Shopify order: ', error);
        res.status(500).send('Internal server error');
    }

});

app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
})