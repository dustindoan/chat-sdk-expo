/**
 * Direct test of local LLM inference - bypasses all AI SDK layers
 *
 * Usage: Import and call testDirectInference() from a button or useEffect
 * Check console logs for token-by-token output
 */

import { Platform } from 'react-native';

// Only import llama on native platforms
let llama: any = null;
if (Platform.OS !== 'web') {
  try {
    const llamaModule = require('@react-native-ai/llama');
    llama = llamaModule.llama;
  } catch (e) {
    console.error('[directTest] Failed to import llama:', e);
  }
}

export async function testDirectInference(prompt: string = "Say hello in one short sentence.") {
  console.log('[directTest] ========================================');
  console.log('[directTest] Starting direct inference test');
  console.log('[directTest] Prompt:', prompt);
  console.log('[directTest] ========================================');

  if (!llama) {
    console.error('[directTest] llama module not available');
    return;
  }

  try {
    // Create model instance
    const model = llama.languageModel('google/gemma-2-2b-it-GGUF');
    console.log('[directTest] Model created');

    // Check if downloaded
    const isDownloaded = await model.isDownloaded();
    console.log('[directTest] isDownloaded:', isDownloaded);

    if (!isDownloaded) {
      console.log('[directTest] Downloading model...');
      await model.download((progress: { percentage: number }) => {
        console.log('[directTest] Download progress:', progress.percentage + '%');
      });
    }

    // Prepare the model
    console.log('[directTest] Preparing model...');
    await model.prepare();
    console.log('[directTest] Model prepared');

    // Now test at different levels:

    // Level 1: Use the native context directly
    console.log('[directTest] --- Level 1: Direct context.completion ---');
    const context = (model as any).context;

    if (context) {
      const tokens: string[] = [];
      let tokenCount = 0;

      const result = await context.completion(
        {
          messages: [{ role: 'user', content: prompt }],
          n_predict: 100,
        },
        (tokenData: { token: string }) => {
          tokenCount++;
          tokens.push(tokenData.token);
          console.log(`[directTest] Token ${tokenCount}: "${tokenData.token}" (length: ${tokenData.token.length})`);
        }
      );

      console.log('[directTest] --- Completion finished ---');
      console.log('[directTest] Total tokens:', tokenCount);
      console.log('[directTest] Full response:', tokens.join(''));
      console.log('[directTest] First 3 tokens:', tokens.slice(0, 3));
      console.log('[directTest] Result object:', JSON.stringify(result, null, 2));
    } else {
      console.error('[directTest] No context available on model');
    }

    // Level 2: Use the AI SDK interface (doGenerate - non-streaming)
    console.log('[directTest] --- Level 2: AI SDK doGenerate (non-streaming) ---');
    try {
      const generateResult = await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      });
      console.log('[directTest] doGenerate result:', JSON.stringify(generateResult, null, 2));
    } catch (e) {
      console.error('[directTest] doGenerate error:', e);
    }

    // Level 3: Use the AI SDK streaming interface (doStream)
    console.log('[directTest] --- Level 3: AI SDK doStream (streaming) ---');
    try {
      const streamResult = await model.doStream({
        prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      });

      console.log('[directTest] doStream returned, reading stream...');
      const reader = streamResult.stream.getReader();
      let chunkCount = 0;
      const chunks: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunkCount++;
        chunks.push(value);
        console.log(`[directTest] Stream chunk ${chunkCount}:`, JSON.stringify(value));
      }

      console.log('[directTest] Stream finished');
      console.log('[directTest] Total chunks:', chunkCount);
      console.log('[directTest] text-delta chunks:', chunks.filter(c => c.type === 'text-delta').length);

      // Extract text from chunks
      const text = chunks
        .filter(c => c.type === 'text-delta')
        .map(c => c.delta)
        .join('');
      console.log('[directTest] Assembled text:', text);

    } catch (e) {
      console.error('[directTest] doStream error:', e);
    }

    // Cleanup
    await model.unload();
    console.log('[directTest] Model unloaded');

  } catch (error) {
    console.error('[directTest] Error:', error);
  }

  console.log('[directTest] ========================================');
  console.log('[directTest] Test complete');
  console.log('[directTest] ========================================');
}

/**
 * Simpler version that just tests the context.completion callback
 */
export async function testTokenCallback() {
  console.log('[testTokenCallback] Starting...');

  if (!llama) {
    console.error('[testTokenCallback] llama not available');
    return;
  }

  const model = llama.languageModel('google/gemma-2-2b-it-GGUF');

  const isDownloaded = await model.isDownloaded();
  if (!isDownloaded) {
    console.log('[testTokenCallback] Model not downloaded, downloading...');
    await model.download(() => {});
  }

  await model.prepare();

  const context = (model as any).context;
  const tokens: string[] = [];

  await context.completion(
    {
      messages: [{ role: 'user', content: 'Hi' }],
      n_predict: 20,
    },
    (tokenData: { token: string }) => {
      tokens.push(tokenData.token);
      console.log(`[testTokenCallback] Token: "${tokenData.token}"`);
    }
  );

  console.log('[testTokenCallback] All tokens:', tokens);
  console.log('[testTokenCallback] Joined:', tokens.join(''));

  await model.unload();
}
