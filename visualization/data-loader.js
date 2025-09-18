// Data Loader Utility for Log Analysis Dashboard
class DataLoader {
    constructor() {
        this.baseDataPath = '../data/log_analysis_output/';
        this.availableFiles = new Map();
    }

    /**
     * Dynamically discover available part files in each category
     */
    async discoverPartFiles() {
        const categories = ['status_counts', 'top_ips', 'top_urls'];
        
        for (const category of categories) {
            try {
                // Try to find part files by attempting common patterns
                const partFile = await this.findPartFile(category);
                if (partFile) {
                    this.availableFiles.set(category, partFile);
                    console.log(`Discovered ${category} file: ${partFile}`);
                }
            } catch (error) {
                console.warn(`Could not discover ${category} files:`, error.message);
            }
        }
    }

    /**
     * Find the actual part file for a category by trying different approaches
     */
    async findPartFile(category) {
        const categoryPath = `${this.baseDataPath}${category}/`;
        
        // First, try to use the File System Access API if available
        if (window.showDirectoryPicker) {
            try {
                const partFile = await this.findPartFileViaFS(category);
                if (partFile) return partFile;
            } catch (error) {
                console.log(`File system approach failed for ${category}:`, error.message);
            }
        }
        
        // Fallback: try known patterns or make educated guesses
        const knownPatterns = this.getKnownPartFilePatterns(category);
        for (const pattern of knownPatterns) {
            try {
                const response = await fetch(`${categoryPath}${pattern}`);
                if (response.ok) {
                    return pattern;
                }
            } catch (error) {
                // Continue to next pattern
            }
        }
        
        throw new Error(`No accessible part file found for ${category}`);
    }

    /**
     * Load JSON data from Spark output files using discovered file names
     */
    async loadSparkOutput(category) {
        const categoryPath = `${this.baseDataPath}${category}/`;
        
        try {
            // Use discovered file name or attempt discovery
            let partFileName = this.availableFiles.get(category);
            if (!partFileName) {
                await this.discoverPartFiles();
                partFileName = this.availableFiles.get(category);
            }
            
            if (!partFileName) {
                throw new Error(`No part file discovered for ${category}`);
            }
            
            const response = await fetch(`${categoryPath}${partFileName}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            return this.parseSparkJSON(text);
        } catch (error) {
            console.warn(`Could not load ${category} data:`, error.message);
            return null;
        }
    }

    /**
     * Parse Spark JSON output (JSON Lines format)
     * Each line is a separate JSON object
     */
    parseSparkJSON(text) {
        try {
            const lines = text.trim().split('\n').filter(line => line.trim());
            return lines.map(line => JSON.parse(line));
        } catch (error) {
            console.error('Error parsing JSON lines:', error);
            return [];
        }
    }

    /**
     * Get known part file patterns for different categories
     * These are the actual current files, but we'll try to discover dynamically
     */
    getKnownPartFilePatterns(category) {
        const patterns = {
            'status_counts': [
                'part-00000-859c2b77-856a-4106-9a5d-c46aac1dee38-c000.json',
                'part-00000.json'
            ],
            'top_ips': [
                'part-00000-b095a2d4-8770-4359-9a7a-f907d1a661b1-c000.json',
                'part-00000.json'
            ],
            'top_urls': [
                'part-00000-ce9e7ee0-f1e9-4333-9247-26428b41c410-c000.json',
                'part-00000.json'
            ]
        };
        return patterns[category] || ['part-00000.json'];
    }

    /**
     * Find part file using File System Access API
     */
    async findPartFileViaFS(category) {
        // This would require user interaction, so we'll skip for now
        // and rely on HTTP-based discovery
        return null;
    }

    /**
     * Load all analysis data categories
     */
    async loadAllData() {
        const results = {};
        
        try {
            const [statusData, ipData, urlData] = await Promise.all([
                this.loadSparkOutput('status_counts'),
                this.loadSparkOutput('top_ips'),
                this.loadSparkOutput('top_urls')
            ]);

            results.statusCounts = this.processStatusData(statusData);
            results.topIPs = this.processIPData(ipData);
            results.topURLs = this.processURLData(urlData);

            return results;
        } catch (error) {
            console.error('Error loading analysis data:', error);
            return null;
        }
    }

    /**
     * Process status count data from Spark output
     * Handles the actual data structure: {"statusCode":200,"count":9579824}
     */
    processStatusData(data) {
        if (!data || !Array.isArray(data)) return null;
        
        return data.map(item => ({
            status: String(item.statusCode || item.status || item._1 || item[0]),
            count: parseInt(item.count || item._2 || item[1] || 0)
        })).sort((a, b) => b.count - a.count);
    }

    /**
     * Process IP data from Spark output
     * Handles the actual data structure: {"ipAddress":"66.249.66.194","count":353483}
     */
    processIPData(data) {
        if (!data || !Array.isArray(data)) return null;
        
        return data.map(item => ({
            ip: item.ipAddress || item.ip || item._1 || item[0],
            count: parseInt(item.count || item._2 || item[1] || 0)
        })).sort((a, b) => b.count - a.count);
    }

    /**
     * Process URL data from Spark output
     * Handles the actual data structure: {"url":"/settings/logo","count":352047}
     */
    processURLData(data) {
        if (!data || !Array.isArray(data)) return null;
        
        return data.map(item => ({
            url: item.url || item._1 || item[0],
            count: parseInt(item.count || item._2 || item[1] || 0)
        })).sort((a, b) => b.count - a.count);
    }

    /**
     * Alternative method to load data via file system API (if available)
     */
    async loadViaFileSystem() {
        if (!window.showDirectoryPicker) {
            throw new Error('File System Access API not supported');
        }

        try {
            const dirHandle = await window.showDirectoryPicker();
            const results = {};

            // Navigate to log_analysis_output directory
            const outputDirHandle = await dirHandle.getDirectoryHandle('data')
                .then(dataDir => dataDir.getDirectoryHandle('log_analysis_output'));

            // Load each category
            for (const category of ['status_counts', 'top_ips', 'top_urls']) {
                try {
                    const categoryDirHandle = await outputDirHandle.getDirectoryHandle(category);
                    
                    // Find the part file
                    for await (const [name, fileHandle] of categoryDirHandle.entries()) {
                        if (name.startsWith('part-') && name.endsWith('.json')) {
                            const file = await fileHandle.getFile();
                            const text = await file.text();
                            const data = this.parseSparkJSON(text);
                            
                            if (category === 'status_counts') {
                                results.statusCounts = this.processStatusData(data);
                            } else if (category === 'top_ips') {
                                results.topIPs = this.processIPData(data);
                            } else if (category === 'top_urls') {
                                results.topURLs = this.processURLData(data);
                            }
                            break;
                        }
                    }
                } catch (error) {
                    console.warn(`Could not load ${category}:`, error);
                }
            }

            return results;
        } catch (error) {
            console.error('File system access error:', error);
            throw error;
        }
    }

    /**
     * Auto-detect and load data using the best available method
     */
    async autoLoadData() {
        console.log('Starting dynamic data discovery and loading...');
        
        // First, discover available files
        await this.discoverPartFiles();
        
        // Try HTTP fetch with discovered files
        let data = await this.loadAllData();
        
        if (!data || Object.values(data).every(val => val === null)) {
            console.log('HTTP fetch failed, trying File System Access API...');
            
            try {
                data = await this.loadViaFileSystem();
            } catch (error) {
                console.warn('File System Access API failed:', error.message);
                return null;
            }
        }

        // Log successful data loading
        if (data) {
            console.log('Successfully loaded data:', {
                statusCounts: data.statusCounts?.length || 0,
                topIPs: data.topIPs?.length || 0,
                topURLs: data.topURLs?.length || 0
            });
        }

        return data;
    }

    /**
     * Get loading status and discovered files info
     */
    getLoadingInfo() {
        return {
            discoveredFiles: Object.fromEntries(this.availableFiles),
            baseDataPath: this.baseDataPath
        };
    }
}

// Export for use in dashboard
window.DataLoader = DataLoader;
