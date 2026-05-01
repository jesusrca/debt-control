import { fromPath } from 'pdf2pic';
import Anthropic from '@anthropic-ai/sdk';
import { getUploadById, createUploadTransaction, updateUploadStatus } from './uploadService.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.minimax.io/anthropic',
});

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  confidence: number;
  raw_text: string;
}

async function convertPdfToImages(filePath: string): Promise<string[]> {
  try {
    const outputDir = './uploads/temp';

    const converter = fromPath(filePath, {
      density: 150,
      saveFilename: 'page',
      savePath: outputDir,
      format: 'png',
      width: 1200,
      height: 1600,
    });

    const result = await converter(1);

    if (Array.isArray(result) && result.length > 0) {
      return result.map((r) => {
        if (typeof r === 'string') return r;
        return (r as { path?: string }).path || '';
      }).filter(Boolean);
    }

    return [];
  } catch (error) {
    console.error('PDF conversion error:', error);
    return [];
  }
}

async function analyzeImageWithVision(imagePath: string): Promise<string> {
  try {
    const fs = await import('fs');
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const response = await anthropic.messages.create({
      model: 'MiniMax-M2.7',
      max_tokens: 2048,
      system: `You are a document analysis assistant for bank statements. Extract transactions in JSON format.

Return a JSON array of transactions, each with:
- date: ISO date string or date description
- description: transaction description
- amount: positive number for debits, negative for credits
- type: "debit" or "credit"

Example: [{"date": "2026-05-01", "description": "Netflix subscription", "amount": 15.99, "type": "debit"}]`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: 'Extract all bank transactions from this document. Return ONLY valid JSON array.',
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return text;
  } catch (error) {
    console.error('Vision API error:', error);
    throw error;
  }
}

export function parseTransactionsFromResponse(responseText: string): ExtractedTransaction[] {
  try {
    let jsonStr = responseText.trim();

    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const transactions = JSON.parse(jsonStr);

    return transactions.map((t: { date?: string; description?: string; amount?: number; type?: string; raw_text?: string }) => {
      const rawAmount = t.amount ?? 0;
      let amount = Math.abs(rawAmount);
      let type: 'debit' | 'credit' = 'debit';

      if (rawAmount < 0 || t.type === 'credit') {
        type = 'credit';
        amount = Math.abs(rawAmount);
      }

      return {
        date: t.date || new Date().toISOString().split('T')[0],
        description: t.description || 'Unknown',
        amount,
        type,
        confidence: 85,
        raw_text: JSON.stringify(t),
      };
    });
  } catch (error) {
    console.error('Failed to parse transactions:', error);
    return [];
  }
}

export async function analyzeUpload(uploadId: string): Promise<{ success: boolean; transactionsExtracted: number; error?: string }> {
  const upload = getUploadById(uploadId);

  if (!upload) {
    return { success: false, transactionsExtracted: 0, error: 'Upload not found' };
  }

  updateUploadStatus(uploadId, 'analyzing');

  try {
    let imagePaths: string[] = [];

    if (upload.file_type === 'pdf') {
      imagePaths = await convertPdfToImages(upload.file_path);
    } else {
      imagePaths = [upload.file_path];
    }

    if (imagePaths.length === 0) {
      updateUploadStatus(uploadId, 'failed', 'Failed to convert document to images');
      return { success: false, transactionsExtracted: 0, error: 'Failed to process document' };
    }

    const allTransactions: ExtractedTransaction[] = [];

    // Process all images in parallel
    const analysisResults = await Promise.all(
      imagePaths.map(async (imagePath) => {
        try {
          const responseText = await analyzeImageWithVision(imagePath);
          return parseTransactionsFromResponse(responseText);
        } catch (error) {
          console.error(`Failed to analyze image ${imagePath}:`, error);
          return [];
        }
      })
    );

    for (const transactions of analysisResults) {
      allTransactions.push(...transactions);
    }

    for (const txn of allTransactions) {
      createUploadTransaction(uploadId, {
        rawText: txn.raw_text,
        extractedDate: txn.date,
        extractedDescription: txn.description,
        extractedAmount: txn.amount,
        extractedType: txn.type,
        aiConfidence: txn.confidence,
      });
    }

    updateUploadStatus(uploadId, 'analyzed');

    return {
      success: true,
      transactionsExtracted: allTransactions.length,
    };
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    let errorMessage = 'Analysis failed';

    if (err.status === 429) {
      errorMessage = 'RATE_LIMITED: Too many requests';
    } else if (err.message) {
      errorMessage = err.message;
    }

    updateUploadStatus(uploadId, 'failed', errorMessage);

    return {
      success: false,
      transactionsExtracted: 0,
      error: errorMessage,
    };
  }
}