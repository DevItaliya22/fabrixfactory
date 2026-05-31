import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";

import { r2 } from "@/lib/r2";

const bucket = () => process.env.R2_BUCKET_NAME!;
const publicDomain = () => process.env.R2_PUBLIC_DOMAIN!;

export function getPublicUrl(key: string): string {
  return `https://${publicDomain()}/${key}`;
}

export async function uploadImageToR2(file: File): Promise<{
  key: string;
  url: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const optimized = await sharp(buffer).webp({ quality: 90 }).toBuffer();

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
  const key = `images/${Date.now()}-${safeName}.webp`;

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: optimized,
      ContentType: "image/webp",
    }),
  );

  return { key, url: getPublicUrl(key) };
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
  );
}

/** Presigned GET URL — useful when bucket/object is not public */
export async function getSignedGetUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  });

  return getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
}
