const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const passwordModal = document.getElementById('passwordModal');
const downloadPassword = document.getElementById('downloadPassword');
const confirmDownloadBtn = document.getElementById('confirmDownloadBtn');

let currentDownloadId = null;

// File input change handler
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const allowedTypes = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(extension)) {
            alert('Only PDF, PPT, DOC, JPG, JPEG, and PNG files are allowed.');
            fileInput.value = '';
            fileNameDisplay.textContent = 'Click to upload or drag and drop';
            return;
        }
        
        fileNameDisplay.textContent = file.name;
    }
});

// Upload handler
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const uploadBtn = document.getElementById('uploadBtn');
    const originalBtnText = uploadBtn.innerHTML;
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('uploaderName', document.getElementById('uploaderName').value);
    formData.append('password', document.getElementById('password').value);

    try {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<div class="loader"></div><span>Uploading...</span>';
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert('Success: ' + result.message);
            uploadForm.reset();
            fileNameDisplay.textContent = 'Click to upload or drag and drop';
            loadFiles();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        alert('Upload failed: ' + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalBtnText;
    }
});

// Load files
async function loadFiles() {
    try {
        const response = await fetch('/api/files');
        const files = await response.json();
        
        fileCount.textContent = `${files.length} files`;
        
        if (files.length === 0) {
            fileList.innerHTML = '<div class="text-center py-12 text-slate-400">No files shared yet. Be the first!</div>';
            return;
        }

        fileList.innerHTML = files.map(file => {
            const date = new Date(file.upload_time).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const size = (file.file_size / (1024 * 1024)).toFixed(2);
            const icon = getFileIcon(file.file_type);
            const color = getIconColor(file.file_type);

            return `
                <div class="file-row glass-card p-6 rounded-3xl flex items-center justify-between hover:shadow-lg hover:shadow-blue-500/5 transition-all animate-in fade-in slide-in-from-left-4 duration-500">
                    <div class="flex items-center space-x-5">
                        <div class="file-icon ${color} text-white shadow-lg shadow-current/20">
                            ${icon}
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-800 text-lg">${file.original_name}</h3>
                            <p class="text-sm text-slate-500">
                                Uploaded by <span class="font-bold text-slate-700">${file.uploader_name}</span> • ${date} • ${size} MB
                            </p>
                        </div>
                    </div>
                    <button onclick="openDownloadModal(${file.id})" class="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-6 py-3 rounded-2xl font-bold transition-all flex items-center space-x-2">
                        <span>Download</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    </button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load files:', error);
    }
}

function getFileIcon(type) {
    if (type.includes('pdf')) return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>';
    if (type.includes('image')) return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
    if (type.includes('word') || type.includes('officedocument.word')) return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
    if (type.includes('presentation') || type.includes('powerpoint')) return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm0 4h10M7 11h10M7 15h10"></path></svg>';
    return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>';
}

function getIconColor(type) {
    if (type.includes('pdf')) return 'bg-red-500';
    if (type.includes('image')) return 'bg-emerald-500';
    if (type.includes('word')) return 'bg-blue-500';
    if (type.includes('presentation')) return 'bg-orange-500';
    return 'bg-slate-500';
}

function openDownloadModal(id) {
    currentDownloadId = id;
    passwordModal.classList.remove('hidden');
    passwordModal.classList.add('flex');
    downloadPassword.value = '';
    downloadPassword.focus();
}

function closeModal() {
    passwordModal.classList.add('hidden');
    passwordModal.classList.remove('flex');
    currentDownloadId = null;
}

confirmDownloadBtn.addEventListener('click', async () => {
    const password = downloadPassword.value;
    if (!password) {
        alert('Please enter the password.');
        return;
    }

    try {
        const response = await fetch(`/api/download/${currentDownloadId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Get filename from content-disposition header if possible
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'download';
            if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
                filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            closeModal();
        } else {
            const result = await response.json();
            alert(result.error || 'Incorrect password.');
        }
    } catch (error) {
        alert('Download failed: ' + error.message);
    }
});

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const eyeIcon = button.querySelector('.eye-icon');
        const eyeSlashIcon = button.querySelector('.eye-slash-icon');
        
        if (input.type === 'password') {
            input.type = 'text';
            eyeIcon.classList.add('hidden');
            eyeSlashIcon.classList.remove('hidden');
        } else {
            input.type = 'password';
            eyeIcon.classList.remove('hidden');
            eyeSlashIcon.classList.add('hidden');
        }
    });
});

// Initial load
loadFiles();
