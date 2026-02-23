# Stock Recommendations Website

A simple web application to display and manage recommended stocks. Run it locally and access it from any device on your network!

## Features

✓ Upload stock recommendations via Excel file (.xlsx, .xls)  
✓ Display stocks in an attractive card layout  
✓ Access from any device on your network remotely  
✓ Responsive design for mobile and desktop  
✓ Easy-to-use interface  

## Quick Start

### 1. Install Dependencies

Open PowerShell in the Website folder and run:

```bash
npm install
```

This will install Express, Multer, and XLSX (Excel reader).

### 2. Start the Server

```bash
npm start
```

You should see:
```
✓ Server running on http://localhost:3000
✓ Access from other computers using your machine's IP address
```

### 3. Access the Website

- **Local access**: http://localhost:3000
- **From other computers**: http://<YOUR_MACHINE_IP>:3000

To find your machine's IP:
- Open PowerShell and run: `ipconfig`
- Look for "IPv4 Address" under your network adapter (usually something like 192.168.x.x or 10.x.x.x)

## Excel File Format

Your stock list Excel file should have these columns:

| Symbol | Name | Reason | Price | TargetPrice | Rating |
|--------|------|--------|-------|-------------|--------|
| AAPL | Apple Inc. | Strong ecosystem | 150.25 | 165.00 | Buy |
| MSFT | Microsoft | Cloud leader | 380.50 | 410.00 | Strong Buy |

**Required Column:**
- `Symbol` - Stock ticker symbol (required, others are optional)

**Optional Columns:**
- `Name` - Company name
- `Reason` - Why you recommend it
- `Price` - Current price
- `TargetPrice` (or `Target Price`) - Target price
- `Rating` - Your rating (Buy, Hold, Sell, etc.)

**File format:** Save as `.xlsx` or `.xls` files

You can create this easily in Excel, Google Sheets, or any spreadsheet application.

## How to Use

1. Start the server (see Quick Start above)
2. Open http://localhost:3000 in your browser
3. Click "Upload Excel" and select your stock list Excel file (.xlsx or .xls)
4. The stocks will appear instantly on the page
5. Share your machine's IP with others so they can access it remotely

## Remote Access

### Option 1: Local Network (Easiest)
Simply share your machine's IP address with others on the same network:
```
http://<YOUR_IP>:3000
```

### Option 2: Internet Access (ngrok)
For access from outside your network, use ngrok:

1. Download ngrok from https://ngrok.com/
2. In PowerShell, run the server with ngrok:
```bash
ngrok http 3000
```
3. ngrok will give you a public URL to share

### Option 3: Port Forwarding
Forward port 3000 on your router to your machine's internal IP (requires router access)

## Project Structure

```
Website/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── sample_stocks.csv      # Example CSV file
├── public/
│   ├── index.html        # Main HTML page
│   ├── style.css         # Styling
│   └── script.js         # JavaScript for interactions
├── data/
│   └── stocks.json       # Stored stocks (auto-created)
└── uploads/              # Uploaded CSV files (auto-created)
```

## Troubleshooting

### Port already in use
If port 3000 is already in use, set a different port:
```bash
$env:PORT=3001; npm start
```

### Excel not uploading
- Ensure your Excel file has the required "Symbol" column
- Check that the file is saved as `.xlsx` or `.xls` format
- Try renaming the column headers to match exactly: Symbol, Name, Reason, Price, TargetPrice, Rating
- Check browser console for error messages (press F12)

### Can't access from another computer
- Verify both computers are on the same network
- Check Windows Firewall is not blocking Node.js
- Try with your machine's IP address (not localhost)
- Run `ipconfig` to confirm your IP address

## Future Enhancements

- Add authentication
- Store stocks in a database
- Add edit/delete functionality
- Add categories or watchlists
- Add stock price updates
- Add notifications

## License

Free to use and modify!
