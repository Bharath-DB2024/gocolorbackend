const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const app = express();
const port = 3000;

// MongoDB connection
const mongoURL = 'mongodb://127.0.0.1:27017/imageDB';
mongoose.connect(mongoURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Image Schema
const imageSchema = new mongoose.Schema({
  filename: String,
  contentType: String,
  imageData: Buffer,
  color: String,
  createdAt: { type: Date, default: Date.now },
});
const Image = mongoose.model('Image', imageSchema);

// Color matching map
const colorMatchMap = {
  "black": ["red", "white", "golden yellow", "turquoise", "maroon", "silver grey"],
  "white": ["navy", "black", "fuchsia", "pink", "turquoise", "khaki", "cherry","Dark Grey"],
  "ecru": ["maroon", "bottle green", "dusty pink", "navy", "denim blue"],
  "navy": ["white", "golden yellow", "cream", "silver grey", "baby pink"],
  "bright red": ["black", "white", "navy", "golden yellow"],
  "maroon": ["cream", "khaki", "dusty pink", "wheat", "gold", "black", "white","jeans blue","blue warm"],
  "red": ["cream", "khaki", "dusty pink", "wheat", "gold", "black"],
  "wheat": ["maroon", "bottle green", "dusty pink", "navy", "denim blue"],
  "cream": ["maroon", "bottle green", "dusty pink", "navy", "denim blue"],
  "bottle green": ["cream", "maroon", "golden yellow", "white"],
  "fuchsia": ["white", "grey", "navy", "silver", "dark olive"],
  "baby pink": ["grey", "white", "navy", "cherry", "purple"],
  "yellow": ["navy", "black", "bottle green", "cherry"],
  "silver grey": ["fuchsia", "navy", "black", "baby pink", "purple"],
  "dusty pink": ["ecru", "brown", "khaki", "maroon"],
  "khaki": ["maroon", "cream", "black", "dark olive", "golden yellow",],
  "light blue": ["cream", "cherry", "golden yellow"],
  "cherry": ["white", "baby pink", "cream", "bottle green"],
  "light pista": ["turquoise", "white", "dusty pink"],
  "turquoise blue": ["turquoise blue", "golden yellow", "cream", "navy"],
  "dark rose": ["olive green", "khaki", "cream", "ecru", "antique gold", "dusty pink", "navy", "turquoise blue", "dark grey"],
  "antique gold": ["maroon", "cream", "dark red", "bottle green"],
  "blue": ["cream", "maroon", "khaki", "wheat"],
  "dark olive": ["khaki", "fuchsia", "cream", "denim"],
  "brown": ["cream", "khaki", "dusty pink", "golden yellow"],
  "purple": ["grey", "white", "baby pink", "silver"]
};

// Function to extract color from filename
function extractColorFromFilename(filename) {
  const nameWithoutExt = path.basename(filename, path.extname(filename));
  const color = nameWithoutExt
    .replace(/\d+/g, '')
    .replace(/[-_]/g, ' ')
    .trim();
  return color || 'Unknown';
}

// Function to extract content type from folder name
function extractContentTypeFromFolder(folderPath) {
  const folderName = path.basename(folderPath);
  return folderName
    .replace(/[^a-zA-Z0-9\s&]/g, '')
    .trim()
    .toLowerCase();
}

// Function to process images from a folder
async function processImagesFromFolder(folderPath) {
  try {
    const files = await fs.readdir(folderPath);
    const savedImages = [];
    const contentType = extractContentTypeFromFolder(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const ext = path.extname(file).toLowerCase();

      if (['.jpg', '.jpeg', '.png', '.svg'].includes(ext)) {
        const buffer = await fs.readFile(filePath);
        const color = extractColorFromFilename(file);

        const image = new Image({
          filename: file,
          contentType: contentType,
          imageData: buffer,
          color,
        });

        const savedImage = await image.save();
        savedImages.push({
          filename: savedImage.filename,
          contentType: savedImage.contentType,
          color: savedImage.color,
          createdAt: savedImage.createdAt,
        });
      }
    }

    return savedImages;
  } catch (error) {
    throw new Error('Error processing images: ' + error.message);
  }
}

// Route to process images from a folder
app.post('/upload-folder', async (req, res) => {
  const folderPath = 'C:/Users/BHARATH K/OneDrive/Desktop/keerthana/Leggings & Churidar';
  try {
    console.log('Processing folder:', folderPath);
    const savedImages = await processImagesFromFolder(folderPath);
    console.log('Saved images:', savedImages);
    res.status(201).json({
      message: 'Images uploaded successfully',
      images: savedImages,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to retrieve all image data
app.get('/images', async (req, res) => {
  try {
    const images = await Image.find({}, 'filename contentType color _id imageData createdAt');
    console.log('Fetched images:', images.length);
    const imageDataArray = images.map((img) => {
      const base64Image = img.imageData.toString('base64');
      const ext = img.filename.split('.').pop().toLowerCase();
      const mimeType =
        ext === 'png' ? 'image/png' :
        ext === 'svg' ? 'image/svg+xml' :
        'image/jpeg';
      console.log('Encoding image:', img.filename, 'Size:', base64Image.length);
      return {
        _id: img._id,
        filename: img.filename,
        contentType: img.contentType,
        color: img.color,
        createdAt: img.createdAt,
        imageData: `data:${mimeType};base64,${base64Image}`,
      };
    });
    res.status(200).json(imageDataArray);
  } catch (error) {
    console.error('Images fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch images', details: error.message });
  }
});

// Route to get single image
app.get('/image/:id', async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.set('Content-Type', path.extname(image.filename).toLowerCase() === '.svg' ? 'image/svg+xml' : 'image/jpeg');
    res.send(image.imageData);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching image: ' + error.message });
  }
});

// Route to process color and find matching images
app.post('/api/process-color', async (req, res) => {
  const { majorityColor, selectedLabel } = req.body;
  console.log(req.body);

  if (!majorityColor || !selectedLabel) {
    return res.status(400).json({ error: 'Missing majorityColor or selectedLabel' });
  }

  try {
    const normalizedColor = majorityColor.toLowerCase().replace(/\s*\d+\s*$/, ''); // Remove trailing numbers
    const normalizedLabel = selectedLabel.toLowerCase();

    const matchingColors = colorMatchMap[normalizedColor] || [];
    const searchColors = [normalizedColor, ...matchingColors].map(color =>
      color.replace(/\s*\d+\s*$/, '') // Normalize all search colors
    );

    // Create a regex to match base color names, ignoring numbers and text after
    const colorRegex = searchColors.map(color => new RegExp(`^${color}(?:\\s*\\d+)?`, 'i'));

    const images = await Image.find(
      {
        contentType: new RegExp(`^${normalizedLabel}$`, 'i'),
        color: { $in: colorRegex }, // Match colors using regex
      },
      'filename contentType color _id imageData'
    );

    const imageDataArray = images.map((img) => {
      const base64Image = img.imageData.toString('base64');
      const ext = img.filename.split('.').pop().toLowerCase();
      const mimeType =
        ext === 'png' ? 'image/png' :
        ext === 'svg' ? 'image/svg+xml' :
        'image/jpeg';
      console.log('Encoding image:', img.filename, 'Size:', base64Image.length);
      return {
        id: img._id,
        contentType: img.contentType,
        color: img.color,
        filename: img.filename,
        imageData: `data:${mimeType};base64,${base64Image}`,
      };
    });

    let message = `Looks great! Your ${selectedLabel} in ${majorityColor} is a perfect choice!`;
    let recommendedStyle = '';

    switch (normalizedLabel) {
      case 'activewear':
        recommendedStyle = 'Pair with white sneakers for a sporty look!';
        break;
      case 'ethnic & fusion wear':
        recommendedStyle = 'Add gold accessories to enhance the look!';
        break;
      default:
        recommendedStyle = 'Try a minimalist style with neutral tones.';
        break;
    }

    console.log('Processed images:', imageDataArray);

    res.status(200).json({
      message,
      recommendedStyle,
      majorityColor,
      matchedColors: searchColors,
      selectedLabel,
      matchingImages: imageDataArray,
    });
  } catch (error) {
    console.error('Process color error:', error);
    res.status(500).json({ error: 'Failed to process color matching', details: error.message });
  }
});

// Route to get available colors
app.get('/api/colors', (req, res) => {
  try {
    const colors = Object.keys(colorMatchMap);
    res.status(200).json(colors);
  } catch (error) {
    console.error('Colors fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch colors', details: error.message });
  }
});

// Serve HTML
app.get('/', (req, res) => {
  const colorOptions = Object.keys(colorMatchMap)
    .map((color) => `<option value="${color}">${color}</option>`)
    .join('');

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Image Upload and Color Matching</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        button { padding: 10px 20px; margin: 10px 0; }
        select, input { padding: 8px; margin: 10px 0; }
        #image-list, #matching-images { margin-top: 20px; }
        .image-item, .matching-image { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
        .image-item img, .matching-image img { max-width: 200px; margin-top: 10px; }
        #recommendation { margin-top: 20px; font-style: italic; }
      </style>
    </head>
    <body>
      <h1>Image Upload and Color Matching</h1>
      <h2>Upload Images</h2>
      <form action="/upload-folder" method="POST">
        <button type="submit">Upload All Images from Folder</button>
      </form>
      <h2>View Stored Images</h2>
      <button onclick="fetchImages()">Show Stored Images</button>
      <div id="image-list"></div>
      <h2>Find Matching Colors</h2>
      <label for="majorityColor">Select Color:</label>
      <select id="majorityColor">
        ${colorOptions}
      </select><br>
      <label for="selectedLabel">Select Type:</label>
      <select id="selectedLabel">
        <option value="Leggings & Churidar">Leggings & Churidar</option>
        <option value="Wide Pants">Wide Pants</option>
        <option value="Straight Pants">Straight Pants</option>
        <option value="Tapered Pants">Tapered Pants</option>
        <option value="Jeans & Jeggings">Jeans & Jeggings</option>
        <option value="Ethnic & Fusion Wear">Ethnic & Fusion Wear</option>
      </select><br>
      <button onclick="findMatchingColors()">Find Matching Images</button>
      <div id="recommendation"></div>
      <div id="matching-images"></div>
      <script>
        function fetchImages() {
          fetch('/images')
            .then(res => {
              if (!res.ok) throw new Error('Failed to fetch images: ' + res.statusText);
              return res.json();
            })
            .then(images => {
              const list = document.getElementById('image-list');
              list.innerHTML = '';
              if (images.length === 0) {
                list.innerHTML = '<p>No images found in the database.</p>';
                return;
              }
              images.forEach(img => {
                const div = document.createElement('div');
                div.className = 'image-item';
                div.innerHTML = \`
                  <strong>\${img.filename}</strong><br>
                  Type: \${img.contentType}<br>
                  Color: \${img.color}<br>
                  Uploaded: \${new Date(img.createdAt).toLocaleString()}
                  <br><img src="\${img.imageData}" alt="\${img.filename}" loading="lazy" onerror="console.error('Failed to load image: \${img.filename}')">
                \`;
                list.appendChild(div);
              });
            })
            .catch(err => {
              console.error('Error fetching images:', err);
              document.getElementById('image-list').innerHTML = '<p>Error loading images: \${err.message}</p>';
            });
        }

        function findMatchingColors() {
          const majorityColor = document.getElementById('majorityColor').value;
          const selectedLabel = document.getElementById('selectedLabel').value;
          fetch('/api/process-color', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ majorityColor, selectedLabel }),
          })
            .then(res => {
              if (!res.ok) throw new Error('Failed to fetch matching images: ' + res.statusText);
              return res.json();
            })
            .then(data => {
              const recommendationDiv = document.getElementById('recommendation');
              const matchingImagesDiv = document.getElementById('matching-images');
              recommendationDiv.innerHTML = \`
                <p>\${data.message}</p>
                <p>\${data.recommendedStyle}</p>
                <p>Matched Colors: \${data.matchedColors.join(', ')}</p>
              \`;
              matchingImagesDiv.innerHTML = '';
              if (data.matchingImages.length === 0) {
                matchingImagesDiv.innerHTML = '<p>No matching images found.</p>';
                return;
              }
              data.matchingImages.forEach(img => {
                const div = document.createElement('div');
                div.className = 'matching-image';
                div.innerHTML = \`
                  <img src="\${img.imageData}" alt="\${img.filename}" loading="lazy" onerror="console.error('Failed to load image: \${img.filename}')">
                  <p>Type: \${img.contentType}</p>
                  <p>Color: \${img.color}</p>
                \`;
                matchingImagesDiv.appendChild(div);
              });
            })
            .catch(err => {
              console.error('Error fetching matching images:', err);
              document.getElementById('matching-images').innerHTML = '<p>Error loading matching images: \${err.message}</p>';
            });
        }
      </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});