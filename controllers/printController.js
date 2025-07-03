// In-memory queue for print jobs (for local testing)
// In a production environment, you'd use a database or a persistent message queue.
let printQueue = [];

// Controller to handle both print job requests and printing results
const getPrintJob = (req, res) => {
  const connectionType = req.body.ConnectionType;
  
  if (connectionType === 'GetRequest') {
    console.log("Received request for print job");
    if (printQueue.length > 0) {
      const jobPayload = printQueue.shift();
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
      console.log("No print job available for printer.");
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
  } else if (connectionType === 'SetResponse') {
    console.log("Received printing result from printer");
    const responseFile = req.body.ResponseFile;
    
    // Return empty response as per manual (page 50)
    res.set("Content-Type", "text/xml;charset=utf-8");
    res.status(200).send('');
  } else {
    console.log("Unknown ConnectionType:", connectionType);
    res.status(400).send('Unknown ConnectionType');
  }
};

const addTestPrintJob = (req, res) => {
    const testJobPayload = `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
<text>TEST PRINT&#10;</text>
<text>Hello World!&#10;</text>
<text>Time: ${new Date().toLocaleString()}&#10;</text>
<feed line="2"/>
<cut/>
</epos-print>`;

  printQueue.push(testJobPayload);
  console.log("Added test job to queue");
  res.status(201).send({
    message: "Test job added to queue",
    currentQueueSize: printQueue.length,
  });
};

// 🚀 NEW: Add order from restaurant management backend
const addOrderPrintJob = (req, res) => {
  try {
    const orderData = req.body;
    
    // Log the received order
    console.log(`📥 Received order #${orderData.commandNumber} from restaurant backend`);
    
    // Use the pre-formatted XML from restaurant backend if available
    let printJobPayload;
    if (orderData.printXml) {
      printJobPayload = orderData.printXml;
    } else {
      // Fallback: generate XML from order data
      printJobPayload = generateOrderPrintXml(orderData);
    }
    
    // Add to print queue
    printQueue.push(printJobPayload);
    
    console.log(`✅ Added order #${orderData.commandNumber} to print queue (position: ${printQueue.length})`);
    
    // Respond immediately to restaurant backend
    res.status(201).json({
      success: true,
      message: "Order queued for printing",
      orderId: orderData.orderId,
      commandNumber: orderData.commandNumber,
      queuePosition: printQueue.length
    });
    
  } catch (error) {
    console.error("Error adding order to print queue:", error);
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
