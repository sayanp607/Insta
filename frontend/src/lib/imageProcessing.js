export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

export function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the rotated size of the image.
 */
export function rotateSize(width, height, rotation) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * This function was adapted from the one in the react-easy-crop documentation.
 */
export default async function getCroppedImg(
  imageSrc,
  pixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  filter = "none"
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

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

  // Use full image if pixelCrop is null
  if (!pixelCrop) {
    pixelCrop = {
      x: 0,
      y: 0,
      width: bBoxWidth,
      height: bBoxHeight
    };
  }

  // translate canvas context to a central point to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Apply filter to the canvas context
  if (filter !== "none") {
    ctx.filter = filter;
  }

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

  // paste generated rotate image with correct offsets for x,y crop values.
  ctx.putImageData(data, 0, 0);

  // As Base64 string
  // return canvas.toDataURL('image/jpeg');

  // As a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      resolve(URL.createObjectURL(file));
    }, "image/webp");
  });
}

export const FILTERS = [
  { name: "Normal", filter: "none" },
  { name: "Clarendon", filter: "contrast(1.2) brightness(1.1) saturate(1.1)" },
  { name: "Gingham", filter: "sepia(0.2) contrast(0.9) brightness(1.1)" },
  { name: "Moon", filter: "grayscale(1) contrast(1.1) brightness(1.1)" },
  { name: "Lark", filter: "contrast(0.9) saturate(1.2) brightness(1.1)" },
  { name: "Reyes", filter: "sepia(0.4) contrast(0.85) brightness(1.1) saturate(0.75)" },
  { name: "Juno", filter: "contrast(1.2) saturate(1.3) sepia(0.3)" },
  { name: "Slumber", filter: "brightness(1.05) saturate(0.6) contrast(1.1)" },
  { name: "Crema", filter: "sepia(0.4) saturate(1.1) contrast(0.9) brightness(1.1)" },
  { name: "Ludwig", filter: "contrast(1.1) brightness(1.1)" },
  { name: "Aden", filter: "sepia(0.2) saturate(0.85) contrast(0.9) brightness(1.1)" },
  { name: "Perpetua", filter: "contrast(1.1) brightness(1.1) saturate(1.1)" },
];
