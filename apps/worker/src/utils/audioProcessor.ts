import { nodewhisper } from "nodejs-whisper";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createWriteStream } from "fs";
import path from "path";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const downloadAndProcessAudioFromS3 = async (
  source: string,
  tempDir: string
) => {
  try {
    const { Body } = await s3.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: source })
    );

    const tempFilePath = path.join(tempDir, source);
    const fileStream = createWriteStream(tempFilePath);

    await new Promise<void>((resolve, reject) => {
      (Body as NodeJS.ReadableStream)
        .pipe(fileStream)
        .on("finish", () => {
          console.log("File download finished");
          resolve();
        })
        .on("error", () => {
          console.log("File download failed");
          reject();
        });
    });

    return processAudioToText(tempFilePath);
  } catch (err) {
    console.log("Some error with whisper could not generate text from audio");
    console.log(err);
  }
};

export const processAudioToText = async (file: string) => {
  try {
    console.log("Processing audio to text");

    const text = await nodewhisper(file, {
      modelName: "small.en",
      autoDownloadModelName: "small.en",
      removeWavFileAfterTranscription: true,
      withCuda: false,
    });

    const cleanedText = cleanWhisperOutput(text);
    return cleanedText;
  } catch (err) {
    console.log("Some error with whisper could not generate text from audio");
    console.log(err);
  }
};

function cleanWhisperOutput(raw: string): string {
  return raw
    .replace(
      /\[\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}\]\s*/g,
      ""
    )
    .replace(/^\s+|\s+$/gm, "")
    .replace(/^\s*$/gm, "")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}
