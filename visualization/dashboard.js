// Dashboard JavaScript for Log Analysis Visualization
class LogAnalysisDashboard {
    constructor() {
        this.data = {
            statusCounts: [],
            topIPs: [],
            topURLs: []
        };
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.loadAnalysisData(); // Load actual data immediately
    }

    setupEventListeners() {
        document.getElementById('loadData').addEventListener('click', () => this.loadAnalysisData());
        document.getElementById('refreshData').addEventListener('click', () => this.refreshData());
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.table-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all buttons and panels
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Add active class to clicked button and corresponding panel
                button.classList.add('active');
                document.getElementById(`${targetTab}Table`).classList.add('active');
            });
        });
    }

    updateStatus(message, isError = false) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.style.background = isError ? 'rgba(244, 67, 54, 0.2)' : 'rgba(76, 175, 80, 0.2)';
    }

    async loadAnalysisData() {
        this.updateStatus('Loading analysis data...');
        
        try {
            // Initialize data loader and attempt to load actual data
            const dataLoader = new DataLoader();
            const actualData = await dataLoader.autoLoadData();
            
            if (actualData && this.validateLoadedData(actualData)) {
                this.data.statusCounts = actualData.statusCounts || [];
                this.data.topIPs = actualData.topIPs || [];
                this.data.topURLs = actualData.topURLs || [];

                // Show loading info
                const loadingInfo = dataLoader.getLoadingInfo();
                console.log('Data loading info:', loadingInfo);

                const hasStatus = Array.isArray(this.data.statusCounts) && this.data.statusCounts.length > 0;
                const hasIPs = Array.isArray(this.data.topIPs) && this.data.topIPs.length > 0;
                const hasURLs = Array.isArray(this.data.topURLs) && this.data.topURLs.length > 0;

                const loaded = [hasStatus ? 'status_counts' : null, hasIPs ? 'top_ips' : null, hasURLs ? 'top_urls' : null].filter(Boolean).join(', ');
                const missing = [!hasStatus ? 'status_counts' : null, !hasIPs ? 'top_ips' : null, !hasURLs ? 'top_urls' : null].filter(Boolean).join(', ');

                const detail = `Loaded: ${loaded || 'none'}${missing ? ` | Missing: ${missing}` : ''}`;
                this.updateStatus(`Analysis data loaded. ${detail}`);
                this.renderDashboard();
            } else {
                throw new Error('Invalid or incomplete data structure');
            }
        } catch (error) {
            console.error('Failed to load analysis data:', error);
            this.updateStatus(`Failed to load data: ${error.message}. Please ensure the data files are accessible.`, true);
            this.showDataLoadingHelp();
        }
    }

    /**
     * Validate that loaded data has the expected structure
     */
    validateLoadedData(data) {
        if (!data || typeof data !== 'object') return false;
        const hasStatus = Array.isArray(data.statusCounts) && data.statusCounts.length > 0;
        const hasIPs = Array.isArray(data.topIPs) && data.topIPs.length > 0;
        const hasURLs = Array.isArray(data.topURLs) && data.topURLs.length > 0;
        // Consider valid if at least one dataset is present with items
        return hasStatus || hasIPs || hasURLs;
    }

    /**
     * Show help message when data loading fails
     */
    showDataLoadingHelp() {
        const helpMessage = `
            <div style="padding: 20px; background: rgba(255, 193, 7, 0.1); border-radius: 8px; margin: 20px;">
                <h3>Data Loading Help</h3>
                <p>To view the log analysis results:</p>
                <ol>
                    <li>Ensure you're running a local web server (not opening the file directly)</li>
                    <li>Make sure the data files exist in: <code>../data/log_analysis_output/</code></li>
                    <li>Check that the Spark analysis has completed successfully</li>
                </ol>
                <p>Expected file structure:</p>
                <ul>
                    <li><code>status_counts/part-*.json</code></li>
                    <li><code>top_ips/part-*.json</code></li>
                    <li><code>top_urls/part-*.json</code></li>
                </ul>
            </div>
        `;
        
        const container = document.querySelector('.dashboard-container');
        if (container) {
            container.innerHTML = helpMessage;
        }
    }

    // Removed loadJSONFile method - now handled by DataLoader class

    // Removed all sample data generation methods - now using only real data

    refreshData() {
        this.updateStatus('Refreshing data...');
        // Clear any cached data and reload
        this.data = {
            statusCounts: [],
            topIPs: [],
            topURLs: []
        };
        setTimeout(() => {
            this.loadAnalysisData();
        }, 500);
    }

    renderDashboard() {
        console.log('Rendering dashboard with data:', this.data);

        const hasStatus = Array.isArray(this.data.statusCounts) && this.data.statusCounts.length > 0;
        const hasIPs = Array.isArray(this.data.topIPs) && this.data.topIPs.length > 0;
        const hasURLs = Array.isArray(this.data.topURLs) && this.data.topURLs.length > 0;

        if (hasStatus) {
            this.renderStatusChart();
        } else {
            const statsDiv = document.getElementById('statusStats');
            if (statsDiv) statsDiv.innerHTML = '<div>No status data available.</div>';
            if (this.charts.statusChart) { this.charts.statusChart.destroy(); this.charts.statusChart = null; }
        }

        if (hasIPs) {
            this.renderIPChart();
        } else {
            const ipListDiv = document.getElementById('ipList');
            if (ipListDiv) ipListDiv.innerHTML = '<div>No IP data available.</div>';
            if (this.charts.ipChart) { this.charts.ipChart.destroy(); this.charts.ipChart = null; }
        }

        if (hasURLs) {
            this.renderURLChart();
        } else {
            const urlListDiv = document.getElementById('urlList');
            if (urlListDiv) urlListDiv.innerHTML = '<div>No URL data available.</div>';
            if (this.charts.urlChart) { this.charts.urlChart.destroy(); this.charts.urlChart = null; }
        }

        this.renderSummaryStats();
        this.renderDataTables();
    }

    renderStatusChart() {
        const ctx = document.getElementById('statusChart').getContext('2d');
        
        if (this.charts.statusChart) {
            this.charts.statusChart.destroy();
        }

        const statusColors = {
            '200': '#4CAF50',  // Success - Green
            '201': '#66BB6A',  // Created - Light Green
            '204': '#81C784',  // No Content - Lighter Green
            '301': '#2196F3',  // Moved Permanently - Blue
            '302': '#03A9F4',  // Found - Light Blue
            '304': '#00BCD4',  // Not Modified - Cyan
            '400': '#FF7043',  // Bad Request - Orange Red
            '401': '#FF5722',  // Unauthorized - Deep Orange
            '403': '#F44336',  // Forbidden - Red
            '404': '#FF9800',  // Not Found - Orange
            '405': '#FFC107',  // Method Not Allowed - Amber
            '408': '#FFB74D',  // Request Timeout - Light Orange
            '499': '#9E9E9E',  // Client Closed Request - Grey
            '500': '#9C27B0',  // Internal Server Error - Purple
            '502': '#673AB7',  // Bad Gateway - Deep Purple
            '503': '#3F51B5',  // Service Unavailable - Indigo
            '504': '#E91E63'   // Gateway Timeout - Pink
        };

        this.charts.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.data.statusCounts.map(item => `HTTP ${item.status}`),
                datasets: [{
                    data: this.data.statusCounts.map(item => item.count),
                    backgroundColor: this.data.statusCounts.map(item => 
                        statusColors[item.status] || '#607D8B'
                    ),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });

        // Update status stats
        const statsDiv = document.getElementById('statusStats');
        statsDiv.innerHTML = this.data.statusCounts.map(item => 
            `<div><span>HTTP ${item.status}</span><span>${item.count.toLocaleString()}</span></div>`
        ).join('');
    }

    renderIPChart() {
        const ctx = document.getElementById('ipChart').getContext('2d');
        
        if (this.charts.ipChart) {
            this.charts.ipChart.destroy();
        }

        const topIPs = this.data.topIPs.slice(0, 10);

        this.charts.ipChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topIPs.map(item => item.ip),
                datasets: [{
                    label: 'Requests',
                    data: topIPs.map(item => item.count),
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Update IP list
        const ipListDiv = document.getElementById('ipList');
        ipListDiv.innerHTML = topIPs.slice(0, 5).map(item => 
            `<div><span>${item.ip}</span><span>${item.count.toLocaleString()}</span></div>`
        ).join('');
    }

    renderURLChart() {
        const ctx = document.getElementById('urlChart').getContext('2d');
        
        if (this.charts.urlChart) {
            this.charts.urlChart.destroy();
        }

        const topURLs = this.data.topURLs.slice(0, 10);

        this.charts.urlChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topURLs.map(item => item.url.length > 20 ? 
                    item.url.substring(0, 20) + '...' : item.url),
                datasets: [{
                    label: 'Requests',
                    data: topURLs.map(item => item.count),
                    backgroundColor: 'rgba(118, 75, 162, 0.8)',
                    borderColor: 'rgba(118, 75, 162, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Update URL list
        const urlListDiv = document.getElementById('urlList');
        if (urlListDiv && topURLs.length > 0) {
            urlListDiv.innerHTML = topURLs.slice(0, 5).map(item => 
                `<div><span>${item.url}</span><span>${item.count.toLocaleString()}</span></div>`
            ).join('');
        } else {
            console.error('URL list div not found or no URL data:', urlListDiv, topURLs);
        }
    }

    renderSummaryStats() {
        console.log('Rendering summary stats with data:', this.data);
        
        const totalRequests = this.data.statusCounts.reduce((sum, item) => sum + item.count, 0);
        const uniqueIPs = this.data.topIPs.length;
        const uniqueURLs = this.data.topURLs.length;
        
        // Calculate error rate (4xx and 5xx status codes)
        const errorRequests = this.data.statusCounts
            .filter(item => {
                const statusCode = String(item.status);
                return statusCode.startsWith('4') || statusCode.startsWith('5');
            })
            .reduce((sum, item) => sum + item.count, 0);
        const errorRate = totalRequests > 0 ? ((errorRequests / totalRequests) * 100).toFixed(2) : 0;

        const totalRequestsEl = document.getElementById('totalRequests');
        const uniqueIPsEl = document.getElementById('uniqueIPs');
        const uniqueURLsEl = document.getElementById('uniqueURLs');
        const errorRateEl = document.getElementById('errorRate');

        if (totalRequestsEl) totalRequestsEl.textContent = totalRequests.toLocaleString();
        if (uniqueIPsEl) uniqueIPsEl.textContent = uniqueIPs.toLocaleString();
        if (uniqueURLsEl) uniqueURLsEl.textContent = uniqueURLs.toLocaleString();
        if (errorRateEl) errorRateEl.textContent = `${errorRate}%`;
        
        console.log('Summary stats updated:', {totalRequests, uniqueIPs, uniqueURLs, errorRate});
    }

    renderDataTables() {
        console.log('Rendering data tables...');
        const hasStatus = Array.isArray(this.data.statusCounts) && this.data.statusCounts.length > 0;
        const hasIPs = Array.isArray(this.data.topIPs) && this.data.topIPs.length > 0;
        const hasURLs = Array.isArray(this.data.topURLs) && this.data.topURLs.length > 0;

        if (hasStatus) {
            this.renderStatusTable();
        } else {
            const tableDiv = document.getElementById('statusTable');
            if (tableDiv) tableDiv.innerHTML = '<div class="empty">No status data available.</div>';
        }

        if (hasIPs) {
            this.renderIPsTable();
        } else {
            const tableDiv = document.getElementById('ipsTable');
            if (tableDiv) tableDiv.innerHTML = '<div class="empty">No IP data available.</div>';
        }

        if (hasURLs) {
            this.renderURLsTable();
        } else {
            const tableDiv = document.getElementById('urlsTable');
            if (tableDiv) tableDiv.innerHTML = '<div class="empty">No URL data available.</div>';
        }
    }

    renderStatusTable() {
        const tableDiv = document.getElementById('statusTable');
        const table = this.createTable(
            ['Status Code', 'Description', 'Count', 'Percentage'],
            this.data.statusCounts.map(item => {
                const total = this.data.statusCounts.reduce((sum, s) => sum + s.count, 0);
                const percentage = ((item.count / total) * 100).toFixed(2);
                const description = this.getStatusDescription(item.status);
                return [item.status, description, item.count.toLocaleString(), `${percentage}%`];
            })
        );
        tableDiv.innerHTML = '';
        tableDiv.appendChild(table);
    }

    renderIPsTable() {
        const tableDiv = document.getElementById('ipsTable');
        const table = this.createTable(
            ['Rank', 'IP Address', 'Requests', 'Percentage'],
            this.data.topIPs.map((item, index) => {
                const total = this.data.topIPs.reduce((sum, ip) => sum + ip.count, 0);
                const percentage = ((item.count / total) * 100).toFixed(2);
                return [index + 1, item.ip, item.count.toLocaleString(), `${percentage}%`];
            })
        );
        tableDiv.innerHTML = '';
        tableDiv.appendChild(table);
    }

    renderURLsTable() {
        const tableDiv = document.getElementById('urlsTable');
        if (!tableDiv) {
            console.error('URLs table div not found');
            return;
        }
        
        console.log('Rendering URLs table with data:', this.data.topURLs);
        
        const table = this.createTable(
            ['Rank', 'URL', 'Requests', 'Percentage'],
            this.data.topURLs.map((item, index) => {
                const total = this.data.topURLs.reduce((sum, url) => sum + url.count, 0);
                const percentage = ((item.count / total) * 100).toFixed(2);
                return [index + 1, item.url, item.count.toLocaleString(), `${percentage}%`];
            })
        );
        tableDiv.innerHTML = '';
        tableDiv.appendChild(table);
    }

    createTable(headers, rows) {
        const table = document.createElement('table');
        table.className = 'data-table';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        rows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        return table;
    }

    getStatusDescription(status) {
        const descriptions = {
            '200': 'OK - Success',
            '301': 'Moved Permanently',
            '302': 'Found (Temporary Redirect)',
            '400': 'Bad Request',
            '401': 'Unauthorized',
            '403': 'Forbidden',
            '404': 'Not Found',
            '500': 'Internal Server Error',
            '502': 'Bad Gateway',
            '503': 'Service Unavailable'
        };
        return descriptions[status] || 'Unknown Status';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LogAnalysisDashboard();
});
