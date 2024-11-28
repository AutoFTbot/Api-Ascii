const express = require('express');
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const app = express();
const port = 3000;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.png')
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('Please upload only images.'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

const deleteFile = (path) => {
    fs.unlink(path, (err) => {
        if (err) {
            console.error("Failed to delete file:", path, err);
        }
    });
};

function convertToBrailleASCII(image) {
    const width = image.width;
    const height = image.height;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height).data;

    let ascii = '';
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            ascii += getBrailleChar(imageData, width, x, y);
        }
        ascii += '\n';
    }
    return ascii;
}

function getBrailleChar(data, width, x, y) {
    const dots = [
        [0x01, 0x08],
        [0x02, 0x10],
        [0x04, 0x20],
        [0x40, 0x80]
    ];
    let braille = 0x2800;

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 2; j++) {
            const px = x + j;
            const py = y + i;
            if (px < width && py < data.length / width) {
                const idx = (py * width + px) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness < 128) {
                    braille |= dots[i][j];
                }
            }
        }
    }
    return String.fromCharCode(braille);
}

app.post('/asci', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image uploaded.');
    }

    try {
        const image = await loadImage(req.file.path);
        const ascii = convertToBrailleASCII(image);
        deleteFile(req.file.path); // Hapus file setelah diproses
        res.send(`${ascii}`);
    } catch (error) {
        console.error(error);
        deleteFile(req.file.path);
        res.status(500).send('Error processing image.');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
