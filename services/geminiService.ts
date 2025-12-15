import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

interface ExtractedData {
  text: string;
  images: Array<{
    inlineData: {
      mimeType: string;
      data: string;
    }
  }>;
}

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

const extractDataFromDocx = async (file: File): Promise<ExtractedData> => {
  const arrayBuffer = await file.arrayBuffer();
  const extractedImages: Array<{ inlineData: { mimeType: string; data: string } }> = [];

  // Custom image converter to extract images out of the HTML flow
  // to save tokens (native image parts are cheaper than base64 text)
  const options = {
    convertImage: mammoth.images.imgElement(function(image: any) {
      return image.read("base64").then(function(imageBuffer: string) {
        const mimeType = image.contentType;
        // Push to our collection
        extractedImages.push({
          inlineData: {
            mimeType: mimeType,
            data: imageBuffer
          }
        });
        // Return a placeholder in the HTML
        return {
          src: "", 
          alt: `[Extracted Image - Refer to Image Part ${extractedImages.length}]`
        };
      });
    })
  };

  const result = await mammoth.convertToHtml({ arrayBuffer }, options);
  
  return {
    text: `Content from Word Document (${file.name}) [Format: HTML with extracted images]:\n${result.value}`,
    images: extractedImages
  };
};

const extractTextFromExcel = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  let text = `Content from Excel File (${file.name}):\n`;
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    // Convert to CSV for structure preservation
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    // Limit huge sheets to avoid token limits (arbitrary safety cap of ~50k chars per sheet)
    const safeCsv = csv.length > 50000 ? csv.substring(0, 50000) + "\n...[Truncated]..." : csv;
    text += `Sheet: ${sheetName}\n${safeCsv}\n\n`;
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
        // Updated to extract images separately
        const { text, images } = await extractDataFromDocx(file);
        parts.push({ text: text });
        // Append extracted images as separate parts
        if (images && images.length > 0) {
          parts.push(...images);
        }
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
      // Assume image file
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

  // Construct the prompt
  let finalPrompt = "Task: Extract social media data for EVERY entry found in these files.\n\nSOURCE MATERIAL NOTE:\n- Input contains text (HTML/CSV) and images.\n- Word documents have been converted to HTML; images from the docs are attached as separate image inputs. Look for data in both the HTML tables and the attached images.\n\nCRITICAL QUALITY CHECKS:\n1. Look closely at numbers. Do not confuse '8' with '3' or '0'.\n2. Do not summarize. List every single row.\n3. Output ONLY the TSV table.";
  
  if (platform && platform !== 'Auto-detect') {
    finalPrompt += `\n\nPLATFORM CONTEXT: The user specified **${platform}**.\n1. Interpret UI icons based on standard ${platform} interfaces.\n2. Ensure Links follow ${platform} URL patterns.\n3. Verify that 'Followers' and 'Views' counts match typical ${platform} display formats (e.g. check for 'K', 'M', '万').`;
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
        temperature: 0.1, // Keep low for factual extraction
        maxOutputTokens: 8192,
      }
    });

    return response.text || "No response text generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Enhance error message for user
    if (error.message && error.message.includes("token count exceeds")) {
       throw new Error("The file is too large (too many tokens). Please try splitting the document or removing large images.");
    }
    throw new Error("Failed to process files. Please try again.");
  }
};