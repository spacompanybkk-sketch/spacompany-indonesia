/**
 * Generate replacement images for dmjeurope.com and spa-company.com using DALL-E 3
 * Run: node scripts/generate-images.js
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'generated-images');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const images = [
  {
    filename: 'thai-worker-owner.png',
    prompt: `Professional photograph of a European business manager in his 30s wearing a navy blazer shaking hands with a Thai female spa therapist in a clean white spa uniform. They are standing in a modern, bright hotel spa lobby. Both are smiling warmly and professionally. The setting has green plants, warm lighting, and a clean modern interior. Corporate partnership feel. Photorealistic, high quality, no text or watermarks.`,
    size: '1792x1024',
  },
  {
    filename: 'asian-engineer-site.jpg',
    prompt: `Professional photograph of a Southeast Asian male factory worker wearing a yellow hard hat and orange safety vest, working confidently at a modern European automotive manufacturing plant. He is operating CNC machinery or inspecting parts. The factory floor is clean, well-lit, with modern industrial equipment in the background. The worker looks skilled, focused, and dignified. Photorealistic, high quality, no text or watermarks.`,
    size: '1792x1024',
  },
  {
    filename: 'receptionist-founder.jpg',
    prompt: `Professional corporate headshot portrait of a young European businessman in his early 30s, wearing a dark navy suit jacket over a white open-collar shirt. He has short brown hair, light stubble, and a confident warm smile. The background is a modern minimalist office with soft bokeh blur. Warm natural lighting from the side. CEO or founder professional portrait style. Photorealistic, high quality, no text or watermarks.`,
    size: '1024x1024',
  },
  {
    filename: 'Main2-find-personnel.png',
    prompt: `Professional marketing image for a recruitment company. Show a modern laptop screen displaying a clean candidate profile database with small profile photos and green checkmarks. A hand is pointing at one candidate profile. The color scheme uses lime green (#a9cf54) accents on a white background. Clean, modern, corporate recruitment technology feel. The scene is on a clean white desk with subtle office elements. Photorealistic, high quality, no text or watermarks.`,
    size: '1792x1024',
  },
  {
    filename: 'Main3-guarantees.png',
    prompt: `Professional marketing image representing trust and guarantees for a recruitment company. Show a professional handshake between two businesspeople (one European, one Asian) in front of a large green shield icon with a white checkmark. The background has subtle document icons and verification stamps. Color scheme uses lime green (#a9cf54) and white. Clean, modern, corporate feel conveying reliability and security. Photorealistic with subtle graphic elements, high quality, no text or watermarks.`,
    size: '1792x1024',
  },
];

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateImage(imageConfig) {
  console.log(`\nGenerating: ${imageConfig.filename}...`);

  try {
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt: imageConfig.prompt,
      n: 1,
      size: imageConfig.size,
      quality: 'hd',
      style: 'natural',
    });

    const imageUrl = response.data[0].url;
    const revisedPrompt = response.data[0].revised_prompt;

    console.log(`  Revised prompt: ${revisedPrompt?.substring(0, 100)}...`);
    console.log(`  Downloading...`);

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const outputPath = path.join(outputDir, imageConfig.filename);
    fs.writeFileSync(outputPath, buffer);

    console.log(`  Saved to: ${outputPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (error) {
    console.error(`  ERROR: ${error.message}`);
    return false;
  }
}

// Generate all images sequentially
console.log('=== Generating replacement images with DALL-E 3 ===\n');
let success = 0;
let failed = 0;

for (const img of images) {
  const result = await generateImage(img);
  if (result) success++;
  else failed++;
}

console.log(`\n=== Done: ${success} generated, ${failed} failed ===`);
console.log(`Images saved to: ${outputDir}`);
