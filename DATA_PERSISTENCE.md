# Stock History Persistence Guide

## How Stock Data is Maintained

Your stock recommendations are automatically saved to `data/stocks.json`. This file is committed to GitHub, so your data persists across:
- Server restarts
- Cloud deployments (Railway)
- Application updates

## How It Works

1. **Initial Data**: All existing stocks are stored in `data/stocks.json`
2. **New Stocks**: When you add a new stock via the form, it's automatically appended to `data/stocks.json`
3. **Persistence**: This file is committed to your GitHub repository, so data never gets lost

## To Update GitHub with Latest Stock Data

Since you don't have Git installed locally, use GitHub's web interface:

### Method 1: Auto-sync via Command Line (if Git gets installed)
```bash
cd c:\Code\BB\Website
git add data/stocks.json
git commit -m "Update stock history"
git push
```

### Method 2: Manual GitHub Web Interface
1. Go to https://github.com/vamsibm-sudo/stock-website
2. Navigate to `data/stocks.json`
3. Click ✏️ (Edit)
4. Paste the contents from your local `c:\Code\BB\Website\data\stocks.json`
5. Click "Commit changes"
6. Railway will auto-deploy within 30 seconds

### Method 3: Copy-Paste Updated Data
After adding stocks locally, follow Method 2 above to sync the latest `data/stocks.json` to GitHub.

## File Structure

```
Website/
├── data/
│   └── stocks.json          ← Your persistent stock data
├── public/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── server.js
└── package.json
```

## Stock Data Format

Each stock object contains:
- `ticker`: Stock symbol (e.g., "AAPL")
- `type`: "Stock" or "Option"
- `currentPrice`: Current trading price
- `entry`: Entry price when recommendation was made
- `priceTarget`: Target price
- `status`: "Open" or "Closed"
- `exitNotes`: Your notes
- `addedDate`: When added (ISO format, for filtering)
- `alertDate`: When alert was created
- `suggestedBy`: Who suggested it
- `sheet`: Source (for uploaded files) or "Manual Entry"

## Backup Your Data

To backup your stock data:
1. Download `data/stocks.json` from your GitHub repo
2. Save it to a safe location
3. You can restore by uploading it back if needed
