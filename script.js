// Global stocks array
let allStocks = [];

// Load stocks on page load
document.addEventListener('DOMContentLoaded', loadStocks);

// Handle add stock form
document.getElementById('addStockForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newStock = {
        ticker: document.getElementById('stockTicker').value,
        type: document.getElementById('stockType').value,
        currentPrice: document.getElementById('stockCurrentPrice').value || '',
        entry: document.getElementById('stockEntry').value || '',
        priceTarget: document.getElementById('stockTarget').value || '',
        status: document.getElementById('stockStatus').value,
        exitNotes: document.getElementById('stockNotes').value || '',
        alertDate: new Date().toLocaleDateString(),
        sheet: 'Manual Entry',
        suggestedBy: 'User'
    };

    try {
        const response = await fetch('/api/add-stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newStock)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('✓ Stock added successfully!', 'success', 'addStockMessage');
            document.getElementById('addStockForm').reset();
            allStocks.push(newStock);
            displayStocks(allStocks);
        } else {
            showMessage(`✗ Error: ${data.error}`, 'error', 'addStockMessage');
        }
    } catch (error) {
        showMessage(`✗ Error: ${error.message}`, 'error', 'addStockMessage');
    }
});

// Handle filtering and search
document.getElementById('typeFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('dateFilter').addEventListener('change', applyFilters);
document.getElementById('searchInput').addEventListener('input', applyFilters);

async function loadStocks() {
    try {
        const response = await fetch('/api/stocks');
        allStocks = await response.json();
        displayStocks(allStocks);
    } catch (error) {
        console.error('Error loading stocks:', error);
        showMessage('Error loading stocks', 'error', 'uploadMessage');
    }
}

function applyFilters() {
    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const dateFilter = document.getElementById('dateFilter').value;

    let filtered = allStocks;

    if (typeFilter) {
        filtered = filtered.filter(stock => stock.type === typeFilter);
    }

    if (statusFilter) {
        filtered = filtered.filter(stock => stock.status === statusFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(stock => {
            const ticker = String(stock.ticker).toLowerCase();
            const name = String(stock.name || '').toLowerCase();
            return ticker.includes(searchTerm) || name.includes(searchTerm);
        });
    }

    if (dateFilter) {
        const now = new Date();
        const filterDate = getFilterDate(dateFilter, now);
        
        filtered = filtered.filter(stock => {
            if (!stock.addedDate) return false;
            const stockDate = new Date(stock.addedDate);
            return stockDate >= filterDate;
        });
    }

    displayStocks(filtered);
}

function getFilterDate(filter, now) {
    const date = new Date(now);
    
    switch(filter) {
        case '24h':
            date.setHours(date.getHours() - 24);
            break;
        case '7d':
            date.setDate(date.getDate() - 7);
            break;
        case '30d':
            date.setMonth(date.getMonth() - 1);
            break;
        case '6m':
            date.setMonth(date.getMonth() - 6);
            break;
        case '1y':
            date.setFullYear(date.getFullYear() - 1);
            break;
        default:
            date.setFullYear(1900);
    }
    
    return date;
}

function displayStocks(stocks) {
    const container = document.getElementById('stocksContainer');
    const countSpan = document.getElementById('stockCount');
    
    if (!stocks || stocks.length === 0) {
        container.innerHTML = '<p class="empty">No recommendations found. Upload an Excel file or add a stock to get started!</p>';
        countSpan.textContent = '';
        return;
    }

    countSpan.textContent = `(${stocks.length})`;

    container.innerHTML = stocks.map(stock => {
        const isOption = stock.type && stock.type.toLowerCase() === 'option';
        const isOpen = stock.status && stock.status.toLowerCase() === 'open';
        
        // Format returns percentage
        let returnSinceEntry = stock.returnSinceEntry;
        let returnPercent = stock.returnPercent;
        
        if (typeof returnSinceEntry === 'number') {
            returnSinceEntry = (returnSinceEntry * 100).toFixed(2) + '%';
        }
        if (typeof returnPercent === 'number') {
            returnPercent = (returnPercent * 100).toFixed(2) + '%';
        }

        // Determine if return is positive or negative
        const returnClass = returnPercent && returnPercent.includes('-') ? 'negative' : 'positive';

        return `
            <div class="stock-card ${isOption ? 'option' : 'stock'}">
                <div class="stock-header">
                    <div>
                        <div class="stock-ticker">${escapeHtml(stock.ticker)}</div>
                        <span class="stock-type-badge ${isOption ? 'option' : 'stock'}">
                            ${isOption ? '📊 Option' : '📈 Stock'}
                        </span>
                        <span class="stock-status ${isOpen ? 'open' : 'closed'}">
                            ${escapeHtml(stock.status || 'Open')}
                        </span>
                    </div>
                </div>

                <div class="stock-details">
                    ${stock.currentPrice ? `
                        <div class="detail-item">
                            <div class="detail-label">Current Price</div>
                            <div class="detail-value">$${formatNumber(stock.currentPrice)}</div>
                        </div>
                    ` : ''}
                    
                    ${stock.entry ? `
                        <div class="detail-item">
                            <div class="detail-label">Entry Price</div>
                            <div class="detail-value">$${formatNumber(stock.entry)}</div>
                        </div>
                    ` : ''}
                    
                    ${stock.priceTarget ? `
                        <div class="detail-item">
                            <div class="detail-label">Price Target</div>
                            <div class="detail-value">$${formatNumber(stock.priceTarget)}</div>
                        </div>
                    ` : ''}
                    
                    ${returnSinceEntry ? `
                        <div class="detail-item">
                            <div class="detail-label">Return Since Entry</div>
                            <div class="detail-value ${returnClass}">${returnSinceEntry}</div>
                        </div>
                    ` : ''}
                    
                    ${returnPercent ? `
                        <div class="detail-item">
                            <div class="detail-label">Return %</div>
                            <div class="detail-value ${returnClass}">${returnPercent}</div>
                        </div>
                    ` : ''}
                </div>

                ${stock.exitNotes ? `
                    <div class="stock-notes">
                        <strong>Notes:</strong> ${escapeHtml(stock.exitNotes)}
                    </div>
                ` : ''}

                <div class="stock-footer">
                    <div>
                        ${stock.alertDate ? `<div class="alert-date">📅 Alert: ${escapeHtml(stock.alertDate)}</div>` : ''}
                        ${stock.addedDate ? `<div class="added-date">➕ Added: ${formatDate(stock.addedDate)}</div>` : ''}
                    </div>
                    ${stock.suggestedBy ? `
                        <div class="suggested-by">
                            By: ${escapeHtml(stock.suggestedBy)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function formatNumber(value) {
    if (!value) return '0';
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toFixed(2);
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showMessage(text, type, elementId) {
    const messageDiv = document.getElementById(elementId);
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.className = 'message';
        }, 5000);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
