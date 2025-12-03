
import { ConfigState, ViewConfig } from '../types';

/**
 * Generates a Base64 string of the composited texture.
 * Splits the texture into Left (Front) and Right (Back) for UV mapping.
 */
export const generateTexture = async (config: ConfigState): Promise<string> => {
  const canvas = document.createElement('canvas');
  const size = 2048; 
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  // 1. Fill Background (T-Shirt Color)
  ctx.fillStyle = config.baseColor;
  ctx.fillRect(0, 0, size, size);

  // 2. Draw Front View (Left Half: 0 to 1024)
  await drawView(ctx, config.front, 0, 0, size / 2, size);

  // 3. Draw Back View (Right Half: 1024 to 2048)
  await drawView(ctx, config.back, size / 2, 0, size / 2, size);

  // Return base64 data URL
  return canvas.toDataURL('image/png', 0.8);
};

const drawView = async (
    ctx: CanvasRenderingContext2D, 
    viewConfig: ViewConfig, 
    offsetX: number, 
    offsetY: number, 
    width: number, 
    height: number
) => {
    // Clip to the specific view area so elements don't bleed
    ctx.save();
    ctx.beginPath();
    ctx.rect(offsetX, offsetY, width, height);
    ctx.clip();

    // -- Draw Image --
    if (viewConfig.image.src) {
        try {
            const img = await loadImage(viewConfig.image.src);
            const { x, y, scale, rotation } = viewConfig.image.transform;

            // Normalized sizing relative to the VIEW width (not full texture)
            // Base width = 50% of the view width
            const aspectRatio = img.width / img.height;
            const baseWidth = width * 0.5; 
            const baseHeight = baseWidth / aspectRatio;

            const drawWidth = baseWidth * scale;
            const drawHeight = baseHeight * scale;

            // Position within the view area
            // x/y are percentages (0-100) of the view area
            const posX = offsetX + (x / 100) * width;
            const posY = offsetY + (y / 100) * height;

            ctx.save();
            ctx.translate(posX, posY);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();

        } catch (e) {
            console.error('Failed to draw image', e);
        }
    }

    // -- Draw Text --
    if (viewConfig.text.content) {
        const { x, y, scale, rotation } = viewConfig.text.transform;
        const { content, color, fontFamily, fontSize } = viewConfig.text;

        const posX = offsetX + (x / 100) * width;
        const posY = offsetY + (y / 100) * height;

        // Scale font size relative to width
        // Base size multiplier
        const actualFontSize = fontSize * (width / 100) * scale;

        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate((rotation * Math.PI) / 180);
        
        ctx.font = `bold ${actualFontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(content, 0, 0);
        
        ctx.restore();
    }

    ctx.restore(); // Restore clipping
};

// Helper to load image async
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; 
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};
