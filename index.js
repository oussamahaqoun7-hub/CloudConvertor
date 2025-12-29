const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// إنشاء المجلدات
const uploadsDir = path.join(__dirname, 'uploads');
const convertedDir = path.join(__dirname, 'converted');

[uploadsDir, convertedDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// إعداد Multer للرفع
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// رفع الملف
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'لم يتم رفع أي ملف' 
      });
    }

    const fileType = getFileType(req.file.mimetype, req.file.originalname);

    res.json({
      success: true,
      fileId: req.file.filename,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: fileType
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// تحويل الصورة
app.post('/api/convert/image', async (req, res) => {
  try {
    const { fileId, format, quality, width, height } = req.body;

    if (!fileId || !format) {
      return res.status(400).json({ 
        success: false, 
        error: 'معلومات التحويل غير مكتملة' 
      });
    }

    const inputPath = path.join(uploadsDir, fileId);
    const outputFileName = `converted-${Date.now()}.${format}`;
    const outputPath = path.join(convertedDir, outputFileName);

    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'الملف غير موجود' 
      });
    }

    let image = sharp(inputPath);

    if (width || height) {
      image = image.resize(
        width ? parseInt(width) : null,
        height ? parseInt(height) : null,
        { fit: 'inside' }
      );
    }

    switch (format.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        await image.jpeg({ quality: parseInt(quality) || 90 }).toFile(outputPath);
        break;
      case 'png':
        await image.png({ quality: parseInt(quality) || 90 }).toFile(outputPath);
        break;
      case 'webp':
        await image.webp({ quality: parseInt(quality) || 90 }).toFile(outputPath);
        break;
      case 'gif':
        await image.gif().toFile(outputPath);
        break;
      default:
        throw new Error('صيغة غير مدعومة');
    }

    fs.unlinkSync(inputPath);

    res.json({
      success: true,
      downloadUrl: `/api/download/${outputFileName}`,
      fileName: outputFileName
    });

  } catch (error) {
    console.error('خطأ في التحويل:', error);
    res.status(500).json({ 
      success: false, 
      error: 'فشل التحويل: ' + error.message 
    });
  }
});

// تحميل الملف
app.get('/api/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(convertedDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'الملف غير موجود' 
      });
    }

    res.download(filePath, filename, (err) => {
      if (!err) {
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (e) {
            console.error('خطأ في الحذف:', e);
          }
        }, 10000);
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// تحديد نوع الملف
function getFileType(mimeType, filename) {
  const ext = path.extname(filename).toLowerCase();
  
  if (mimeType.startsWith('image/')) return 'image';
  
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  if (imageExts.includes(ext)) return 'image';
  
  return 'unknown';
}

// تنظيف الملفات القديمة
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000;

  [uploadsDir, convertedDir].forEach(dir => {
    fs.readdir(dir, (err, files) => {
      if (err) return;
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlink(filePath, err => {
              if (!err) console.log('✅ تم حذف ملف قديم:', file);
            });
          }
        });
      });
    });
  });
}, 60 * 60 * 1000);

// تشغيل السيرفر
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
