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
    const printContent = `\x1B\x21\x00Order Number: #${orderDetails.orderNumber}\nOrder Received: ${orderDetails.createdAt}\nPick Up Day: ${orderDetails.pickupDay}\nPick Up Time: ${orderDetails.pickupTime}\nCustomer: ${orderDetails.customerName}\nPhone: ${orderDetails.customerPhone}\n------------------------------\n${orderDetails.lineItems.map(item => {
        // Pad the item name to ensure alignment
        const itemLine = `${item.quantity} x ${item.name} - $${item.unitPrice}\n`;

        // Print each add-on indented under the main product
        const addOnLines = item.addOns.map(addOn => {
          return `   + ${addOn.quantity} x ${addOn.name} - $${addOn.unitPrice}\n`;
        }).join('');

        return itemLine + addOnLines;

    }).join('')}------------------------------\nNote: ${orderDetails.note}\nSubtotal: $${orderDetails.subtotal}\nDiscount: -$${orderDetails.discount}\nTip: $${orderDetails.tipReceived}\nTaxes: $${orderDetails.tax}\n------------------------------\nTotal: $${orderDetails.totalPrice}\n------------------------------\nPayment Method: ${orderDetails.paymentMethod}\nPaid: ${orderDetails.paid ? 'Yes' : 'No'}\n\n\n`;


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

    // date for receipt
    const date = new Date(orderData.created_at);
    const formattedDate = date.toLocaleString('en-US', {
      month: 'numeric',   // Full month name
      day: 'numeric',  // Day of the month
      year: 'numeric', // Year
      hour: 'numeric', // Hour
      minute: 'numeric', // Minutes
      hour12: true,     // 12-hour format (AM/PM)
      timeZone: 'America/Los_Angeles' // Set to Pacific Time (PST/PDT)
    });

    // Extract necessary information from Shopify order data
    const orderNumber = orderData.order_number;
    console.log("Order Data: ", orderData.note_attributes)
    const createdAt = formattedDate;
    const pickupTime = (orderData.note_attributes[6] && orderData.note_attributes[6].value !== undefined ) ? orderData.note_attributes[6].value : '';
    const pickupDay = (orderData.note_attributes[1] && orderData.note_attributes[1].value !== undefined ) ? orderData.note_attributes[1].value : '';
    console.log("Pick up day", pickupDay)
    const customerName = `${orderData.customer.first_name} ${orderData.customer.last_name}`;
    const customerEmail = orderData.customer.email;
    const customerPhone = orderData.customer.phone ? orderData.customer.phone : '';

    const lineItems = orderData.line_items.reduce((result, item) => {

        const properties = item.properties;

        // check if at least one element passes given test (returns true)
        const isMainProduct = properties.some(prop => prop.name === '_tpo_is_main_product' && prop.value === '1');

        // if main product, add to print result
        if(isMainProduct){
          const mainProduct = {
            name: item.title,
            quantity: item.quantity,
            unitPrice: item.price,
            addOns: [] // To store any add-ons that belong to this main product
          }

          // Store add-on keys belonging to main product
          const addOnKeys = properties.find(prop => prop.name === '_tpo_add_on_keys')?.value || '[]'; // JSON string of add-on keys. Ensure no error is thrown
          console.log("5")
          const parsedAddOnKeys = JSON.parse(addOnKeys);

          console.log("6")
          console.log('itemmm: ', item.properties)

          orderData.line_items.forEach(addOnItem => {
            const addOnProperties = addOnItem.properties;

            const addOnKey = addOnProperties.find(prop => prop.name === '_tpo_add_on_key')?.value;
            // console.log("ADDON: ", addOnProperties);
            // If the add-on belongs to the current main product, add it under the main product
            if (parsedAddOnKeys.includes(addOnKey)) {
              console.log("touch");
              mainProduct.addOns.push({
                name: addOnItem.title,
                quantity: addOnItem.quantity,
                unitPrice: addOnItem.price
              });
            }
          });

          result.push(mainProduct);
        }

        return result;
      }, []);
    
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
        orderNumber, customerName, customerPhone, createdAt, pickupDay, pickupTime, lineItems, note,
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


