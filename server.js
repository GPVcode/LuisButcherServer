import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';

const app = express();
dotenv.config();
const PORT = process.env.PORT || 3000;

// const data = [
//   {
//     name: '#1 Natural Juice 16oz',
//     properties: '[\n' +
//       '  {\n' +
//       '    "name": "_tpo_main_product_id",\n' +
//       '    "value": "48780060688671"\n' +
//       '  },\n' +
//       '  {\n' +
//       '    "name": "_tpo_add_on_key",\n' +
//       '    "value": "ff090bcf-30ab-42fc-b557-f64847a5c7d1"\n' +
//       '  }\n' +
//       ']'
//   },
//   {
//     name: 'Extra Guacamole',
//     properties: '[\n' +
//       '  {\n' +
//       '    "name": "_tpo_main_product_id",\n' +
//       '    "value": "48780060688671"\n' +
//       '  },\n' +
//       '  {\n' +
//       '    "name": "_tpo_add_on_key",\n' +
//       '    "value": "c2851812-895d-4796-bfe6-0707d2437dba"\n' +
//       '  }\n' +
//       ']'
//   },
//   {
//     name: 'Green Salsa',
//     properties: '[\n' +
//       '  {\n' +
//       '    "name": "_tpo_main_product_id",\n' +
//       '    "value": "48780060688671"\n' +
//       '  },\n' +
//       '  {\n' +
//       '    "name": "_tpo_add_on_key",\n' +
//       '    "value": "b9b29955-8325-49fc-bcd6-f91cdea58cd2"\n' +
//       '  }\n' +
//       ']'
//   },
//   {
//     name: 'Brisket',
//     properties: '[\n' +
//       '  {\n' +
//       '    "name": "_tpo_main_product_id",\n' +
//       '    "value": "48780060688671"\n' +
//       '  },\n' +
//       '  {\n' +
//       '    "name": "_tpo_add_on_key",\n' +
//       '    "value": "3a60c642-3a4d-4df7-9d07-1c9e39321dfe"\n' +
//       '  }\n' +
//       ']'
//   },
//   {
//     name: 'Breakast Burrito',
//     properties: '[\n' +
//       '  {\n' +
//       '    "name": "_tpo_add_on_keys",\n' +
//       '    "value": "[\\"3a60c642-3a4d-4df7-9d07-1c9e39321dfe\\",\\"b9b29955-8325-49fc-bcd6-f91cdea58cd2\\",\\"c2851812-895d-4796-bfe6-0707d2437dba\\",\\"ff090bcf-30ab-42fc-b557-f64847a5c7d1\\"]"\n' +
//       '  },\n' +
//       '  {\n' +
//       '    "name": "_tpo_add_on_variant_ids",\n' +
//       '    "value": "[\\"49087357681951\\",\\"49085860380959\\",\\"49085834821919\\",\\"48839638352159\\"]"\n' +
//       '  },\n' +
//       '  {\n' +
//       '    "name": "Meat Options",\n' +
//       '    "value": "Upgrade to Brisket ( +$3.49 )"\n' +
//       '  },\n' +
//       '  {\n' +
//       '    "name": "Salsa",\n' +
//       '    "value": "Green Salsa (mild)"\n' +
//       '  },\n' +
//       '  {\n' +
//       '    "name": "Extra Toppings",\n' +
//       '    "value": "Guacamole ( +$2.00 )"\n' +
//       '  },\n' +
//       '  {\n' +
//       '    "name": "Drinks:",\n' +
//       '    "value": "#1 Natural Juice 16oz ( +$6.49 )"\n' +
//       '  },\n' +
//       '  {\n' +
//       '    "name": "_tpo_is_main_product",\n' +
//       '    "value": "1"\n' +
//       '  }\n' +
//       ']'
//   },
//   { name: 'Tip', properties: '[]' }
// ]

// // orderDetails -> line_items -> loop through properties for each product -> look for '_tpo_is_main_product' -> create print of add-ons within this main product

// // loop through line items X
//   // get order data.line_items
//   // loop through line_items array.
// // in each line_item index, loop thorugh products properties
// // confirm main product
// // create print
// // continue looping through line items

// // send line items data in our print middlewate
// const lineItems = orderData.line_items; // SOURCE FROMS HOPIFY WEBHOOK. Arrives to printer middelware as inside 'orderDetails' object package.

// // now we are in Printer function
// const orderLineItems = orderDetails.lineItems;
// // loop through line items and loop through properties
// const loopThroughItems = (orderLineItems) => {
//   // what do we do when we find the main product?
//   // loop through ine items,
//   for(let i = 0; i < orderLineItems.length; i++){
//     // confirm main product with a boolean function
//     if(isMainProduct(orderLineItems[i])){

//     }

//   }
// };


// // looping through product's properties to find '_tpo_is_main_product'
// const isMainProduct = (product) => {
//   for(let i = 0; i < product.length; i++){
//     if(product[i].properties === '_tpo_is_main_product')
//   }
// };

// ${orderDetails.lineItems.map(item => {
//   // through each item, 
//   // Pad the item name to ensure alignment
//   const itemLine = `${item.quantity} x ${item.name}`;
//   const priceLine = ` - $${item.unitPrice}`;
//   return `${itemLine}${priceLine}`;
// }).join('\n')}




// console.log("TEST: ", test(data))


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
    `Order Number: #${orderDetails.orderNumber}\nOrder Received: ${orderDetails.createdAt}\nPick Up Day: ${orderDetails.pickupDay}\nPick Up Time: ${orderDetails.pickupTime}\nCustomer: ${orderDetails.customerName}\nPhone: ${orderDetails.customerPhone}\n------------------------------\n${orderDetails.lineItems.map(item => {
        // Pad the item name to ensure alignment
        const itemLine = `${item.quantity} x ${item.name}`;
        const priceLine = ` - $${item.unitPrice}`;
        return `${itemLine}${priceLine}`;
      }).join('\n')}\n------------------------------\nNote: ${orderDetails.note}\nSubtotal: $${orderDetails.subtotal}\nDiscount: -$${orderDetails.discount}\nTip: $${orderDetails.tipReceived}\nTaxes: $${orderDetails.tax}\n------------------------------\nTotal: $${orderDetails.totalPrice}\n------------------------------\nPayment Method: ${orderDetails.paymentMethod}\nPaid: ${orderDetails.paid ? 'Yes' : 'No'}\n\n\n
    
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

    console.log("Examine Data!: " , orderData.line_items.map(item => ({
      name: item.title,
      properties: JSON.parse(item.properties, null, 2)
    })));

    console.log("Order Data: ", orderData);
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
    // const orderId = orderData.id;
    const orderNumber = orderData.order_number;
    const createdAt = formattedDate;
    const pickupTime = (orderData.note_attributes[6] && orderData.note_attributes[6].value !== undefined ) ? orderData.note_attributes[6].value : '';
    const pickupDay = (orderData.note_attributes[1] && orderData.note_attributes[1].value !== undefined ) ? orderData.note_attributes[1].value : '';
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


