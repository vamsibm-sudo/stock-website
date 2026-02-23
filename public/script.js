// Global stocks array
let allStocks = [];

// Load stocks on page load
document.addEventListener('DOMContentLoaded', loadStocks);

// Handle file upload
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('Please select a file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`✓ ${data.message}`, 'success');
            fileInput.value = '';
            allStocks = data.stocks || [];
            displayStocks(allStocks);
        } else {
            showMessage(`✗ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showMessage(`✗ Error: ${error.message}`, 'error');
    }
});

// Handle filtering
document.getElementById('typeFilter').addEventListener('change', filterStocks);
document.getElementById('statusFilter').addEventListener('change', filterStocks);

async function loadStocks() {
    try {
        const response = await fetch('/api/stocks');
        allStocks = await response.json();
        displayStocks(allStocks);
    } catch (error) {
        console.error('Error loading stocks:', error);
        showMessage('Error loading stocks', 'error');
    }
}

function filterStocks() {
    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let filtered = allStocks;

    if (typeFilter) {
        filtered = filtered.filter(stock => stock.type === typeFilter);
    }

    if (statusFilter) {
        filtered = filtered.filter(stock => stock.status === statusFilter);
    }

    displayStocks(filtered);
}

function displayStocks(stocks) {
    const container = document.getElementById('stocksContainer');
    const countSpan = document.getElementById('stockCount');
    
    if (!stocks || stocks.length === 0) {
        container.innerHTML = '<p class="empty">No recommendations added yet. Upload an Excel file to get started!</p>';
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
                        ${stock.alertDate ? `<div class="alert-date">📅 ${escapeHtml(stock.alertDate)}</div>` : ''}
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

function showMessage(text, type) {
    const messageDiv = document.getElementById('uploadMessage');
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
