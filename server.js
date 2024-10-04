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
    const printContent = 
    `Order Number: #${orderDetails.orderNumber}\nOrder Received: ${orderDetails.createdAt}\nPick up: ${orderDetails.pickup}\nCustomer: ${orderDetails.customerName}\nPhone: ${orderDetails.customerPhone}\n------------------------------\n${orderDetails.lineItems.map(item => {
        // Pad the item name to ensure alignment
        const itemLine = `${item.quantity} x ${item.name}`;
        const priceLine = ` - $${item.unitPrice}`;
        return `${itemLine}${priceLine}`;
      }).join('\n')}\n------------------------------\nNote: ${orderDetails.note}\nSubtotal: $${orderDetails.subtotal}\nDiscount: -$${orderDetails.discount}\nTip: $${orderDetails.tipReceived}\nTaxes: $${orderDetails.tax}\n------------------------------\nTotal: $${orderDetails.totalPrice}\n------------------------------\nPayment Method: ${orderDetails.paymentMethod}\nPaid: ${orderDetails.paid ? 'Yes' : 'No'}\n\n\n\n\n
    
    `;

    console.log("Printing content:", printContent);
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

    console.log("Order Data: ", orderData);
    // date for receipt
    const date = new Date(orderData.created_at);
    const formattedDate = date.toLocaleString('en-US', {
      month: 'long',   // Full month name
      day: 'numeric',  // Day of the month
      year: 'numeric', // Year
      hour: 'numeric', // Hour
      minute: 'numeric', // Minutes
      hour12: true,     // 12-hour format (AM/PM)
      timeZone: 'America/Los_Angeles' // Set to Pacific Time (PST/PDT)
    });

    // Extract necessary information from Shopify order data
    // const orderId = orderData.id;
    const orderNumber = orderData.order_number;
    const createdAt = formattedDate;
    // const pickup = orderData.note_attributes[6].value ? orderData.note_attributes[6].value : '';
    const customerName = `${orderData.customer.first_name} ${orderData.customer.last_name}`;
    const customerEmail = orderData.customer.email;
    const customerPhone = orderData.customer.phone ? orderData.customer.phone : '';

    const lineItems = orderData.line_items.map(item => ({
        name: item.title,
        quantity: item.quantity,
        unitPrice: item.price
    }));
    const note = orderData.note || '';
    const tipReceived = orderData.total_tip_received || '0.00';
    const discount = orderData.total_discounts || '0.00';
    const tax = orderData.total_tax || '0.00';
    const subtotal = orderData.current_subtotal_price;
    const totalPrice = orderData.total_price;
    const paymentMethod = orderData.payment_gateway_names.join(', ');
    const paid = orderData.financial_status === 'paid';

    // Send order details to PrintNode for printing
    await printOrder({ 
        orderNumber, customerName, customerPhone, createdAt, pickup, lineItems, note,
        subtotal, discount, tax, tipReceived, totalPrice,
        paymentMethod, paid 
    });

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