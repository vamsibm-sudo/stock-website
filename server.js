const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const https = require('https');
const fetch = require('node-fetch');

// Alpha Vantage API Key
const ALPHA_VANTAGE_KEY = 'J899S26VIHFWYS80';

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
const STOCKS_TEMPLATE = path.join(__dirname, 'data', 'stocks.template.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

if (!fs.existsSync(STOCKS_FILE)) {
  // If template exists, use it; otherwise create empty array
  if (fs.existsSync(STOCKS_TEMPLATE)) {
    fs.copyFileSync(STOCKS_TEMPLATE, STOCKS_FILE);
  } else {
    fs.writeFileSync(STOCKS_FILE, JSON.stringify([], null, 2));
  }
}

// Routes

// Get all stocks
app.get('/api/stocks', (req, res) => {
  try {
    const fileContent = fs.readFileSync(STOCKS_FILE, 'utf8');
    const stocks = JSON.parse(fileContent);
    res.json(stocks);
  } catch (error) {
    console.error('Error loading stocks:', error.message);
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

// Update stock exit value and close position
app.post('/api/update-exit', (req, res) => {
  try {
    const { ticker, exitValue, exitNotes } = req.body;

    if (!ticker || !exitValue) {
      return res.status(400).json({ error: 'Ticker and exit value are required' });
    }

    // Read existing stocks
    const stocks = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf8'));
    
    // Find the stock
    const stockIndex = stocks.findIndex(s => s.ticker.toUpperCase() === ticker.toUpperCase());
    
    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const stock = stocks[stockIndex];
    const entryPrice = parseFloat(stock.entry) || 0;
    const exitVal = parseFloat(exitValue);

    // Calculate return percentage
    let returnPercent = '';
    if (entryPrice > 0) {
      returnPercent = (((exitVal - entryPrice) / entryPrice) * 100).toFixed(2);
    }

    // Update stock
    stock.exitValue = exitVal;
    stock.exitNotes = exitNotes || '';
    stock.returnPercent = returnPercent;
    stock.status = 'Closed';
    stock.exitedDate = new Date().toISOString();

    // Save to file
    fs.writeFileSync(STOCKS_FILE, JSON.stringify(stocks, null, 2));

    res.json({ 
      success: true, 
      message: 'Stock exit recorded successfully',
      stock: stock,
      returnPercent: returnPercent
    });
  } catch (error) {
    console.error('Update exit error:', error);
    res.status(500).json({ error: 'Error updating exit: ' + error.message });
  }
});

// Edit stock endpoint
app.post('/api/edit-stock', (req, res) => {
  try {
    const { ticker, type, status, currentPrice, entry, priceTarget, exitNotes } = req.body;

    if (!ticker) {
      return res.status(400).json({ error: 'Ticker is required' });
    }

    // Read existing stocks
    const stocks = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf8'));
    
    // Find the stock
    const stockIndex = stocks.findIndex(s => s.ticker.toUpperCase() === ticker.toUpperCase());
    
    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const stock = stocks[stockIndex];
    
    // Update fields if provided
    if (type) stock.type = type;
    if (status) stock.status = status;
    if (currentPrice) stock.currentPrice = currentPrice;
    if (entry) stock.entry = entry;
    if (priceTarget) stock.priceTarget = priceTarget;
    if (exitNotes !== undefined) stock.exitNotes = exitNotes;

    // Save to file
    fs.writeFileSync(STOCKS_FILE, JSON.stringify(stocks, null, 2));

    res.json({
      success: true,
      message: 'Stock updated successfully',
      stock: stock
    });
  } catch (error) {
    console.error('Edit stock error:', error);
    res.status(500).json({ error: 'Error updating stock: ' + error.message });
  }
});

// Delete stock endpoint
app.post('/api/delete-stock', (req, res) => {
  try {
    const { ticker } = req.body;

    if (!ticker) {
      return res.status(400).json({ error: 'Ticker is required' });
    }

    // Read existing stocks
    const stocks = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf8'));
    
    // Find and remove the stock
    const stockIndex = stocks.findIndex(s => s.ticker.toUpperCase() === ticker.toUpperCase());
    
    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    stocks.splice(stockIndex, 1);

    // Save to file
    fs.writeFileSync(STOCKS_FILE, JSON.stringify(stocks, null, 2));

    res.json({
      success: true,
      message: 'Stock deleted successfully'
    });
  } catch (error) {
    console.error('Delete stock error:', error);
    res.status(500).json({ error: 'Error deleting stock: ' + error.message });
  }
});

// Helper function to fetch stock price from Yahoo Finance
// Helper function to fetch stock price from Alpha Vantage
async function fetchStockPriceFromAlphaVantage(ticker) {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    // Check for API error or invalid response
    if (data.Note || data['Error Message']) {
      throw new Error(data.Note || data['Error Message']);
    }

    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      const quote = data['Global Quote'];
      return {
        price: parseFloat(quote['05. price']),
        currency: 'USD',
        name: ticker,
        timestamp: new Date().toISOString()
      };
    }

    throw new Error('No quote data in response');
  } catch (error) {
    console.log(`Alpha Vantage price fetch failed for ${ticker}: ${error.message}`);
    throw error;
  }
}

// Get stock price from Alpha Vantage
app.get('/api/stock-price/:ticker', async (req, res) => {
  try {
    const ticker = String(req.params.ticker).trim().toUpperCase();

    if (!ticker) {
      return res.status(400).json({ error: 'Ticker is required' });
    }

    const priceData = await fetchStockPriceFromAlphaVantage(ticker);
    res.json({
      ticker: ticker,
      price: priceData.price,
      currency: priceData.currency,
      name: priceData.name,
      timestamp: priceData.timestamp
    });
  } catch (error) {
    console.error('Stock price fetch error for', req.params.ticker, ':', error.message);
    res.status(400).json({ error: `Failed to fetch price for ${req.params.ticker}. Try a different ticker or check the symbol.` });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// Start server
app.listen(PORT, () => {
  // Log initialization status
  const stocksCount = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf8')).length;
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Loaded ${stocksCount} stocks from data storage`);
  console.log(`✓ New stocks you add will be saved persistently`);
  console.log(`✓ Access from other computers using your machine's IP address`);
  console.log(`✓ You can find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)\n`);
});
