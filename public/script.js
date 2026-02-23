// Global stocks array
let allStocks = [];
let currentSort = { column: 'addedDate', direction: 'desc' }; // Default sort: newest first

// Load stocks on page load
document.addEventListener('DOMContentLoaded', () => {
  loadStocks();
  setupSortingHandlers();
  setupModalHandlers();
  // Mark the default sorted column as active
  const addedHeader = document.querySelector('th[data-sort="addedDate"]');
  if (addedHeader) {
    addedHeader.classList.add('active');
  }
});

// Modal handlers
function setupModalHandlers() {
  const modal = document.getElementById('addStockModal');
  const openBtn = document.getElementById('openAddStockBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  
  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('accessCode').focus();
  });
  
  const closeModal = () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  };
  
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  
  // Close modal when clicking outside the content
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Close modal on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeModal();
    }
  });
}

function setupSortingHandlers() {
  document.querySelectorAll('th.sortable').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.sort;
      
      // Toggle direction if clicking the same column, otherwise default to descending
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = 'desc';
      }
      
      // Update visual indicators
      document.querySelectorAll('th.sortable').forEach(h => h.classList.remove('active'));
      header.classList.add('active');
      
      // Re-apply filters with new sort order
      applyFilters();
    });
  });
}

// Handle add stock form
document.getElementById('addStockForm').addEventListener('submit', async (e) => {
    const modal = document.getElementById('addStockModal');
    e.preventDefault();

    const accessCode = document.getElementById('accessCode').value;
    const CORRECT_CODE = '2275';

    // Verify access code
    if (accessCode !== CORRECT_CODE) {
        showMessage('✗ Invalid access code. Please try again.', 'error', 'addStockMessage');
        document.getElementById('accessCode').focus();
        return;
    }

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
        suggestedBy: document.getElementById('recommenderName').value
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
            // Close modal after 1.5 seconds
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 1500);
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

// Auto-fetch stock price when ticker is entered
document.getElementById('stockTicker').addEventListener('blur', fetchStockPrice);

async function fetchStockPrice() {
  const ticker = document.getElementById('stockTicker').value.trim();
  const priceInput = document.getElementById('stockCurrentPrice');

  if (!ticker) return;

  // Show loading state
  priceInput.style.opacity = '0.6';
  priceInput.placeholder = 'Fetching...';

  try {
    const response = await fetch(`/api/stock-price/${ticker}`, { timeout: 8000 });
    const data = await response.json();

    if (response.ok && data.price) {
      priceInput.value = data.price;
      priceInput.style.opacity = '1';
      priceInput.style.borderColor = '#4CAF50';
      setTimeout(() => { priceInput.style.borderColor = ''; }, 2000);
      showMessage(`✓ Found: ${data.name} - $${data.price}`, 'success', 'addStockMessage');
    } else {
      priceInput.style.opacity = '1';
      priceInput.placeholder = 'Enter price manually';
      showMessage(`⚠ Could not auto-fetch. Enter price manually.`, 'warning', 'addStockMessage');
    }
  } catch (error) {
    priceInput.style.opacity = '1';
    priceInput.placeholder = 'Enter price manually';
    console.log('Stock price auto-fetch unavailable - enter manually');
  }
}

async function loadStocks() {
    try {
        const response = await fetch('/api/stocks');
        allStocks = await response.json();
        applyFilters();
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

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aVal = a[currentSort.column];
      let bVal = b[currentSort.column];

      // Handle date sorting
      if (currentSort.column === 'addedDate' || currentSort.column === 'alertDate') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      // Handle numeric sorting
      if (currentSort.column === 'currentPrice' || currentSort.column === 'entry' || 
          currentSort.column === 'priceTarget' || currentSort.column === 'returnPercent') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      // Handle string sorting
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (currentSort.direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

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
    const tbody = document.getElementById('stocksTableBody');
    const countSpan = document.getElementById('stockCount');
    
    if (!stocks || stocks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty">No recommendations found.</td></tr>';
        countSpan.textContent = '';
        return;
    }

    countSpan.textContent = `(${stocks.length})`;

    tbody.innerHTML = stocks.map(stock => {
        const isOpen = stock.status && stock.status.toLowerCase() === 'open';
        const returnVal = stock.returnPercent ? parseFloat(stock.returnPercent) : 0;
        const returnClass = returnVal > 0 ? 'positive' : returnVal < 0 ? 'negative' : '';
        
        return `
            <tr class="stock-row ${isOpen ? 'open' : 'closed'}">
                <td class="date-cell">${formatDate(stock.addedDate || stock.alertDate)}</td>
                <td class="ticker-cell"><strong>${escapeHtml(stock.ticker)}</strong></td>
                <td class="type-cell">${escapeHtml(stock.type || '-')}</td>
                <td class="status-cell">
                    <span class="status-badge ${isOpen ? 'open' : 'closed'}">
                        ${escapeHtml(stock.status || '-')}
                    </span>
                </td>
                <td class="price-cell">${stock.currentPrice ? '$' + formatNumber(stock.currentPrice) : '-'}</td>
                <td class="price-cell">${stock.entry ? '$' + formatNumber(stock.entry) : '-'}</td>
                <td class="price-cell">${stock.priceTarget ? '$' + formatNumber(stock.priceTarget) : '-'}</td>
                <td class="return-cell ${returnClass}" title="Return percentage">${stock.returnPercent ? formatNumber(stock.returnPercent) + '%' : '-'}</td>
                <td class="name-cell">${escapeHtml(stock.suggestedBy || '-')}</td>
                <td class="notes-cell" title="${escapeHtml(stock.exitNotes || '')}">
                    ${stock.exitNotes ? escapeHtml(stock.exitNotes.substring(0, 40)) + (stock.exitNotes.length > 40 ? '...' : '') : '-'}
                </td>
            </tr>
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
