import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from './Button';
import { RotateCw, FlipHorizontal, FlipVertical } from 'lucide-react';

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom) => {
    setZoom(zoom);
  };

  const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      const croppedImage = await getCroppedImg(
        imageSrc, 
        croppedAreaPixels, 
        rotation, 
        flip
      );
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="relative flex-1 bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteCallback}
          onZoomChange={onZoomChange}
          onRotationChange={setRotation}
          transform={[
            `translate(${crop.x}px, ${crop.y}px)`,
            `rotate(${rotation}deg)`,
            `scale(${zoom})`,
            `scaleX(${flip.horizontal ? -1 : 1})`,
            `scaleY(${flip.vertical ? -1 : 1})`,
          ].join(' ')}
        />
      </div>
      <div className="p-4 md:p-6 bg-zinc-900 border-t border-zinc-800 space-y-4 safe-area-bottom">
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400 w-12">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(e.target.value)}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        <div className="flex gap-4 justify-center py-2">
          <Button 
            variant="secondary" 
            size="icon"
            onClick={() => setRotation((r) => r + 90)}
            title="Rotate 90°"
            className="h-12 w-12 rounded-full bg-zinc-800 border-zinc-700"
          >
            <RotateCw size={24} />
          </Button>
          <Button 
            variant="secondary" 
            size="icon"
            onClick={() => setFlip(f => ({ ...f, horizontal: !f.horizontal }))}
            className={`h-12 w-12 rounded-full border-zinc-700 ${flip.horizontal ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : 'bg-zinc-800'}`}
            title="Flip Horizontal"
          >
            <FlipHorizontal size={24} />
          </Button>
          <Button 
            variant="secondary" 
            size="icon"
            onClick={() => setFlip(f => ({ ...f, vertical: !f.vertical }))}
            className={`h-12 w-12 rounded-full border-zinc-700 ${flip.vertical ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : 'bg-zinc-800'}`}
            title="Flip Vertical"
          >
            <FlipVertical size={24} />
          </Button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1 h-12 text-base">
            Cancel
          </Button>
          <Button onClick={createCroppedImage} className="flex-1 h-12 text-base">
            Apply Crop
          </Button>
        </div>
      </div>
    </div>
  );
}

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });

function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
function rotateSize(width, height, rotation) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function getCroppedImg(
  imageSrc,
  pixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image at the top left corner
  ctx.putImageData(data, 0, 0);

  // As Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, 'image/jpeg');
  });
}
