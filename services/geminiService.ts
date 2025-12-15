import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

const getBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const extractTextFromDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return `Content from Word Document (${file.name}):\n${result.value}`;
};

const extractTextFromExcel = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  let text = `Content from Excel File (${file.name}):\n`;
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    // Convert to CSV for structure preservation
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    text += `Sheet: ${sheetName}\n${csv}\n\n`;
  });
  
  return text;
};

export const processFiles = async (files: File[], platform: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const parts: any[] = [];
  
  for (const file of files) {
    const isDocx = file.name.endsWith('.docx') || file.name.endsWith('.doc');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isDocx) {
      try {
        const textData = await extractTextFromDocx(file);
        parts.push({ text: textData });
      } catch (e) {
        console.error("Failed to parse Word doc", e);
        parts.push({ text: `[Error reading Word file: ${file.name}]` });
      }
    } else if (isExcel) {
      try {
        const textData = await extractTextFromExcel(file);
        parts.push({ text: textData });
      } catch (e) {
        console.error("Failed to parse Excel file", e);
        parts.push({ text: `[Error reading Excel file: ${file.name}]` });
      }
    } else {
      // Assume image
      try {
        const base64Data = await getBase64(file);
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data
          }
        });
      } catch (e) {
         console.error("Failed to process image", e);
      }
    }
  }

  // Construct the prompt with platform context
  let finalPrompt = "Here are the inputs. Please extract the data for EVERY single entry found in these files. Do not summarize. Do not skip any entries. If there are multiple items (e.g. 20 items), you MUST list them ALL. Output the full TSV table.";
  
  if (platform && platform !== 'Auto-detect') {
    finalPrompt += `\n\nCRITICAL INSTRUCTION: The user has explicitly specified that the platform is **${platform}**.\n1. When identifying the UI, assume it belongs to ${platform}.\n2. When generating the 'Link' column, you MUST prioritize the URL format for ${platform}.\n3. Even if the screenshot looks ambiguous, treat it as ${platform} data.`;
  }

  parts.push({
    text: finalPrompt
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,
        maxOutputTokens: 8192, // Explicitly allow for longer outputs to prevent truncation
      }
    });

    return response.text || "No response text generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to process files. Please try again.");
  }
};