#!/usr/bin/env node
/**
 * sukkiri_mail アプリアイコン生成スクリプト
 * Leonardo AI を使用して 1024x1024px のアプリアイコンを生成
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.LEONARDO_API_KEY;
if (!API_KEY) {
  console.error("Error: LEONARDO_API_KEY environment variable not set");
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, "../assets/app_icon");
const ICON_FILE = path.join(OUTPUT_DIR, "app_icon_1024.png");

// すっきりメール用のプロンプト
const PROMPT = `
A clean, modern app icon for an email management app called "Sukkiri Mail" (meaning "Clean Mail").
The icon features a minimalist mail envelope with a subtle filter/checkmark symbol integrated into the design.
Color scheme: Fresh blue (#3457C9) and white with light green (#1F8A5F) accent.
Style: Modern, flat design, professional, minimal clutter.
The design conveys organization, clarity, and relief from email overload.
Background: Transparent or soft gradient.
High quality, professional app icon suitable for iOS and Android.
`;

const NEGATIVE_PROMPT =
  "text, watermark, letters, words, logo text, blurry, low quality, distorted, messy";

async function generateIcon() {
  console.log("🎨 Generating sukkiri_mail app icon...");
  console.log(`Output: ${ICON_FILE}`);

  // Check if file already exists
  if (fs.existsSync(ICON_FILE)) {
    console.log("✓ Icon already exists, skipping generation");
    return;
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    const imageBuffer = await generateImageViaLeonardo(PROMPT, NEGATIVE_PROMPT);
    fs.writeFileSync(ICON_FILE, imageBuffer);
    console.log("✅ Icon generated successfully");
    console.log(`File size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error("❌ Error generating icon:", error.message);
    process.exit(1);
  }
}

async function generateImageViaLeonardo(prompt, negativePrompt) {
  return new Promise((resolve, reject) => {
    const requestBody = {
      prompt: prompt,
      negative_prompt: negativePrompt,
      num_images: 1,
      width: 1024,
      height: 1024,
      modelId: "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3", // Leonardo Phoenix 1.0
      guidance_scale: 7,
      seed: 42, // Fixed seed for consistency
      alchemy: false,
      photoReal: false,
    };

    const options = {
      hostname: "api.leonardo.ai",
      path: "/api/rest/v1/generations",
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", async () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Leonardo API error: ${res.statusCode} - ${data}`));
          return;
        }

        try {
          const response = JSON.parse(data);
          if (
            !response.sdGenerationJob ||
            !response.sdGenerationJob.generationId
          ) {
            reject(new Error("No generation ID in response"));
            return;
          }

          // Poll for completion
          const generationId = response.sdGenerationJob.generationId;
          const imageBuffer = await pollForCompletion(generationId);
          resolve(imageBuffer);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", reject);
    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

async function pollForCompletion(generationId, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const poll = () => {
      attempts++;

      const options = {
        hostname: "api.leonardo.ai",
        path: `/api/rest/v1/generations/${generationId}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      };

      https.get(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", async () => {
          try {
            const response = JSON.parse(data);
            const generation = response.generations_by_pk;

            if (generation.status === "COMPLETE") {
              if (!generation.generated_images || !generation.generated_images[0]) {
                reject(new Error("No images in generation result"));
                return;
              }

              const imageUrl = generation.generated_images[0].url;
              const imageBuffer = await downloadImage(imageUrl);
              resolve(imageBuffer);
            } else if (generation.status === "FAILED") {
              reject(new Error("Generation failed"));
            } else {
              console.log(
                `⏳ Generating... (attempt ${attempts}/${maxAttempts})`
              );
              if (attempts >= maxAttempts) {
                reject(new Error("Generation timeout"));
              } else {
                setTimeout(poll, 2000);
              }
            }
          } catch (error) {
            reject(error);
          }
        });
      }).on("error", reject);
    };

    poll();
  });
}

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    }).on("error", reject);
  });
}

// Run
generateIcon().catch(console.error);
