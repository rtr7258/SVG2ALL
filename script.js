document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dragDropArea = document.getElementById('dragDropArea');
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');
    const nextBatchBtn = document.getElementById('nextBatchBtn');
    const batchNotice = document.getElementById('batchNotice');
    const fileCountText = document.getElementById('fileCountText');
    const downloadOptions = document.getElementById('downloadOptions');
    const zipDownloadButtons = document.getElementById('zipDownloadButtons');
    const individualDownloads = document.getElementById('individualDownloads');
    const formatCheckboxes = document.querySelectorAll('input[data-format]');
    
    // State variables
    let files = [];
    let currentBatch = 0;
    const BATCH_SIZE = 25;
    let conversionResults = {};
    
    // Initialize drag and drop
    setupDragAndDrop();
    
    // Event Listeners
    dragDropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    convertBtn.addEventListener('click', startConversion);
    nextBatchBtn.addEventListener('click', processNextBatch);
    
    // Setup drag and drop functionality
    function setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dragDropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dragDropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dragDropArea.addEventListener(eventName, unhighlight, false);
        });
        
        dragDropArea.addEventListener('drop', handleDrop, false);
    }
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dragDropArea.classList.add('drag-over');
    }
    
    function unhighlight() {
        dragDropArea.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const droppedFiles = dt.files;
        handleFiles(droppedFiles);
    }
    
    function handleFileSelect(e) {
        handleFiles(e.target.files);
    }
    
    function handleFiles(selectedFiles) {
        // Filter only SVG files
        const svgFiles = Array.from(selectedFiles).filter(file => file.name.endsWith('.svg'));
        
        if (svgFiles.length === 0) {
            alert('Please select SVG files only.');
            return;
        }
        
        files = svgFiles;
        updateFileCount();
        
        // Enable convert button if we have files
        convertBtn.disabled = files.length === 0;
        
        // Show batch notice if we have more than BATCH_SIZE files
        if (files.length > BATCH_SIZE) {
            batchNotice.classList.remove('hidden');
            nextBatchBtn.classList.remove('hidden');
        } else {
            batchNotice.classList.add('hidden');
            nextBatchBtn.classList.add('hidden');
        }
        
        // Reset batch counter
        currentBatch = 0;
    }
    
    function updateFileCount() {
        fileCountText.textContent = `You have uploaded files: ${files.length}`;
    }
    
    async function startConversion() {
        // Reset conversion results
        conversionResults = {};
        
        // Process first batch
        await processNextBatch();
    }
    
    async function processNextBatch() {
        // Disable buttons during conversion
        convertBtn.disabled = true;
        nextBatchBtn.disabled = true;
        convertBtn.textContent = 'Converting...';
        
        try {
            // Get current batch of files
            const batchStart = currentBatch * BATCH_SIZE;
            const batchEnd = batchStart + BATCH_SIZE;
            const batchFiles = files.slice(batchStart, batchEnd);
            
            // Process each file in the batch
            for (const file of batchFiles) {
                const fileName = file.name.replace('.svg', '');
                conversionResults[fileName] = {};
                
                // Read the file content
                const svgContent = await readFileAsText(file);
                
                // Convert to selected formats
                for (const checkbox of formatCheckboxes) {
                    if (checkbox.checked) {
                        const format = checkbox.dataset.format;
                        conversionResults[fileName][format] = await convertSvg(svgContent, format, fileName);
                    }
                }
            }
            
            // Update batch counter
            currentBatch++;
            
            // Check if we have more files to process
            if (currentBatch * BATCH_SIZE < files.length) {
                nextBatchBtn.disabled = false;
                convertBtn.textContent = `Convert Batch ${currentBatch + 1}`;
            } else {
                // All files processed
                convertBtn.textContent = 'Convert Files';
                nextBatchBtn.classList.add('hidden');
                showDownloadOptions();
            }
        } catch (error) {
            console.error('Conversion error:', error);
            alert('An error occurred during conversion. Please try again.');
        } finally {
            // Always re-enable the convert button
            convertBtn.disabled = false;
        }
    }
    
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('File reading failed'));
            reader.readAsText(file);
        });
    }
    
    async function convertSvg(svgContent, format, fileName) {
        // Simulate conversion (replace with actual conversion logic)
        console.log(`Converting ${fileName} to ${format}`);
        
        // In a real app, you would use libraries like canvg, html2canvas, etc.
        // This is just a simulation with a delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return a mock result (replace with actual conversion result)
        return `data:image/${format};base64,mockbase64datafor${fileName}.${format}`;
    }
    
    function showDownloadOptions() {
        downloadOptions.classList.remove('hidden');
        
        // Clear previous download buttons
        zipDownloadButtons.innerHTML = '';
        individualDownloads.innerHTML = '';
        
        // Get selected formats
        const selectedFormats = Array.from(formatCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.dataset.format);
        
        // Create ZIP download buttons for each format
        selectedFormats.forEach(format => {
            const button = document.createElement('button');
            button.className = 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition';
            button.textContent = `Download All ${format.toUpperCase()}s as ZIP`;
            button.addEventListener('click', () => downloadAllAsZip(format));
            zipDownloadButtons.appendChild(button);
        });
        
        // Setup individual downloads (hidden by default)
        if (document.querySelector('input[name="downloadOption"]:checked').value === 'individual') {
            showIndividualDownloads();
        }
        
        // Add event listener for download option changes
        document.querySelectorAll('input[name="downloadOption"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'individual') {
                    showIndividualDownloads();
                } else {
                    individualDownloads.classList.add('hidden');
                    zipDownloadButtons.classList.remove('hidden');
                }
            });
        });
    }
    
    function showIndividualDownloads() {
        individualDownloads.innerHTML = '';
        individualDownloads.classList.remove('hidden');
        zipDownloadButtons.classList.add('hidden');
        
        // Create download links for each file and format
        Object.entries(conversionResults).forEach(([fileName, formats]) => {
            const fileSection = document.createElement('div');
            fileSection.className = 'border-b border-gray-200 pb-4';
            
            const title = document.createElement('h4');
            title.className = 'font-medium text-gray-800 mb-3';
            title.textContent = fileName;
            fileSection.appendChild(title);
            
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'flex flex-wrap gap-3';
            
            Object.entries(formats).forEach(([format, dataUrl]) => {
                const button = document.createElement('a');
                button.className = 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition text-sm';
                button.textContent = format.toUpperCase();
                button.href = dataUrl;
                button.download = `${fileName}.${format}`;
                buttonsContainer.appendChild(button);
            });
            
            fileSection.appendChild(buttonsContainer);
            individualDownloads.appendChild(fileSection);
        });
    }
    
    function downloadAllAsZip(format) {
        // Create a new JSZip instance
        const zip = new JSZip();
        
        // Add each converted file to the zip
        Object.entries(conversionResults).forEach(([fileName, formats]) => {
            if (formats[format]) {
                // Extract base64 data from data URL
                const base64Data = formats[format].split(',')[1];
                zip.file(`${fileName}.${format}`, base64Data, { base64: true });
            }
        });
        
        // Generate the zip file
        zip.generateAsync({ type: 'blob' }).then(content => {
            saveAs(content, `converted_files_${format}.zip`);
        });
    }
});
