// JavaScript for Audio Transcription App
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileUploadArea = document.getElementById('fileUploadArea');
    const audioFileInput = document.getElementById('audioFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFileBtn = document.getElementById('removeFile');
    const transcribeBtn = document.getElementById('transcribeBtn');
    const transcriptionForm = document.getElementById('transcriptionForm');
    const resultsSection = document.getElementById('resultsSection');
    const errorSection = document.getElementById('errorSection');
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    const originalOutput = document.getElementById('originalOutput');
    const originalSection = document.getElementById('originalSection');
    const toggleOriginalBtn = document.getElementById('toggleOriginalBtn');
    const errorMessage = document.getElementById('errorMessage');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const newTranscriptionBtn = document.getElementById('newTranscriptionBtn');
    const tryAgainBtn = document.getElementById('tryAgainBtn');

    let selectedFile = null;
    let currentTranscription = '';
    let originalTranscription = '';
    let isOriginalVisible = false;

    // File Upload Handlers
    fileUploadArea.addEventListener('click', () => {
        audioFileInput.click();
    });

    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('dragover');
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    audioFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    removeFileBtn.addEventListener('click', () => {
        clearFileSelection();
    });

    // Form Submit Handler
    transcriptionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedFile) {
            showError('Please select an audio file first.');
            return;
        }

        await handleTranscription();
    });

    // Button Event Handlers
    copyBtn.addEventListener('click', () => {
        copyToClipboard();
    });

    downloadBtn.addEventListener('click', () => {
        downloadTranscription();
    });

    newTranscriptionBtn.addEventListener('click', () => {
        resetToUpload();
    });

    tryAgainBtn.addEventListener('click', () => {
        resetToUpload();
    });

    // Toggle Original Transcription
    toggleOriginalBtn.addEventListener('click', () => {
        toggleOriginalTranscription();
    });

    // File Selection Handler
    function handleFileSelection(file) {
        // Validate file type
        const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/x-m4a'];
        const validExtensions = ['.wav', '.mp3', '.m4a'];
        
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
            showError('Please select a valid audio file (WAV, MP3, or M4A).');
            return;
        }

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB in bytes
        if (file.size > maxSize) {
            showError('File size must be less than 50MB.');
            return;
        }

        selectedFile = file;
        
        // Update UI
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileUploadArea.style.display = 'none';
        fileInfo.style.display = 'block';
        transcribeBtn.disabled = false;
        
        // Hide any previous results or errors
        hideResults();
        hideError();
    }

    // Clear File Selection
    function clearFileSelection() {
        selectedFile = null;
        audioFileInput.value = '';
        fileUploadArea.style.display = 'block';
        fileInfo.style.display = 'none';
        transcribeBtn.disabled = true;
        hideResults();
        hideError();
    }

    // Handle Transcription
    async function handleTranscription() {
        // Show loading state
        setLoadingState(true);
        hideResults();
        hideError();

        try {
            const formData = new FormData();
            formData.append('audio', selectedFile);

            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                if (data.transcription) {
                    showResults(data);
                } else {
                    showError('No transcription was generated. Please try again with a different audio file.');
                }
            } else {
                showError(data.error || 'An error occurred during transcription. Please try again.');
            }
        } catch (error) {
            console.error('Transcription error:', error);
            showError('Network error. Please check your connection and try again.');
        } finally {
            setLoadingState(false);
        }
    }

    // Show Results
    function showResults(data) {
        // Store both transcriptions
        currentTranscription = data.transcription;
        originalTranscription = data.original_transcription || data.transcription;
        
        // Display refined transcription
        transcriptionOutput.textContent = currentTranscription;
        
        // Display original transcription if different
        if (data.refined && originalTranscription !== currentTranscription) {
            originalOutput.textContent = originalTranscription;
            toggleOriginalBtn.style.display = 'flex';
        } else {
            toggleOriginalBtn.style.display = 'none';
        }
        
        // Reset toggle state
        isOriginalVisible = false;
        originalSection.style.display = 'none';
        updateToggleButton();
        
        resultsSection.style.display = 'block';
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        // Show notification about refinement
        if (data.refined) {
            showNotification('Text has been enhanced using AI for better accuracy!', 'info');
        }
    }

    // Hide Results
    function hideResults() {
        resultsSection.style.display = 'none';
    }

    // Show Error
    function showError(message) {
        errorMessage.textContent = message;
        errorSection.style.display = 'block';
        
        // Scroll to error
        errorSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Hide Error
    function hideError() {
        errorSection.style.display = 'none';
    }

    // Set Loading State
    function setLoadingState(isLoading) {
        const btnText = transcribeBtn.querySelector('.btn-text');
        const btnLoading = transcribeBtn.querySelector('.btn-loading');
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            transcribeBtn.disabled = true;
        } else {
            btnText.style.display = 'flex';
            btnLoading.style.display = 'none';
            transcribeBtn.disabled = false;
        }
    }

    // Copy to Clipboard
    function copyToClipboard() {
        const text = currentTranscription; // Always copy the refined text
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Enhanced text copied to clipboard!');
            }).catch(() => {
                fallbackCopyToClipboard(text);
            });
        } else {
            fallbackCopyToClipboard(text);
        }
    }

    // Fallback Copy Method
    function fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('Text copied to clipboard!');
        } catch (err) {
            showNotification('Failed to copy text. Please select and copy manually.');
        }
        
        document.body.removeChild(textArea);
    }

    // Download Transcription
    function downloadTranscription() {
        const text = currentTranscription; // Download the refined text
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `enhanced_transcription_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Enhanced transcription downloaded successfully!');
    }

    // Reset to Upload State
    function resetToUpload() {
        clearFileSelection();
        hideResults();
        hideError();
        
        // Reset transcription data
        currentTranscription = '';
        originalTranscription = '';
        isOriginalVisible = false;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Toggle Original Transcription
    function toggleOriginalTranscription() {
        isOriginalVisible = !isOriginalVisible;
        
        if (isOriginalVisible) {
            originalSection.style.display = 'block';
            originalSection.style.animation = 'fadeInUp 0.3s ease';
        } else {
            originalSection.style.display = 'none';
        }
        
        updateToggleButton();
    }

    // Update Toggle Button Text
    function updateToggleButton() {
        const icon = toggleOriginalBtn.querySelector('i');
        const text = toggleOriginalBtn.lastChild;
        
        if (isOriginalVisible) {
            icon.className = 'fas fa-eye-slash';
            toggleOriginalBtn.childNodes[toggleOriginalBtn.childNodes.length - 1].textContent = ' Hide Original Transcription';
        } else {
            icon.className = 'fas fa-eye';
            toggleOriginalBtn.childNodes[toggleOriginalBtn.childNodes.length - 1].textContent = ' Show Original Transcription';
        }
    }

    // Show Notification
    function showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        const baseStyles = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideInRight 0.4s ease;
            backdrop-filter: blur(10px);
            border: 1px solid;
            max-width: 400px;
            min-width: 300px;
        `;
        
        const typeStyles = {
            success: 'background: rgba(16, 185, 129, 0.95); color: white; border-color: rgba(16, 185, 129, 0.3);',
            error: 'background: rgba(239, 68, 68, 0.95); color: white; border-color: rgba(239, 68, 68, 0.3);',
            info: 'background: rgba(59, 130, 246, 0.95); color: white; border-color: rgba(59, 130, 246, 0.3);'
        };
        
        notification.style.cssText = baseStyles + typeStyles[type];
        
        // Add animation styles if not already present
        if (!document.querySelector('#notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-weight: 500;
                    font-size: 0.95rem;
                }
                .notification-content i {
                    font-size: 1.1rem;
                    flex-shrink: 0;
                }
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, 4000);
    }

    // Format File Size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + U to trigger file upload
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            if (!selectedFile) {
                audioFileInput.click();
            }
        }
        
        // Ctrl/Cmd + Enter to start transcription
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (selectedFile && !transcribeBtn.disabled) {
                transcriptionForm.dispatchEvent(new Event('submit'));
            }
        }
        
        // Ctrl/Cmd + C to copy (when results are visible)
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && resultsSection.style.display === 'block') {
            e.preventDefault();
            copyToClipboard();
        }
    });
});
