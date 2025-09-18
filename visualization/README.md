# Log Analysis Dashboard

A modern, interactive web dashboard for visualizing Apache web server log analysis results from Hadoop/Spark processing.

## Features

- **Interactive Charts**: Visualize HTTP status codes, top IP addresses, and most accessed URLs
- **Real-time Data Loading**: Automatically loads analysis results from Spark output files
- **Responsive Design**: Works on desktop and mobile devices
- **Summary Statistics**: Key metrics including total requests, unique IPs, and error rates
- **Detailed Tables**: Sortable data tables with comprehensive information

## Files

- `index.html` - Main dashboard HTML file
- `styles.css` - Modern CSS styling with gradients and animations
- `dashboard.js` - Core dashboard functionality and chart rendering
- `data-loader.js` - Utility for loading Spark JSON output files

## Usage

### Option 1: Simple File Access
1. Open `index.html` in a web browser
2. Click "Load Analysis Data" to load sample data
3. The dashboard will display sample visualizations

### Option 2: With Web Server (Recommended)
1. Start a local web server in the visualization directory:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js
   npx serve .
   
   # PHP
   php -S localhost:8000
   ```
2. Open `http://localhost:8000` in your browser
3. Click "Load Analysis Data" to attempt loading actual analysis results

### Option 3: File System Access
1. Open the dashboard in a modern browser (Chrome/Edge)
2. Click "Load Analysis Data"
3. If prompted, select the project root directory to access actual data files

## Data Format

The dashboard expects Spark output in JSON Lines format:

**Status Counts** (`data/log_analysis_output/status_counts/part-*.json`):
```json
{"status":"200","count":15420}
{"status":"404","count":2341}
```

**Top IPs** (`data/log_analysis_output/top_ips/part-*.json`):
```json
{"ip":"192.168.1.100","count":1234}
{"ip":"10.0.0.15","count":987}
```

**Top URLs** (`data/log_analysis_output/top_urls/part-*.json`):
```json
{"url":"/index.html","count":3456}
{"url":"/api/users","count":2134}
```

## Charts and Visualizations

1. **HTTP Status Distribution**: Doughnut chart showing the proportion of different HTTP status codes
2. **Top IP Addresses**: Bar chart displaying the most active IP addresses
3. **Most Accessed URLs**: Horizontal bar chart of popular endpoints
4. **Summary Statistics**: Key performance indicators and metrics

## Browser Compatibility

- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Dependencies

- Chart.js (loaded via CDN)
- Modern browser with ES6+ support

## Troubleshooting

**Data not loading?**
- Ensure the Spark analysis has completed and generated output files
- Check browser console for error messages
- Try using a local web server for better file access
- Verify the JSON file format matches expected structure

**Charts not displaying?**
- Check internet connection (Chart.js loads from CDN)
- Ensure JavaScript is enabled in your browser
- Try refreshing the page

**Styling issues?**
- Clear browser cache
- Ensure CSS file is loading properly
- Check for JavaScript errors in console
