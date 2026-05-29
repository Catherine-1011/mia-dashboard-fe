# Backend Code Examples - Gallery Image Upload Fix

## Node.js + Express + Multer (Most Common)

### Installation
```bash
npm install multer
```

### Controller Code
```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product'); // Your Product model

// Configure multer for image uploads
const upload = multer({
  dest: 'uploads/products/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

const router = express.Router();

// PUT /api/products/:id
router.put('/api/products/:id', upload.array('galleryImages', 10), async (req, res) => {
  try {
    const productId = req.params.id;
    const { existingGalleryImages, keepExistingGallery } = req.body;

    console.log('DEBUG received:', {
      existingGalleryImages,
      newFiles: req.files?.length,
      keepExistingGallery
    });

    // Parse existing images (could be string or array)
    let existingImages = [];
    if (existingGalleryImages) {
      if (Array.isArray(existingGalleryImages)) {
        existingImages = existingGalleryImages.filter(url => url && url.trim());
      } else if (typeof existingGalleryImages === 'string') {
        existingImages = [existingGalleryImages].filter(url => url && url.trim());
      }
    }

    // Get new uploaded file paths
    const newImages = (req.files || []).map(file => {
      // Depending on your setup, this could be:
      // - file.path (local filesystem)
      // - file.location (S3 AWS)
      // - file.url (Cloudinary)
      return file.path || file.location || file.url;
    });

    console.log('Processed:', {
      existingCount: existingImages.length,
      newCount: newImages.length
    });

    // CRITICAL: Merge existing and new images
    let allGalleryImages = [];

    if (keepExistingGallery === 'true' && existingImages.length > 0 && newImages.length === 0) {
      // User didn't add new images, just keep existing
      allGalleryImages = existingImages;
    } else if (newImages.length > 0 && existingImages.length === 0) {
      // New upload only, no existing images
      allGalleryImages = newImages;
    } else if (newImages.length > 0 && existingImages.length > 0) {
      // MERGE: both old and new exist
      allGalleryImages = [...existingImages, ...newImages];
    } else if (existingImages.length > 0) {
      // Only existing, no new files
      allGalleryImages = existingImages;
    }

    // Remove duplicates (just in case)
    allGalleryImages = [...new Set(allGalleryImages)];

    console.log('Final gallery images:', allGalleryImages);

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        stock: req.body.stock,
        category: req.body.category,
        tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
        galleryImages: allGalleryImages,
        // ... other fields
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update product'
    });
  }
});

module.exports = router;
```

---

## Python + Flask

### Installation
```bash
pip install flask werkzeug
```

### Code Example
```python
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
from datetime import datetime

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads/products'
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        # Get existing image URLs from form
        existing_images = request.form.getlist('existingGalleryImages')
        keep_existing = request.form.get('keepExistingGallery') == 'true'

        print(f'DEBUG: existing_images={existing_images}, new_files={len(request.files.getlist("galleryImages"))}')

        # Process newly uploaded files
        new_images = []
        for file in request.files.getlist('galleryImages'):
            if file and allowed_file(file.filename):
                filename = f"{datetime.now().timestamp()}_{secure_filename(file.filename)}"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                new_images.append(filepath)

        # MERGE: Combine existing and new
        all_gallery_images = []

        if keep_existing and existing_images and not new_images:
            all_gallery_images = existing_images
        elif new_images and not existing_images:
            all_gallery_images = new_images
        elif new_images and existing_images:
            # Merge both
            all_gallery_images = existing_images + new_images
        else:
            all_gallery_images = existing_images

        # Remove duplicates
        all_gallery_images = list(set(all_gallery_images))

        print(f'Final images: {all_gallery_images}')

        # Update in database
        product = Product.query.get(product_id)
        product.title = request.form.get('title')
        product.description = request.form.get('description')
        product.price = request.form.get('price')
        product.stock = request.form.get('stock')
        product.category = request.form.get('category')
        product.gallery_images = all_gallery_images  # Update with merged images
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Product updated successfully',
            'product': product.to_dict()
        }), 200

    except Exception as e:
        print(f'Error: {str(e)}')
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
```

---

## Node.js + Express + AWS S3

```javascript
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3();

const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    key: (req, file, cb) => {
      const key = `products/${Date.now()}_${file.originalname}`;
      cb(null, key);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.put('/api/products/:id', uploadS3.array('galleryImages'), async (req, res) => {
  try {
    const { existingGalleryImages } = req.body;
    
    // S3 files have different structure
    let existingImages = existingGalleryImages 
      ? (Array.isArray(existingGalleryImages) ? existingGalleryImages : [existingGalleryImages])
      : [];

    // S3 uploads have location property
    const newImages = (req.files || []).map(file => file.location);

    // Merge
    const allGalleryImages = [...existingImages, ...newImages];

    // Update product
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { galleryImages: allGalleryImages },
      { new: true }
    );

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

---

## PHP + Laravel

```php
<?php

Route::put('/api/products/{id}', function (Request $request, $id) {
    try {
        $existingImages = $request->input('existingGalleryImages', []);
        if (is_string($existingImages)) {
            $existingImages = [$existingImages];
        }

        // Process new uploads
        $newImages = [];
        if ($request->hasFile('galleryImages')) {
            foreach ($request->file('galleryImages') as $file) {
                $path = $file->store('products/gallery', 'public');
                $newImages[] = '/storage/' . $path;
            }
        }

        // Merge
        $allImages = array_merge($existingImages, $newImages);
        $allImages = array_unique($allImages);

        // Update
        $product = Product::findOrFail($id);
        $product->gallery_images = $allImages;
        $product->save();

        return response()->json([
            'success' => true,
            'product' => $product
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ], 500);
    }
});
```

---

## Key Implementation Rules (ALL FRAMEWORKS)

1. **Parse form data** for `existingGalleryImages` (strings/URLs)
2. **Parse uploaded files** for new images (File objects)
3. **Merge arrays** before saving to database
4. **Handle null/empty cases** properly
5. **Remove duplicates** if needed
6. **Log for debugging** what you received and what you're saving

---

## Quick Checklist

- [ ] Read `existingGalleryImages` from form
- [ ] Read new files from upload array
- [ ] Merge them BEFORE saving
- [ ] Save merged array to database
- [ ] Test with Postman
- [ ] Test with frontend
- [ ] Verify images don't disappear

