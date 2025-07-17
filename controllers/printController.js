// In-memory queue for print jobs, now structured by restaurant/printer ID.
// In a production environment, you'd use a database or a persistent message queue.
let printerQueues = {};

// Controller to handle both print job requests and printing results
const getPrintJob = (req, res) => {
  const { ConnectionType } = req.body; // ConnectionType is in the body
  const PrinterID = req.query.printerId; // PrinterID is now from the URL query parameter

  console.log(`[${new Date().toISOString()}] Received request: ConnectionType=${ConnectionType}, PrinterID=${PrinterID}`);

  if (ConnectionType === 'GetRequest') {
    if (!PrinterID) {
      console.log(`[${new Date().toISOString()}] GetRequest received without PrinterID. Sending no-job response.`);
      // To maintain compatibility or handle errors, you might send a default response
      // or an error. For now, we'll just log it and send a no-job response.
      const noJobXml = `<?xml version="1.0" encoding="utf-8"?><PrintRequestInfo><ePOSPrint><Parameter><devid>local_printer</devid><timeout>5000</timeout></Parameter><PrintData /></ePOSPrint></PrintRequestInfo>`;
      return res.set("Content-Type", "text/xml;charset=utf-8").status(400).send(noJobXml);
    }
    
    console.log(`[${new Date().toISOString()}] Checking for jobs for PrinterID: ${PrinterID}`);
    // Check if the specific queue for this printer exists and has jobs
    if (printerQueues[PrinterID] && printerQueues[PrinterID].length > 0) {
      const jobPayload = printerQueues[PrinterID].shift(); // Get job from the specific queue
      console.log(`[${new Date().toISOString()}] Sending job to PrinterID: ${PrinterID}. Jobs remaining: ${printerQueues[PrinterID].length}`);
      
      const fullResponseXml = `<?xml version="1.0" encoding="utf-8"?>
<PrintRequestInfo>
    <ePOSPrint>
        <Parameter>
            <devid>local_printer</devid>
            <timeout>5000</timeout>
        </Parameter>
        <PrintData>
            ${jobPayload}
        </PrintData>
    </ePOSPrint>
</PrintRequestInfo>`;

      res.set("Content-Type", "text/xml;charset=utf-8");
      res.status(200).send(fullResponseXml);
    } else {
      console.log(`[${new Date().toISOString()}] No jobs for PrinterID: ${PrinterID}. Sending no-job response.`);
      const noJobXml = `<?xml version="1.0" encoding="utf-8"?>
<PrintRequestInfo>
    <ePOSPrint>
        <Parameter>
            <devid>local_printer</devid>
            <timeout>5000</timeout>
        </Parameter>
        <PrintData />
    </ePOSPrint>
</PrintRequestInfo>`;
      res.set("Content-Type", "text/xml;charset=utf-8");
      res.status(200).send(noJobXml);
    }
  } else if (ConnectionType === 'SetResponse') {
    const responseFile = req.body.ResponseFile;
    console.log(`[${new Date().toISOString()}] Received SetResponse from printer. Response:`, responseFile);

    // Return empty response as per manual
    res.set("Content-Type", "text/xml;charset=utf-8");
    res.status(200).send('');
  } else if (ConnectionType === 'SetStatus') {
    // The printer sends status updates without the query parameter.
    console.log(`[${new Date().toISOString()}] Received SetStatus from printer.`);
    // We don't need the ID for this, just to acknowledge the request.
    // Acknowledge the status update with an empty success response as per docs
    res.set("Content-Type", "text/xml;charset=utf-8");
    res.status(200).send('');
  } else {
    console.error(`[${new Date().toISOString()}] Unknown ConnectionType:`, ConnectionType);
    res.status(400).send('Unknown ConnectionType');
  }
};

const addTestPrintJob = (req, res) => {
  const { restaurantId } = req.body; // Expect a restaurantId for testing
  if (!restaurantId) {
    return res.status(400).send({ message: "Please provide a 'restaurantId' for the test job." });
  }

  const testJobPayload = `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
<text>TEST PRINT FOR ${restaurantId.toUpperCase()}&#10;</text>
<text>Hello World!&#10;</text>
<text>Time: ${new Date().toLocaleString()}&#10;</text>
<feed line="2"/>
<cut/>
</epos-print>`;

  // Initialize queue if it doesn't exist
  if (!printerQueues[restaurantId]) {
    printerQueues[restaurantId] = [];
  }

  printerQueues[restaurantId].push(testJobPayload);
  res.status(201).send({
    message: `Test job added to queue for [${restaurantId}]`,
    currentQueueSize: printerQueues[restaurantId].length,
  });
};

// 🚀 NEW: Add order from restaurant management backend
const addOrderPrintJob = (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request to add order print job.`);
  try {
    const { restaurantId, ...orderData } = req.body; // Extract restaurantId from the body

    if (!restaurantId) {
      console.error(`[${new Date().toISOString()}] Error: No restaurantId provided with the order.`);
      return res.status(400).json({
        success: false,
        error: "Missing restaurantId",
        message: "A restaurantId must be provided to queue a print job."
      });
    }
    
    // Use the pre-formatted XML from restaurant backend if available
    let printJobPayload;
    if (orderData.printXml) {
      printJobPayload = orderData.printXml;
    } else {
      // Fallback: generate XML from order data
      printJobPayload = generateOrderPrintXml(orderData);
    }
    
    // Initialize the queue for the restaurant if it doesn't exist
    if (!printerQueues[restaurantId]) {
      printerQueues[restaurantId] = [];
    }
    
    // Add to the specific restaurant's print queue
    printerQueues[restaurantId].push(printJobPayload);
    
    const queuePosition = printerQueues[restaurantId].length;
    
    console.log(`[${new Date().toISOString()}] Order for restaurant ${restaurantId} added to queue. Queue size: ${queuePosition}`);
    
    // Respond immediately to restaurant backend
    res.status(201).json({
      success: true,
      message: "Order queued for printing",
      orderId: orderData.orderId,
      commandNumber: orderData.commandNumber,
      queuePosition: queuePosition
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error adding order to print queue:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to queue print job",
      message: error.message
    });
  }
};

// Generate XML from order data (fallback function)
function generateOrderPrintXml(orderData) {
  const items = orderData.items || [];
  
  const itemsXml = items.map(item => {
    let itemText = `<text>${item.plat.name} x${item.plat.count || 1}</text>
<text align="right">€${(item.plat.price * (item.plat.count || 1)).toFixed(2)}</text>`;
    
    // Add variation if exists
    if (item.variation) {
      itemText += `<text>  + ${item.variation.name}</text>
<text align="right">€${item.variation.price}</text>`;
    }
    
    // Add addons
    if (item.addons) {
      item.addons.forEach(addon => {
        itemText += `<text>  + ${addon.name} x${addon.count}</text>
<text align="right">€${(addon.price * addon.count).toFixed(2)}</text>`;
      });
    }
    
    // Add extras
    if (item.extras) {
      item.extras.forEach(extra => {
        itemText += `<text>  + ${extra.name} x${extra.count}</text>
<text align="right">€${(extra.price * extra.count).toFixed(2)}</text>`;
      });
    }
    
    return itemText;
  }).join('<feed line="1"/>');

  return `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
<text align="center" width="2" height="2">** COMMANDE #${orderData.commandNumber} **</text>
<feed line="1"/>
<text>Date: ${new Date(orderData.createdAt).toLocaleString('fr-FR')}</text>
<text>Client: ${orderData.customerName}</text>
<text>Mode: ${orderData.pack ? orderData.pack.label : 'N/A'}</text>
<text>Paiement: ${orderData.method ? orderData.method.label : 'N/A'}</text>
<feed line="1"/>
<text>--- ARTICLES ---</text>
<feed line="1"/>
${itemsXml}
<feed line="1"/>
<text>------------------------</text>
<text align="center" width="2" height="1">TOTAL: €${orderData.total.toFixed(2)}</text>
<feed line="2"/>
<cut/>
</epos-print>`;
}

module.exports = {
  getPrintJob,
  addTestPrintJob,
  addOrderPrintJob,
  // We can export the queue if needed for other modules, e.g., historyController
  // getPrintQueue: () => printQueue // Example
};
