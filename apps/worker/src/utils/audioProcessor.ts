import { nodewhisper } from "nodejs-whisper";

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
