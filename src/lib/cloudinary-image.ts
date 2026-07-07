const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/** Builds an optimized Cloudinary delivery URL for an asset in jai-sri-ram-textiles/placeholders. */
export function placeholderImage(publicId: string, width: number): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/jai-sri-ram-textiles/placeholders/${publicId}`;
}
