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
  const cancelUploadBtn = document.getElementById('cancelUploadBtn');
  
  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('accessCode').focus();
  });
  
  const closeModal = () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    // Reset forms and messages
    document.getElementById('addStockForm').reset();
    document.getElementById('uploadStockForm').reset();
    document.getElementById('addStockMessage').textContent = '';
    document.getElementById('uploadMessage').textContent = '';
    // Reset to single stock tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-tab="single"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    document.getElementById('addStockForm').style.display = 'block';
  };
  
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  cancelUploadBtn.addEventListener('click', closeModal);
  
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

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Update active button
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update visible content
      document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
      document.getElementById(tabName === 'single' ? 'addStockForm' : 'uploadStockForm').style.display = 'block';
      
      // Focus first input
      if (tabName === 'single') {
        document.getElementById('accessCode').focus();
      } else {
        document.getElementById('uploadAccessCode').focus();
      }
    });
  });

  // Exit Value Modal handlers
  const exitModal = document.getElementById('exitValueModal');
  const closeExitBtn = document.getElementById('closeExitModalBtn');
  const cancelExitBtn = document.getElementById('cancelExitBtn');

  const closeExitModal = () => {
    exitModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('exitValueForm').reset();
    document.getElementById('exitMessage').textContent = '';
    document.getElementById('exitReturnPreview').textContent = 'Enter exit value to see return';
  };

  closeExitBtn.addEventListener('click', closeExitModal);
  cancelExitBtn.addEventListener('click', closeExitModal);

  // Close exit modal on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && exitModal.style.display === 'flex') {
      closeExitModal();
    }
  });

  // Close on outside click
  exitModal.addEventListener('click', (e) => {
    if (e.target === exitModal) {
      closeExitModal();
    }
  });

  // Real-time return calculation preview
  document.getElementById('exitPrice').addEventListener('input', () => {
    const exitPrice = parseFloat(document.getElementById('exitPrice').value) || 0;
    const entryPrice = parseFloat(document.getElementById('exitEntryPrice').value) || 0;
    
    if (entryPrice > 0 && exitPrice > 0) {
      const returnPercent = (((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2);
      const returnClass = returnPercent >= 0 ? 'positive' : 'negative';
      document.getElementById('exitReturnPreview').innerHTML = `
        <span class="${returnClass}">
          ${exitPrice > entryPrice ? '✓' : '✗'} From $${entryPrice.toFixed(2)} → $${exitPrice.toFixed(2)} = ${returnPercent}%
        </span>
      `;
    }
  });

  // Edit Stock Modal handlers
  const editModal = document.getElementById('editStockModal');
  const closeEditBtn = document.getElementById('closeEditModalBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  const closeEditModal = () => {
    editModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('editStockForm').reset();
    document.getElementById('editMessage').textContent = '';
  };

  closeEditBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  // Close edit modal on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editModal.style.display === 'flex') {
      closeEditModal();
    }
  });

  // Close on outside click
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
  });

  // Edit form submission
  document.getElementById('editStockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveStockEdit();
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
            populateUserFilter();
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

// Handle upload form
document.getElementById('uploadStockForm').addEventListener('submit', async (e) => {
    const modal = document.getElementById('addStockModal');
    e.preventDefault();

    const accessCode = document.getElementById('uploadAccessCode').value;
    const CORRECT_CODE = '2275';

    // Verify access code
    if (accessCode !== CORRECT_CODE) {
        showMessage('✗ Invalid access code. Please try again.', 'error', 'uploadMessage');
        document.getElementById('uploadAccessCode').focus();
        return;
    }

    const fileInput = document.getElementById('stockFile');
    const file = fileInput.files[0];

    if (!file) {
        showMessage('✗ Please select a file to upload.', 'error', 'uploadMessage');
        return;
    }

    // Show uploading state
    showMessage('📤 Uploading and processing file...', 'info', 'uploadMessage');
    
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`✓ Successfully uploaded ${data.total} stocks!`, 'success', 'uploadMessage');
            document.getElementById('uploadStockForm').reset();
            allStocks = data.stocks || [];
            populateUserFilter();
            applyFilters();
            
            // Close modal after 2 seconds
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 2000);
        } else {
            showMessage(`✗ Error: ${data.error}`, 'error', 'uploadMessage');
        }
    } catch (error) {
        showMessage(`✗ Upload failed: ${error.message}`, 'error', 'uploadMessage');
    }
});

// Handle exit value form
document.getElementById('exitValueForm').addEventListener('submit', async (e) => {
    const exitModal = document.getElementById('exitValueModal');
    e.preventDefault();

    const ticker = document.getElementById('exitStockTicker').value;
    const exitPrice = document.getElementById('exitPrice').value;
    const exitNotes = document.getElementById('exitNotes').value;

    if (!ticker || !exitPrice) {
        showMessage('✗ Please enter exit value', 'error', 'exitMessage');
        return;
    }

    try {
        const response = await fetch('/api/update-exit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ticker, exitValue: exitPrice, exitNotes })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`✓ Exit recorded! Return: ${data.returnPercent}%`, 'success', 'exitMessage');
            
            // Update the stocks array
            const stockIndex = allStocks.findIndex(s => s.ticker === ticker);
            if (stockIndex !== -1) {
                allStocks[stockIndex] = data.stock;
            }
            
            // Refresh display
            applyFilters();
            
            // Close modal after 2 seconds
            setTimeout(() => {
                exitModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 2000);
        } else {
            showMessage(`✗ Error: ${data.error}`, 'error', 'exitMessage');
        }
    } catch (error) {
        showMessage(`✗ Error: ${error.message}`, 'error', 'exitMessage');
    }
});

// Global function to open exit modal
window.openExitModal = function(ticker, currentPrice, entryPrice) {
  const exitModal = document.getElementById('exitValueModal');
  document.getElementById('exitStockTicker').value = ticker;
  document.getElementById('exitCurrentPrice').value = currentPrice;
  document.getElementById('exitEntryPrice').value = entryPrice;
  document.getElementById('exitPrice').value = '';
  document.getElementById('exitNotes').value = '';
  document.getElementById('exitMessage').textContent = '';
  document.getElementById('exitReturnPreview').textContent = 'Enter exit value to see return';
  exitModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('exitPrice').focus();
};

// Inline exit value editing
window.makeExitEditable = function(cell, ticker, entryPrice) {
  // Prevent multiple edit instances
  if (cell.querySelector('.exit-input')) return;
  
  const exitDisplay = cell.querySelector('.exit-display');
  const currentValue = exitDisplay.textContent.replace('$', '').replace('(click to enter)', '').trim();
  
  // Replace display with input
  const inputHTML = `
    <input type="number" class="exit-input" value="${currentValue || ''}" 
           placeholder="Enter exit price" step="0.01"
           onblur="saveExitValue(this, '${ticker}', ${entryPrice})"
           onkeypress="if(event.key === 'Enter') saveExitValue(this, '${ticker}', ${entryPrice})">
  `;
  
  exitDisplay.style.display = 'none';
  cell.insertAdjacentHTML('beforeend', inputHTML);
  
  // Focus and select input
  const input = cell.querySelector('.exit-input');
  input.focus();
  input.select();
};

// Save exit value and update stock
window.saveExitValue = async function(inputElement, ticker, entryPrice) {
  const exitPrice = parseFloat(inputElement.value);
  const exitCell = inputElement.closest('.editable-exit');
  const exitDisplay = exitCell.querySelector('.exit-display');
  
  try {
    if (!exitPrice || exitPrice <= 0) {
      // Empty or invalid - just revert
      exitDisplay.style.display = '';
      inputElement.remove();
      return;
    }
    
    // Calculate return
    let returnPercent = '';
    if (entryPrice > 0) {
      returnPercent = (((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2);
    }
    
    // Call API to update exit
    const response = await fetch('/api/update-exit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ticker, 
        exitValue: exitPrice, 
        exitNotes: '' 
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update the display
      exitDisplay.textContent = '$' + formatNumber(exitPrice);
      exitDisplay.style.display = '';
      inputElement.remove();
      
      // Refresh the table to show updated status/return
      applyFilters();
      
      showMessage(`✓ Exit recorded at $${exitPrice.toFixed(2)} (Return: ${returnPercent}%)`, 'success', 'uploadMessage');
    } else {
      exitDisplay.style.display = '';
      inputElement.remove();
      showMessage(`✗ Error: ${data.error}`, 'error', 'uploadMessage');
    }
  } catch (error) {
    exitDisplay.style.display = '';
    inputElement.remove();
    showMessage(`✗ Error saving exit value`, 'error', 'uploadMessage');
  }
}

// Handle filtering and search
document.getElementById('typeFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('dateFilter').addEventListener('change', applyFilters);
document.getElementById('userFilter').addEventListener('change', applyFilters);
document.getElementById('searchInput').addEventListener('input', applyFilters);

// Auto-fetch stock price when ticker is entered
document.getElementById('stockTicker').addEventListener('blur', fetchStockPrice);

async function fetchStockPrice() {
  const ticker = document.getElementById('stockTicker').value.trim().toUpperCase();
  const priceInput = document.getElementById('stockCurrentPrice');

  if (!ticker) return;

  // Show loading state
  priceInput.style.opacity = '0.6';
  priceInput.placeholder = 'Fetching...';

  try {
    // Check cache first
    if (priceCache.has(ticker)) {
      const cached = priceCache.get(ticker);
      priceInput.value = cached.price;
      priceInput.style.opacity = '1';
      priceInput.style.borderColor = '#4CAF50';
      setTimeout(() => { priceInput.style.borderColor = ''; }, 2000);
      showMessage(`✓ Found: ${ticker} - $${cached.price} (from cache)`, 'success', 'addStockMessage');
      return;
    }
    
    // Try to fetch fresh price
    const response = await fetch(`/api/stock-price/${ticker}`, { timeout: 8000 });
    const data = await response.json();

    if (response.ok && data.price) {
      // Cache the price
      priceCache.set(ticker, {
        price: data.price,
        timestamp: new Date().toISOString()
      });
      savePriceCache();
      
      priceInput.value = data.price;
      priceInput.style.opacity = '1';
      priceInput.style.borderColor = '#4CAF50';
      setTimeout(() => { priceInput.style.borderColor = ''; }, 2000);
      showMessage(`✓ Found: ${data.name} - $${data.price}`, 'success', 'addStockMessage');
    } else {
      // API error - check if we have any cached data for this ticker from other sources
      priceInput.style.opacity = '1';
      priceInput.placeholder = 'Enter price manually';
      showMessage('⚠ Price fetch unavailable - please enter manually', 'warning', 'addStockMessage');
    }
  } catch (error) {
    // Network error - show friendly message
    priceInput.style.opacity = '1';
    priceInput.placeholder = 'Enter price manually';
    showMessage('⚠ Could not fetch price - please enter manually', 'warning', 'addStockMessage');
    console.log('Price fetch unavailable (optional - enter manually)');
  }
}

async function loadStocks() {
    try {
        const response = await fetch('/api/stocks');
        allStocks = await response.json();
        
        // Pre-populate price cache from saved data
        loadPriceCache();
        allStocks.forEach(stock => {
            if (stock.currentPrice && !priceCache.has(stock.ticker)) {
                priceCache.set(stock.ticker, {
                    price: parseFloat(stock.currentPrice),
                    timestamp: new Date().toISOString()
                });
            }
        });
        savePriceCache();
        
        populateUserFilter();
        applyFilters();
        
        // Auto-fetch current prices for all stocks in background (only for major US stocks)
        fetchAllStockPrices();
    } catch (error) {
        console.error('Error loading stocks:', error);
        showMessage('Error loading stocks', 'error', 'uploadMessage');
    }
}

// Populate user filter with unique users from stocks
function populateUserFilter() {
    const userFilter = document.getElementById('userFilter');
    const users = [...new Set(allStocks.map(stock => stock.suggestedBy).filter(Boolean))];
    users.sort();
    
    // Keep "All Users" option and add user options
    const currentValue = userFilter.value;
    userFilter.innerHTML = '<option value="">All Users</option>';
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        userFilter.appendChild(option);
    });
    
    // Restore previous selection if it still exists
    if (users.includes(currentValue)) {
        userFilter.value = currentValue;
    }
}

// Price cache with 24-hour expiration
const priceCache = new Map();

// Load cache from localStorage
function loadPriceCache() {
    try {
        const cached = localStorage.getItem('priceCache');
        if (cached) {
            const data = JSON.parse(cached);
            Object.entries(data).forEach(([ticker, item]) => {
                if (new Date() - new Date(item.timestamp) < 24 * 60 * 60 * 1000) {
                    priceCache.set(ticker, item);
                }
            });
        }
    } catch (e) {
        console.log('Could not load price cache');
    }
}

// Save cache to localStorage
function savePriceCache() {
    try {
        const cacheData = {};
        priceCache.forEach((value, key) => {
            cacheData[key] = value;
        });
        localStorage.setItem('priceCache', JSON.stringify(cacheData));
    } catch (e) {
        console.log('Could not save price cache');
    }
}

// Fetch current prices for all stocks and update display in real-time
async function fetchAllStockPrices() {
    loadPriceCache();
    
    // Alpha Vantage free tier: 25 requests per DAY - be very conservative
    // Only fetch prices for major US stocks that we haven't cached yet
    const usStocks = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'META', 'AMZN', 'NVDA', 'AMD'];
    let fetchCount = 0;
    
    for (const ticker of usStocks) {
        // Check if we already have a cached price
        if (priceCache.has(ticker)) {
            const cached = priceCache.get(ticker);
            if (new Date() - new Date(cached.timestamp) < 24 * 60 * 60 * 1000) {
                // Use cached price if still valid (less than 24 hours old)
                const stock = allStocks.find(s => s.ticker === ticker);
                if (stock) {
                    stock.currentPrice = cached.price;
                    updatePriceInTable(ticker, cached.price);
                }
                continue;
            }
        }
        
        // Only fetch max 3 stocks per session to stay under daily limit
        if (fetchCount >= 3) break;
        
        try {
            const response = await fetch(`/api/stock-price/${ticker}`);
            const data = await response.json();
            
            if (response.ok && data.price) {
                // Cache the price
                priceCache.set(ticker, {
                    price: data.price,
                    timestamp: new Date().toISOString()
                });
                savePriceCache();
                
                // Find and update the stock in allStocks
                const index = allStocks.findIndex(s => s.ticker === ticker);
                if (index !== -1) {
                    allStocks[index].currentPrice = data.price;
                    updatePriceInTable(ticker, data.price);
                }
                
                fetchCount++;
            }
        } catch (error) {
            console.log(`Could not fetch price for ${ticker}`);
        }
        
        // Only 1 request per 30 seconds to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    // Don't schedule another fetch - use cached prices for the day
}

// Update a specific stock price in the table
function updatePriceInTable(ticker, price) {
    const row = document.querySelector(`tr[data-ticker="${ticker}"]`);
    if (row) {
        const priceCell = row.querySelector('.price-cell-current');
        if (priceCell) {
            priceCell.textContent = '$' + formatNumber(price);
            // Flash animation to show update
            priceCell.style.backgroundColor = '#fff3cd';
            setTimeout(() => {
                priceCell.style.backgroundColor = '';
            }, 1000);
        }
    }
}

function applyFilters() {
    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const dateFilter = document.getElementById('dateFilter').value;
    const userFilter = document.getElementById('userFilter').value;

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

    if (userFilter) {
        filtered = filtered.filter(stock => stock.suggestedBy === userFilter);
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
        tbody.innerHTML = '<tr><td colspan="12" class="empty">No recommendations found.</td></tr>';
        countSpan.textContent = '';
        return;
    }

    countSpan.textContent = `(${stocks.length})`;

    tbody.innerHTML = stocks.map(stock => {
        const isOpen = stock.status && stock.status.toLowerCase() === 'open';
        const returnVal = stock.returnPercent ? parseFloat(stock.returnPercent) : 0;
        const returnClass = returnVal > 0 ? 'positive' : returnVal < 0 ? 'negative' : '';
        
        // Make exit value editable for open stocks
        let exitValueCell = '';
        if (isOpen) {
            exitValueCell = `
                <td class="price-cell exit-cell editable-exit" onclick="makeExitEditable(this, '${stock.ticker}', '${stock.entry || 0}')">
                    <span class="exit-display">${stock.exitValue ? '$' + formatNumber(stock.exitValue) : '<em>(click to enter)</em>'}</span>
                    <input type="hidden" class="exit-ticker" value="${stock.ticker}">
                    <input type="hidden" class="exit-entry" value="${stock.entry || 0}">
                </td>
            `;
        } else {
            exitValueCell = `
                <td class="price-cell exit-cell">
                    ${stock.exitValue ? '$' + formatNumber(stock.exitValue) : '-'}
                </td>
            `;
        }
        
        return `
            <tr class="stock-row ${isOpen ? 'open' : 'closed'}" data-ticker="${stock.ticker}">
                <td class="date-cell">${formatDate(stock.addedDate || stock.alertDate)}</td>
                <td class="ticker-cell"><strong>${escapeHtml(stock.ticker)}</strong></td>
                <td class="type-cell">${escapeHtml(stock.type || '-')}</td>
                <td class="status-cell">
                    <span class="status-badge ${isOpen ? 'open' : 'closed'}">
                        ${escapeHtml(stock.status || '-')}
                    </span>
                </td>
                <td class="price-cell price-cell-current" data-ticker="${stock.ticker}">${stock.currentPrice ? '$' + formatNumber(stock.currentPrice) : '-'}</td>
                <td class="price-cell">${stock.entry ? '$' + formatNumber(stock.entry) : '-'}</td>
                <td class="price-cell">${stock.priceTarget ? '$' + formatNumber(stock.priceTarget) : '-'}</td>
                ${exitValueCell}
                <td class="return-cell ${returnClass}" title="Return percentage">${stock.returnPercent ? formatNumber(stock.returnPercent) + '%' : '-'}</td>
                <td class="name-cell">${escapeHtml(stock.suggestedBy || '-')}</td>
                <td class="notes-cell" title="${escapeHtml(stock.exitNotes || '')}">
                    ${stock.exitNotes ? escapeHtml(stock.exitNotes.substring(0, 40)) + (stock.exitNotes.length > 40 ? '...' : '') : '-'}
                </td>
                <td class="action-cell">
                    <button class="btn-edit" onclick="openEditModal('${stock.ticker}')">✏️ Edit</button>
                    <button class="btn-delete" onclick="deleteStock('${stock.ticker}')">🗑️ Delete</button>
                    ${isOpen ? `<button class="btn-record-exit" onclick="openExitModal('${stock.ticker}', '${stock.currentPrice || 0}', '${stock.entry || 0}')">Save ✓</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
    
    // After rendering, set up exit value editing functionality
    document.querySelectorAll('.editable-exit').forEach(cell => {
        // Cell is already set up to call makeExitEditable on click
    });
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

// Edit Stock Functions
function openEditModal(ticker) {
    const stock = allStocks.find(s => s.ticker === ticker);
    if (!stock) {
        showMessage('Stock not found', 'error', 'editMessage');
        return;
    }

    // Populate form with stock data
    document.getElementById('editStockTicker').value = stock.ticker;
    document.getElementById('editStockType').value = stock.type || '';
    document.getElementById('editStockStatus').value = stock.status || '';
    document.getElementById('editStockCurrentPrice').value = stock.currentPrice || '';
    document.getElementById('editStockEntry').value = stock.entry || '';
    document.getElementById('editStockTarget').value = stock.priceTarget || '';
    document.getElementById('editStockNotes').value = stock.exitNotes || '';

    // Open modal
    const editModal = document.getElementById('editStockModal');
    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('editStockType').focus();
}

async function saveStockEdit() {
    const ticker = document.getElementById('editStockTicker').value;
    const updatedStock = {
        ticker: ticker,
        type: document.getElementById('editStockType').value,
        status: document.getElementById('editStockStatus').value,
        currentPrice: document.getElementById('editStockCurrentPrice').value || '',
        entry: document.getElementById('editStockEntry').value || '',
        priceTarget: document.getElementById('editStockTarget').value || '',
        exitNotes: document.getElementById('editStockNotes').value || ''
    };

    try {
        const response = await fetch('/api/edit-stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedStock)
        });

        const data = await response.json();

        if (response.ok) {
            // Update in local array
            const stockIndex = allStocks.findIndex(s => s.ticker === ticker);
            if (stockIndex !== -1) {
                allStocks[stockIndex] = { ...allStocks[stockIndex], ...updatedStock };
            }
            
            showMessage('✓ Stock updated successfully!', 'success', 'editMessage');
            applyFilters();
            
            setTimeout(() => {
                document.getElementById('editStockModal').style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 1500);
        } else {
            showMessage(`✗ Error: ${data.error}`, 'error', 'editMessage');
        }
    } catch (error) {
        showMessage(`✗ Error: ${error.message}`, 'error', 'editMessage');
    }
}

async function deleteStock(ticker) {
    if (!confirm(`Are you sure you want to delete ${ticker}? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch('/api/delete-stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ticker })
        });

        const data = await response.json();

        if (response.ok) {
            // Remove from local array
            allStocks = allStocks.filter(s => s.ticker !== ticker);
            populateUserFilter();
            applyFilters();
            showMessage('✓ Stock deleted successfully!', 'success', 'uploadMessage');
        } else {
            showMessage(`✗ Error: ${data.error}`, 'error', 'uploadMessage');
        }
    } catch (error) {
        showMessage(`✗ Error: ${error.message}`, 'error', 'uploadMessage');
    }
}
