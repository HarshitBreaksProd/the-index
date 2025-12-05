import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PDFParse } from "pdf-parse";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const pdfFileToText = async (source: string) => {
  try {
    const pdfUrl = await getDownloadLinkForPdf(source);
    const parser = new PDFParse({ url: pdfUrl });
    const { text } = await parser.getText();
    const cleanedText = cleanupPdfText(text);
    return cleanedText;
  } catch (err) {
    console.log("Failed pdf to text conversion");
    console.log(err);
  }
};

const getDownloadLinkForPdf = async (objectKey: string) => {
  const getCommand = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: objectKey,
  });
  const downloadUrl = await getSignedUrl(s3, getCommand, { expiresIn: 300 });

  return downloadUrl;
};

const cleanupPdfText = (text: string): string => {
  let cleaned = text.replace(/--\s*\d+\s+of\s+\d+\s*--/g, "");
  cleaned = cleaned.replace(/--\s*\d+\s*--/g, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.trim();
  return cleaned;
};
