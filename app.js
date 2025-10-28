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
    
    // Get references to both viewer elements
    const pdfViewer = document.getElementById('pdf-viewer');
    const imageViewer = document.getElementById('image-viewer');
    
    // Check if this is an image or PDF based on file extension
    const extension = documentPath.split('.').pop().toLowerCase();
    
    if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
        // It's an image - show the image viewer and hide the PDF viewer
        imageViewer.src = documentPath;
        imageViewer.style.display = 'block';
        pdfViewer.style.display = 'none';
    } else {
        // It's a PDF - show the PDF viewer and hide the image viewer
        // Add view parameters for better mobile display:
        // - #view=FitH: Fits the page width to the screen
        // - This allows users to see the full page and scroll through multi-page PDFs
        // - Users can pinch to zoom in/out as needed
        const pdfUrl = documentPath + '#view=FitH';
        pdfViewer.src = pdfUrl;
        pdfViewer.style.display = 'block';
        imageViewer.style.display = 'none';
    }
}

/**
 * Close the document viewer and return to the previous page
 */
function closeDocument() {
    // Clear the viewers
    document.getElementById('pdf-viewer').src = '';
    document.getElementById('image-viewer').src = '';
    
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

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar from appearing on mobile
    e.preventDefault();
    
    // Store the event so we can trigger it later
    deferredPrompt = e;
    
    // Create and show our custom install button
    showInstallPrompt();
});

/**
 * Show a custom install prompt to the user
 */
function showInstallPrompt() {
    const installBtn = document.createElement('div');
    installBtn.className = 'install-prompt';
    installBtn.textContent = '📱 Install App';
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
    
    // Auto-hide the prompt after 10 seconds if user doesn't interact
    setTimeout(() => {
        if (installBtn && installBtn.parentNode) {
            installBtn.style.animation = 'slideDown 0.5s ease forwards';
            setTimeout(() => installBtn.remove(), 500);
        }
    }, 10000);
}

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
