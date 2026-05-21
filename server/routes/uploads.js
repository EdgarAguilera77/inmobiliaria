const express = require('express');

const router = express.Router();

const MAX_BASE64_IMAGE_BYTES = 5 * 1024 * 1024;

const estimateBase64Size = (base64Value = '') => {
  const normalized = base64Value.replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
};

const parseImagePayload = (imageBase64 = '') => {
  const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    base64Data: match[2],
  };
};

router.post('/preview-base64', async (req, res) => {
  const { imageBase64, fileName = '' } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'La imagen en base64 es obligatoria.' });
  }

  const parsedImage = parseImagePayload(imageBase64);

  if (!parsedImage) {
    return res.status(400).json({ error: 'Formato base64 invalido. Debe ser una imagen.' });
  }

  const imageBytes = estimateBase64Size(parsedImage.base64Data);

  if (imageBytes > MAX_BASE64_IMAGE_BYTES) {
    return res.status(400).json({ error: 'La imagen supera el limite de 5 MB.' });
  }

  return res.status(200).json({
    fileName,
    mimeType: parsedImage.mimeType,
    size: imageBytes,
    previewUrl: `data:${parsedImage.mimeType};base64,${parsedImage.base64Data}`,
  });
});

module.exports = router;
