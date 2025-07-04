// Initialize variables
let uploadedFiles = [];
let convertedFiles = {
    png: [],
    jpg: [],
    pdf: [],
    webp: []
};
let currentBatch = 0;
const BATCH_SIZE = 25;

// DOM elements
const dragDropArea = document.getElementById('dragDropArea');
const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const nextBatchBtn = document.getElementById('nextBatchBtn');
const batchNotice = document.getElementById('batchNotice');
const downloadOptions = document.getElementById('downloadOptions');
const zipDownloadButtons = document.getElementById('zipDownloadButtons');
const individualDownloads = document.getElementById('individualDownloads');
const formatCheckboxes = document.querySelectorAll('input[data-format]');
const downloadOptionRadios = document.querySelectorAll('input[name="downloadOption"]');

// Event listeners
dragDropArea.addEventListener('click', () => fileInput.click());
dragDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragDropArea.classList.add('drag-over');
});
dragDropArea.addEventListener('dragleave', () => {
    dragDropArea.classList.remove('drag-over');
});
dragDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDropArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => handleFiles(fileInput.files));
convertBtn.addEventListener('click', convertFiles);
nextBatchBtn.addEventListener('click', convertNextBatch);

// Download option change handler
downloadOptionRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.value === 'zip') {
            zipDownloadButtons.classList.remove('hidden');
            individualDownloads.classList.add('hidden');
        } else {
            zipDownloadButtons.classList.add('hidden');
            individualDownloads.classList.remove('hidden');
            updateIndividualDownloadsUI();
        }
    });
});

// Handle uploaded files
function handleFiles(files) {
    if (files.length > 100) {
        alert('You can upload a maximum of 100 files at once.');
        return;
    }
    


    // Filter only SVG files
    uploadedFiles = Array.from(files).filter(file => file.type === 'image/svg+xml' || file.name.endsWith('.svg'));
    
    if (uploadedFiles.length === 0) {
        alert('No valid SVG files found. Please upload files with .svg extension.');
        return;
    }

    // Reset conversion state
    convertedFiles = { png: [], jpg: [], pdf: [], webp: [] };
    currentBatch = 0;
    
    // Update UI based on file count
    if (uploadedFiles.length > BATCH_SIZE) {
        batchNotice.classList.remove('hidden');
        convertBtn.disabled = false;
        nextBatchBtn.classList.add('hidden');
    } else {
        batchNotice.classList.add('hidden');
        convertBtn.disabled = false;
        nextBatchBtn.classList.add('hidden');
    }
    
    // Clear previous download options
    downloadOptions.classList.add('hidden');
}

// Get selected formats
function getSelectedFormats() {
    return Array.from(formatCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.dataset.format);
}

// Convert files (either initial batch or next batch)
function convertFiles() {
    const selectedFormats = getSelectedFormats();
    if (selectedFormats.length === 0) {
        alert('Please select at least one output format.');
        return;
    }

    const startIdx = currentBatch * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, uploadedFiles.length);
    const batchFiles = uploadedFiles.slice(startIdx, endIdx);

    // Disable buttons during conversion
    convertBtn.disabled = true;
    nextBatchBtn.disabled = true;
    convertBtn.textContent = 'Converting...';

    // Process each file in the batch
    const conversionPromises = batchFiles.map(file => convertSVG(file, selectedFormats));
    
    Promise.all(conversionPromises)
        .then(() => {
            currentBatch++;
            
            // Update UI based on whether there are more files to process
            if (currentBatch * BATCH_SIZE < uploadedFiles.length) {
                nextBatchBtn.classList.remove('hidden');
                nextBatchBtn.disabled = false;
                convertBtn.textContent = 'Convert Files';
                convertBtn.disabled = true;
            } else {
                // All files processed
                convertBtn.textContent = 'Convert Files';
                updateDownloadUI();
                downloadOptions.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Conversion error:', error);
            alert('An error occurred during conversion. Please try again.');
            convertBtn.disabled = false;
            convertBtn.textContent = 'Convert Files';
        });
}

// Convert next batch of files
function convertNextBatch() {
    nextBatchBtn.disabled = true;
    nextBatchBtn.textContent = 'Converting...';
    convertFiles();
}

// Convert a single SVG file to all selected formats
function convertSVG(file, formats) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const svgData = e.target.result;
                const img = new Image();
                
                img.onload = async () => {
                    try {
                        // Create canvas for raster formats
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        
                        // Process each selected format
                        const formatPromises = formats.map(format => {
                            switch (format) {
                                case 'png':
                                    return convertToPNG(canvas, ctx, img, file.name);
                                case 'jpg':
                                    return convertToJPG(canvas, ctx, img, file.name);
                                case 'webp':
                                    return convertToWebP(canvas, ctx, img, file.name);
                                case 'pdf':
                                    return convertToPDF(img, file.name);
                                default:
                                    return Promise.resolve();
                            }
                        });
                        
                        await Promise.all(formatPromises);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.onerror = () => reject(new Error('Failed to load SVG image'));
                img.src = e.target.result;
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Convert to PNG
function convertToPNG(canvas, ctx, img, originalName) {
    return new Promise((resolve) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
            const fileName = originalName.replace('.svg', '.png');
            convertedFiles.png.push({ name: fileName, blob });
            resolve();
        }, 'image/png');
    });
}

// Convert to JPG
function convertToJPG(canvas, ctx, img, originalName) {
    return new Promise((resolve) => {
        // Fill with white background first
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
            const fileName = originalName.replace('.svg', '.jpg');
            convertedFiles.jpg.push({ name: fileName, blob });
            resolve();
        }, 'image/jpeg', 0.92); // 0.92 quality
    });
}

// Convert to WebP
function convertToWebP(canvas, ctx, img, originalName) {
    return new Promise((resolve) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
            const fileName = originalName.replace('.svg', '.webp');
            convertedFiles.webp.push({ name: fileName, blob });
            resolve();
        }, 'image/webp', 0.92); // 0.92 quality
    });
}

// Convert to PDF
function convertToPDF(img, originalName) {
    return new Promise((resolve) => {
        // jsPDF is available globally via CDN
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: img.width > img.height ? 'landscape' : 'portrait',
            unit: 'px'
        });
        
        // Add SVG as image to PDF
        pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
        
        const pdfBlob = pdf.output('blob');
        const fileName = originalName.replace('.svg', '.pdf');
        convertedFiles.pdf.push({ name: fileName, blob: pdfBlob });
        resolve();
    });
}

// Update download UI after conversion
function updateDownloadUI() {
    // Update ZIP download buttons
    zipDownloadButtons.innerHTML = '';
    
    if (convertedFiles.png.length > 0) {
        const btn = createDownloadButton('Download PNGs (.zip)', 'png');
        zipDownloadButtons.appendChild(btn);
    }
    
    if (convertedFiles.jpg.length > 0) {
        const btn = createDownloadButton('Download JPGs (.zip)', 'jpg');
        zipDownloadButtons.appendChild(btn);
    }
    
    if (convertedFiles.pdf.length > 0) {
        const btn = createDownloadButton('Download PDFs (.zip)', 'pdf');
        zipDownloadButtons.appendChild(btn);
    }
    
    if (convertedFiles.webp.length > 0) {
        const btn = createDownloadButton('Download WebPs (.zip)', 'webp');
        zipDownloadButtons.appendChild(btn);
    }
    
    // Update individual downloads if that view is active
    if (document.querySelector('input[name="downloadOption"]:checked').value === 'individual') {
        updateIndividualDownloadsUI();
    }
}

// Create a download button for ZIP files
function createDownloadButton(text, format) {
    const btn = document.createElement('button');
    btn.className = 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition';
    btn.textContent = text;
    
    btn.addEventListener('click', () => {
        btn.disabled = true;
        btn.textContent = 'Preparing ZIP...';
        
        createZipFile(format)
            .then(blob => {
                saveAs(blob, `${format}s.zip`);
                btn.disabled = false;
                btn.textContent = text;
            })
            .catch(error => {
                console.error('Error creating ZIP:', error);
                alert('Failed to create ZIP file. Please try again.');
                btn.disabled = false;
                btn.textContent = text;
            });
    });
    
    return btn;
}

// Create a ZIP file for a specific format
function createZipFile(format) {
    return new Promise((resolve, reject) => {
        const zip = new JSZip();
        const files = convertedFiles[format];
        
        files.forEach(file => {
            zip.file(file.name, file.blob);
        });
        
        zip.generateAsync({ type: 'blob' })
            .then(resolve)
            .catch(reject);
    });
}

// Update individual downloads UI
function updateIndividualDownloadsUI() {
    individualDownloads.innerHTML = '';
    
    // Create sections for each format
    for (const format in convertedFiles) {
        if (convertedFiles[format].length > 0) {
            const section = document.createElement('div');
            section.className = 'space-y-2';
            
            const heading = document.createElement('h4');
            heading.className = 'font-medium text-gray-700 capitalize';
            heading.textContent = `${format} Files:`;
            section.appendChild(heading);
            
            const list = document.createElement('div');
            list.className = 'space-y-1 ml-4';
            
            convertedFiles[format].forEach(file => {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'text-gray-600 truncate';
                nameSpan.textContent = file.name;
                
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-3 rounded transition';
                downloadBtn.textContent = 'Download';
                
                downloadBtn.addEventListener('click', () => {
                    saveAs(file.blob, file.name);
                });
                
                item.appendChild(nameSpan);
                item.appendChild(downloadBtn);
                list.appendChild(item);
            });
            
            section.appendChild(list);
            individualDownloads.appendChild(section);
        }
    }
}
