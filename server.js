const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, 'stocks.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ storage });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Ensure stocks.json exists
const STOCKS_FILE = path.join(__dirname, 'data', 'stocks.json');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(STOCKS_FILE)) {
  fs.writeFileSync(STOCKS_FILE, JSON.stringify([], null, 2));
}

// Routes

// Get all stocks
app.get('/api/stocks', (req, res) => {
  try {
    const stocks = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf8'));
    res.json(stocks);
  } catch (error) {
    res.json([]);
  }
});

// Upload stocks from Excel/CSV
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const allStocks = [];
    const filePath = path.join('uploads', req.file.filename);

    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    
    // Process each sheet
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      data.forEach((row) => {
        // Get ticker/symbol
        const ticker = row.Ticker || row.ticker || row.Symbol || row.symbol || '';
        
        if (!ticker || ticker === '') return; // Skip empty rows

        // Convert Excel date serial number to readable date
        let alertDate = row['Alert Date'] || row['Entry Date'] || '';
        if (typeof alertDate === 'number') {
          const date = new Date((alertDate - 25569) * 86400 * 1000);
          alertDate = date.toLocaleDateString();
        }

        const stock = {
          sheet: sheetName,
          ticker: String(ticker).trim(),
          type: row.Type || row.type || 'Stock',
          alertDate: alertDate,
          addedDate: new Date().toISOString(),
          currentPrice: row['Current Price'] || row['current price'] || '',
          entry: row['Entry (Alert)'] || row['Entry'] || row['entry'] || '',
          returnSinceEntry: row['% since Entry'] || row['% Change'] || '',
          priceTarget: row['PT'] || row['Price Target'] || row['target'] || '',
          exitNotes: row['Exit Notes'] || row['exit notes'] || '',
          status: row['Status'] || row['status'] || 'Open',
          returnPercent: row['Return %'] || row['Return'] || '',
          suggestedBy: row['Suggested By'] || row['suggested by'] || row['Author'] || ''
        };

        // Ensure required fields are not undefined
        Object.keys(stock).forEach(key => {
          if (stock[key] === undefined) {
            stock[key] = '';
          }
        });

        allStocks.push(stock);
      });
    });

    // Save to stocks.json
    fs.writeFileSync(STOCKS_FILE, JSON.stringify(allStocks, null, 2));
    
    res.json({ 
      success: true, 
      message: `Successfully uploaded ${allStocks.length} stocks and options`,
      stocks: allStocks,
      total: allStocks.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error parsing file: ' + error.message });
  }
});

// Add a new stock manually
app.post('/api/add-stock', (req, res) => {
  try {
    const { ticker, type, currentPrice, entry, priceTarget, status, exitNotes } = req.body;

    // Validate ticker
    if (!ticker || ticker.trim() === '') {
      return res.status(400).json({ error: 'Ticker is required' });
    }

    // Read existing stocks
    const stocks = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf8'));

    // Create new stock object
    const newStock = {
      sheet: 'Manual Entry',
      ticker: String(ticker).trim().toUpperCase(),
      type: type || 'Stock',
      alertDate: new Date().toLocaleDateString(),
      addedDate: new Date().toISOString(),
      currentPrice: currentPrice || '',
      entry: entry || '',
      returnSinceEntry: '',
      priceTarget: priceTarget || '',
      exitNotes: exitNotes || '',
      status: status || 'Open',
      returnPercent: '',
      suggestedBy: 'User'
    };

    // Add to stocks array
    stocks.push(newStock);

    // Save to file
    fs.writeFileSync(STOCKS_FILE, JSON.stringify(stocks, null, 2));

    res.json({ 
      success: true, 
      message: 'Stock added successfully',
      stock: newStock
    });
  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({ error: 'Error adding stock: ' + error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Access from other computers using your machine's IP address`);
  console.log(`✓ You can find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)\n`);
});
