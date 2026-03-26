function initApp() {
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const passwordModal = document.getElementById('passwordModal');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalPasswordInput = document.getElementById('modalPasswordInput');
const confirmActionBtn = document.getElementById('confirmActionBtn');

// Fail fast in production if the HTML structure isn't present.
if (!uploadForm || !fileInput || !fileNameDisplay) {
    console.error('ShareitAF init failed: missing required DOM elements.');
    return;
}

let currentFileId = null;
let modalMode = 'download'; // 'download' or 'delete'
// Same-origin API calls by default.
// (Avoids `import.meta.env` so this JS won't crash if loaded outside module context.)
const API_BASE = '';

function apiUrl(path) {
    return `${API_BASE}${path}`;
}

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
    formData.append('securityQuestion', document.getElementById('securityQuestion').value);
    formData.append('securityAnswer', document.getElementById('securityAnswer').value);
    formData.append('oneTimeOpen', document.getElementById('oneTimeOpen').checked);

    try {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<div class="loader"></div><span>Uploading...</span>';
        
        const response = await fetch(apiUrl('/api/upload'), {
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
        const response = await fetch(apiUrl('/api/files'));
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
            
            const isCorrupted = file.one_time_open && file.is_opened;
            const oneTimeBadge = file.one_time_open ? `<span class="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${isCorrupted ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}">One-Time</span>` : '';

            return `
                <div class="file-row glass-card p-6 rounded-3xl flex items-center justify-between hover:shadow-lg hover:shadow-blue-500/5 transition-all animate-in fade-in slide-in-from-left-4 duration-500 ${isCorrupted ? 'opacity-75 grayscale-[0.5]' : ''}">
                    <div class="flex items-center space-x-5">
                        <div class="file-icon ${isCorrupted ? 'bg-slate-400' : color} text-white shadow-lg shadow-current/20">
                            ${isCorrupted ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' : icon}
                        </div>
                        <div>
                            <div class="flex items-center space-x-2">
                                <h3 class="font-bold text-slate-800 text-lg">${isCorrupted ? 'File Corrupted' : file.original_name}</h3>
                                ${oneTimeBadge}
                            </div>
                            <p class="text-sm text-slate-500">
                                ${isCorrupted ? 'This file has already been opened' : `Uploaded by <span class="font-bold text-slate-700">${file.uploader_name}</span> • ${date} • ${size} MB`}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <button onclick="openDeleteModal('${file.id}', '${file.security_question.replace(/'/g, "\\'")}')" class="p-3 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all group" title="Delete file">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        ${isCorrupted ? `
                            <div class="text-red-500 font-bold px-4 py-3 flex items-center space-x-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                                <span class="text-sm">Expired</span>
                            </div>
                        ` : `
                            <button onclick="openDownloadModal('${file.id}')" class="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-6 py-3 rounded-2xl font-bold transition-all flex items-center space-x-2">
                                <span>Download</span>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            </button>
                        `}
                    </div>
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
    currentFileId = id;
    modalMode = 'download';
    modalTitle.textContent = 'Enter Password';
    modalDescription.textContent = 'This file is protected. Please enter the password to download.';
    confirmActionBtn.textContent = 'Download';
    confirmActionBtn.className = 'flex-1 px-5 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200';
    modalPasswordInput.type = 'password';
    modalPasswordInput.placeholder = '••••••••';
    
    passwordModal.classList.remove('hidden');
    passwordModal.classList.add('flex');
    modalPasswordInput.value = '';
    modalPasswordInput.focus();
}

function openDeleteModal(id, question) {
    currentFileId = id;
    modalMode = 'delete';
    modalTitle.textContent = 'Security Question';
    modalDescription.textContent = question;
    confirmActionBtn.textContent = 'Delete Permanently';
    confirmActionBtn.className = 'flex-1 px-5 py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200';
    modalPasswordInput.type = 'text';
    modalPasswordInput.placeholder = 'Your security answer';
    
    passwordModal.classList.remove('hidden');
    passwordModal.classList.add('flex');
    modalPasswordInput.value = '';
    modalPasswordInput.focus();
}

function closeModal() {
    passwordModal.classList.add('hidden');
    passwordModal.classList.remove('flex');
    currentFileId = null;
    modalMode = null;
}

// Inline `onclick="..."` handlers expect these functions to exist on `window`.
// When using `<script type="module">`, plain function declarations are module-scoped.
window.openDownloadModal = openDownloadModal;
window.openDeleteModal = openDeleteModal;
window.closeModal = closeModal;

confirmActionBtn.addEventListener('click', async () => {
    const value = modalPasswordInput.value;
    if (!value) {
        alert('Please enter the required information.');
        return;
    }

    if (modalMode === 'download') {
        await handleDownload(value);
    } else {
        await handleDelete(value);
    }
});

async function handleDownload(password) {
    try {
        const response = await fetch(apiUrl(`/api/download/${currentFileId}`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
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
            loadFiles();
        } else {
            const result = await response.json();
            if (response.status === 410) {
                alert('File Corrupted: ' + result.error);
                closeModal();
                loadFiles();
            } else {
                alert(result.error || 'Incorrect password.');
            }
        }
    } catch (error) {
        alert('Download failed: ' + error.message);
    }
}

async function handleDelete(answer) {
    try {
        const response = await fetch(apiUrl(`/api/delete/${currentFileId}`), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer })
        });

        if (response.ok) {
            const result = await response.json();
            alert('Success: ' + result.message);
            closeModal();
            loadFiles();
        } else {
            const result = await response.json();
            alert('Error: ' + (result.error || 'Failed to delete file.'));
        }
    } catch (error) {
        alert('Deletion failed: ' + error.message);
    }
}

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const eyeIcon = button.querySelector('.eye-icon');
        const eyeSlashIcon = button.querySelector('.eye-slash-icon');
        
        if (input.type === 'password' || input.type === 'text') {
            if (input.type === 'password') {
                input.type = 'text';
                eyeIcon.classList.add('hidden');
                eyeSlashIcon.classList.remove('hidden');
            } else {
                input.type = 'password';
                eyeIcon.classList.remove('hidden');
                eyeSlashIcon.classList.add('hidden');
            }
        }
    });
});

// Initial load
loadFiles();
}

// Make initialization robust across script-loading modes.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
