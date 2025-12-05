import { createPreSignedUrlSchema } from "@repo/zod-schema";
import { Request, Response } from "express";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const createPreSignedUrl = async (req: Request, res: Response) => {
  try {
    console.log(req.body);

    const inputs = createPreSignedUrlSchema.safeParse(req.body);

    if (!inputs.success) {
      console.log(inputs.error);

      res.status(400).json({
        message: "Invalid Inputs",
        error: inputs.error,
        success: false,
      });
      return;
    }

    let randomKey = crypto.randomUUID();

    let fileExt = inputs.data.fileName.split(".")[1];

    let objectKey = `${randomKey}.${fileExt}`;

    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: objectKey,
      ContentType: inputs.data.contentType,
    });

    const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: 120 });

    res.json({
      uploadUrl,
      objectKey,
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "some error faced creating put signed url for s3",
      error: err,
      success: false,
    });
  }
};
