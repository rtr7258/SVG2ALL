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
const fileCount = document.getElementById('file-count'); // DeepSeek part

// Drag & Drop visual interaction
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

// Download option switch handler
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

// Main File Handling Function
function handleFiles(files) {
    const svgFiles = Array.from(files).filter(file =>
        file.type === 'image/svg+xml' || file.name.endsWith('.svg')
    );

    if ((uploadedFiles.length + svgFiles.length) > 100) {
        alert('You can upload a maximum of 100 files.');
        return;
    }

    // Merge new files with existing
    uploadedFiles = [...uploadedFiles, ...svgFiles];

    // ✅ Update file count (DeepSeek part)
    fileCount.textContent = `You have uploaded: ${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''}`;

    if (uploadedFiles.length === 0) {
        alert('No valid SVG files found.');
        return;
    }

    // Reset previous results
    convertedFiles = { png: [], jpg: [], pdf: [], webp: [] };
    currentBatch = 0;

    // Batch UI toggle
    if (uploadedFiles.length > BATCH_SIZE) {
        batchNotice.classList.remove('hidden');
        convertBtn.disabled = false;
        nextBatchBtn.classList.add('hidden');
    } else {
        batchNotice.classList.add('hidden');
        convertBtn.disabled = false;
        nextBatchBtn.classList.add('hidden');
    }

    downloadOptions.classList.add('hidden');
}

// Get selected formats
function getSelectedFormats() {
    return Array.from(formatCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.dataset.format);
}

// Convert buttons
convertBtn.addEventListener('click', convertFiles);
nextBatchBtn.addEventListener('click', convertNextBatch);

// Batch Conversion
function convertFiles() {
    const selectedFormats = getSelectedFormats();
    if (selectedFormats.length === 0) {
        alert('Please select at least one format.');
        return;
    }

    const start = currentBatch * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, uploadedFiles.length);
    const batch = uploadedFiles.slice(start, end);

    convertBtn.disabled = true;
    nextBatchBtn.disabled = true;
    convertBtn.textContent = 'Converting...';

    Promise.all(batch.map(file => convertSVG(file, selectedFormats)))
        .then(() => {
            currentBatch++;

            if (currentBatch * BATCH_SIZE < uploadedFiles.length) {
                nextBatchBtn.classList.remove('hidden');
                nextBatchBtn.disabled = false;
                convertBtn.textContent = 'Convert Files';
                convertBtn.disabled = true;
            } else {
                convertBtn.textContent = 'Convert Files';
                updateDownloadUI();
                downloadOptions.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Conversion error:', error);
            alert('Error during conversion.');
            convertBtn.disabled = false;
            convertBtn.textContent = 'Convert Files';
        });
}

function convertNextBatch() {
    nextBatchBtn.disabled = true;
    nextBatchBtn.textContent = 'Converting...';
    convertFiles();
}

// File Conversion Logic
function convertSVG(file, formats) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const svgData = e.target.result;
                const img = new Image();

                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;

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
                };

                img.onerror = () => reject(new Error('SVG load failed'));
                img.src = svgData;
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsDataURL(file);
    });
}

function convertToPNG(canvas, ctx, img, name) {
    return new Promise(resolve => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
            convertedFiles.png.push({ name: name.replace('.svg', '.png'), blob });
            resolve();
        }, 'image/png');
    });
}

function convertToJPG(canvas, ctx, img, name) {
    return new Promise(resolve => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
            convertedFiles.jpg.push({ name: name.replace('.svg', '.jpg'), blob });
            resolve();
        }, 'image/jpeg', 0.92);
    });
}

function convertToWebP(canvas, ctx, img, name) {
    return new Promise(resolve => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
            convertedFiles.webp.push({ name: name.replace('.svg', '.webp'), blob });
            resolve();
        }, 'image/webp', 0.92);
    });
}

function convertToPDF(img, name) {
    return new Promise(resolve => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: img.width > img.height ? 'landscape' : 'portrait',
            unit: 'px'
        });
        pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
        const blob = pdf.output('blob');
        convertedFiles.pdf.push({ name: name.replace('.svg', '.pdf'), blob });
        resolve();
    });
}

// Download UI update
function updateDownloadUI() {
    zipDownloadButtons.innerHTML = '';
    if (convertedFiles.png.length > 0) zipDownloadButtons.appendChild(createDownloadButton('Download PNGs (.zip)', 'png'));
    if (convertedFiles.jpg.length > 0) zipDownloadButtons.appendChild(createDownloadButton('Download JPGs (.zip)', 'jpg'));
    if (convertedFiles.pdf.length > 0) zipDownloadButtons.appendChild(createDownloadButton('Download PDFs (.zip)', 'pdf'));
    if (convertedFiles.webp.length > 0) zipDownloadButtons.appendChild(createDownloadButton('Download WebPs (.zip)', 'webp'));

    if (document.querySelector('input[name="downloadOption"]:checked').value === 'individual') {
        updateIndividualDownloadsUI();
    }
}

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
            .catch(err => {
                console.error('ZIP error:', err);
                alert('ZIP creation failed.');
                btn.disabled = false;
                btn.textContent = text;
            });
    });

    return btn;
}

function createZipFile(format) {
    return new Promise((resolve, reject) => {
        const zip = new JSZip();
        const files = convertedFiles[format];

        files.forEach(file => {
            zip.file(file.name, file.blob);
        });

        zip.generateAsync({ type: 'blob' }).then(resolve).catch(reject);
    });
}

function updateIndividualDownloadsUI() {
    individualDownloads.innerHTML = '';

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
