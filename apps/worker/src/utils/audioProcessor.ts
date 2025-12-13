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
    let tempFilePath: string = "";
    try {
      const { Body } = await s3.send(
        new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: source })
      );

      tempFilePath = path.join(tempDir, source);
      const fileStream = createWriteStream(tempFilePath);

      await new Promise<void>((resolve, reject) => {
        (Body as NodeJS.ReadableStream)
          .pipe(fileStream)
          .on("finish", () => {
            resolve();
          })
          .on("error", () => {
            reject();
          });
      });
    } catch (err) {
      throw {
        errorMessage: "Accessing audio file faced some issues",
      };
    }
    return processAudioToText(tempFilePath);
  } catch (err) {
    const errorMessage = (err as { errorMessage: string }).errorMessage;
    throw {
      errorMessage:
        errorMessage ||
        "Downloading and processing audio file faced some errors",
    };
  }
};

export const processAudioToText = async (file: string) => {
  try {
    const text = await nodewhisper(file, {
      modelName: "tiny.en",
      autoDownloadModelName: "tiny.en",
      removeWavFileAfterTranscription: true,
      withCuda: false,
    });

    const cleanedText = cleanWhisperOutput(text);
    return cleanedText;
  } catch (err) {
    throw { errorMessage: "Whisper audio processing faces some errors" };
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
