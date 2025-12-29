const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const fileInfoSection = document.getElementById('fileInfoSection');
const conversionSection = document.getElementById('conversionSection');
const progressSection = document.getElementById('progressSection');
const downloadSection = document.getElementById('downloadSection');

const imagePreview = document.getElementById('imagePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');

const formatButtons = document.querySelectorAll('.format-btn');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const resizeCheck = document.getElementById('resizeCheck');
const resizeOptions = document.getElementById('resizeOptions');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');

const convertBtn = document.getElementById('convertBtn');
const changeFileBtn = document.getElementById('changeFileBtn');
const downloadBtn = document.getElementById('downloadBtn');
const convertAnotherBtn = document.getElementById('convertAnotherBtn');

let selectedFile = null;
let selectedFormat = null;
let uploadedFileId = null;
let downloadUrl = null;

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
changeFileBtn.addEventListener('click', resetUpload);
convertBtn.addEventListener('click', startConversion);
downloadBtn.addEventListener('click', downloadFile);
convertAnotherBtn.addEventListener('click', resetUpload);

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#764ba2';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

formatButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        formatButtons.forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        selectedFormat = this.dataset.format;
    });
});

qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = e.target.value;
});

resizeCheck.addEventListener('change', (e) => {
    resizeOptions.style.display = e.target.checked ? 'block' : 'none';
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('❌ الرجاء اختيار ملف صورة فقط!');
        return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
        alert('❌ حجم الملف كبير جداً!');
        return;
    }
    
    selectedFile = file;
    displayFileInfo(file);
    uploadFile(file);
}

function displayFileInfo(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    fileName.textContent = `الاسم: ${file.name}`;
    fileSize.textContent = `الحجم: ${formatBytes(file.size)}`;
    
    uploadSection.style.display = 'none';
    fileInfoSection.style.display = 'grid';
    conversionSection.style.display = 'block';
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            uploadedFileId = result.fileId;
            console.log('✅ تم رفع الملف');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert('❌ حدث خطأ في الرفع');
        resetUpload();
    }
}

async function startConversion() {
    if (!uploadedFileId || !selectedFormat) {
        alert('❌ الرجاء اختيار صيغة التحويل!');
        return;
    }
    
    conversionSection.style.display = 'none';
    progressSection.style.display = 'block';
    
    const conversionData = {
        fileId: uploadedFileId,
        format: selectedFormat,
        quality: qualitySlider.value
    };
    
    if (resizeCheck.checked) {
        if (widthInput.value) conversionData.width = widthInput.value;
        if (heightInput.value) conversionData.height = heightInput.value;
    }
    
    try {
        const response = await fetch('/api/convert/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conversionData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            downloadUrl = result.downloadUrl;
            showDownloadSection();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert('❌ حدث خطأ في التحويل');
        progressSection.style.display = 'none';
        conversionSection.style.display = 'block';
    }
}

function showDownloadSection() {
    progressSection.style.display = 'none';
    downloadSection.style.display = 'block';
}

function downloadFile() {
    if (downloadUrl) {
        window.location.href = downloadUrl;
    }
}

function resetUpload() {
    selectedFile = null;
    selectedFormat = null;
    uploadedFileId = null;
    downloadUrl = null;
    fileInput.value = '';
    
    uploadSection.style.display = 'block';
    fileInfoSection.style.display = 'none';
    conversionSection.style.display = 'none';
    progressSection.style.display = 'none';
    downloadSection.style.display = 'none';
    
    formatButtons.forEach(btn => btn.classList.remove('selected'));
    qualitySlider.value = 90;
    qualityValue.textContent = '90';
    resizeCheck.checked = false;
    resizeOptions.style.display = 'none';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
