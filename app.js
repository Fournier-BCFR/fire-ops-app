// This file handles all the app's functionality including navigation and document viewing

// Keep track of which page we came from so we can return to it
let previousPage = 'home-page';

/**
 * Show a specific page and hide all others
 * This is how we navigate between different screens in the app
 */
function showPage(pageId) {
    // Hide all pages first
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the requested page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Remember this page in case we need to go back to it
    if (pageId !== 'viewer-page') {
        previousPage = pageId;
    }
}

// PDF.js configuration
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// PDF viewing state
let pdfDoc = null;
let currentPage = 1;
let scale = 1.5; // Default zoom level (1.5 = 150%)
const MAX_SCALE = 3.0;
const MIN_SCALE = 0.5;
const SCALE_STEP = 0.25;

/**
 * Open and display a document (PDF or image)
 * This function determines if the file is an image or PDF and displays it appropriately
 */
function openDocument(documentPath) {
    // Show the viewer page
    showPage('viewer-page');
    
    // Extract the document name from the file path for the title
    const fileName = documentPath.split('/').pop().replace(/\.(pdf|png|jpg|jpeg)$/i, '');
    const formattedName = fileName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
    document.getElementById('document-title').textContent = formattedName;
    
    // Get references to viewer elements
    const pdfContainer = document.getElementById('pdf-container');
    const imageViewer = document.getElementById('image-viewer');
    const pdfControls = document.getElementById('pdf-controls');
    
    // Check if this is an image or PDF based on file extension
    const extension = documentPath.split('.').pop().toLowerCase();
    
    if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
        // It's an image - show the image viewer and hide the PDF viewer
        imageViewer.src = documentPath;
        imageViewer.style.display = 'block';
        pdfContainer.style.display = 'none';
        pdfControls.style.display = 'none';
    } else {
        // It's a PDF - load it with PDF.js
        imageViewer.style.display = 'none';
        pdfContainer.style.display = 'block';
        pdfControls.style.display = 'flex';
        
        // Reset to first page
        currentPage = 1;
        
        // Load the PDF
        loadPDF(documentPath);
    }
}

/**
 * Load and render a PDF using PDF.js
 */
async function loadPDF(url) {
    try {
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDoc = await loadingTask.promise;
        
        // Update page count
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        
        // Render the first page
        renderPage(currentPage);
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. Please try again.');
    }
}

/**
 * Render a specific page of the PDF
 */
async function renderPage(pageNumber) {
    if (!pdfDoc) return;
    
    try {
        // Get the page
        const page = await pdfDoc.getPage(pageNumber);
        
        const canvas = document.getElementById('pdf-canvas');
        const context = canvas.getContext('2d');
        
        // Get viewport with current scale
        const viewport = page.getViewport({ scale: scale });
        
        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render the page
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Update page number display
        document.getElementById('page-num').textContent = pageNumber;
        document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
        
    } catch (error) {
        console.error('Error rendering page:', error);
    }
}

/**
 * Navigate to the next page
 */
function nextPage() {
    if (!pdfDoc || currentPage >= pdfDoc.numPages) return;
    currentPage++;
    renderPage(currentPage);
    
    // Scroll to top of canvas
    document.getElementById('pdf-canvas').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Navigate to the previous page
 */
function prevPage() {
    if (!pdfDoc || currentPage <= 1) return;
    currentPage--;
    renderPage(currentPage);
    
    // Scroll to top of canvas
    document.getElementById('pdf-canvas').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Zoom in on the PDF
 */
function zoomIn() {
    if (!pdfDoc) return;
    if (scale < MAX_SCALE) {
        scale += SCALE_STEP;
        renderPage(currentPage);
    }
}

/**
 * Zoom out on the PDF
 */
function zoomOut() {
    if (!pdfDoc) return;
    if (scale > MIN_SCALE) {
        scale -= SCALE_STEP;
        renderPage(currentPage);
    }
}

/**
 * Close the document viewer and return to the previous page
 */
function closeDocument() {
    // Clear the viewers
    document.getElementById('image-viewer').src = '';
    
    // Clear PDF state
    pdfDoc = null;
    currentPage = 1;
    scale = 1.5;
    
    const canvas = document.getElementById('pdf-canvas');
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Go back to whichever page we were on before viewing the document
    showPage(previousPage);
}

/**
 * Register the service worker for offline functionality
 * This runs when the page loads and enables the app to work without internet
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

/**
 * Handle the "Add to Home Screen" prompt for mobile devices
 * This makes the app installable like a native app
 */
let deferredPrompt;
let installPromptShown = false;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar from appearing on mobile
    e.preventDefault();
    
    // Store the event so we can trigger it later
    deferredPrompt = e;
    
    // Create and show our custom install button
    if (!installPromptShown) {
        showInstallPrompt();
        installPromptShown = true;
    }
});

/**
 * Show a custom install prompt to the user
 */
function showInstallPrompt() {
    const installBtn = document.createElement('div');
    installBtn.className = 'install-prompt';
    installBtn.innerHTML = '📱 Install App';
    
    installBtn.onclick = async () => {
        if (deferredPrompt) {
            // Show the install prompt
            deferredPrompt.prompt();
            
            // Wait for the user's response
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            
            // Clear the saved prompt since it can only be used once
            deferredPrompt = null;
            
            // Remove the install button
            installBtn.remove();
        }
    };
    
    document.body.appendChild(installBtn);
}

// Show iOS-specific install instructions if on iOS and not in standalone mode
window.addEventListener('load', () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
    
    if (isIOS && !isInStandaloneMode && !installPromptShown) {
        // Show iOS install instructions after a short delay
        setTimeout(() => {
            const iosPrompt = document.createElement('div');
            iosPrompt.className = 'install-prompt ios-prompt';
            iosPrompt.innerHTML = '📱 Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>';
            
            iosPrompt.onclick = () => {
                iosPrompt.remove();
            };
            
            document.body.appendChild(iosPrompt);
            
            // Keep it visible longer for iOS users (30 seconds instead of 10)
            setTimeout(() => {
                if (iosPrompt && iosPrompt.parentNode) {
                    iosPrompt.style.animation = 'slideDown 0.5s ease forwards';
                    setTimeout(() => iosPrompt.remove(), 500);
                }
            }, 30000);
        }, 2000);
        
        installPromptShown = true;
    }
});

// Add slideDown animation for hiding the install prompt
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

/**
 * Log when the app has been successfully installed
 */
window.addEventListener('appinstalled', () => {
    console.log('Fire Operations Guide app installed successfully!');
    deferredPrompt = null;
});
