import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, statSync, existsSync } from 'fs';
import { RichText } from '@atproto/api';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';
import { OutputFormatter } from '../lib/output.js';

/**
 * Maximum text length for Bluesky posts
 */
const MAX_POST_LENGTH = 300;

/**
 * Maximum number of images per post
 */
const MAX_IMAGES = 4;

/**
 * Maximum image size in bytes (1MB)
 */
const MAX_IMAGE_SIZE = 1024 * 1024;

/**
 * Supported image MIME types
 */
const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Image data structure
 */
interface ImageData {
  path: string;
  alt?: string;
  data: Uint8Array;
  mimeType: string;
}

/**
 * Reads post text from stdin or returns provided text
 */
async function readPostText(text?: string): Promise<string> {
  if (text) {
    return text;
  }

  // Check if stdin is being piped
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8').trim();
  }

  throw new Error('No post text provided. Use: bsky post "text" or echo "text" | bsky post');
}

/**
 * Validates post text length
 */
function validatePostText(text: string): void {
  if (!text || text.trim().length === 0) {
    throw new Error('Post text cannot be empty');
  }

  if (text.length > MAX_POST_LENGTH) {
    throw new Error(`Post text exceeds maximum length of ${MAX_POST_LENGTH} characters (got ${text.length})`);
  }
}

/**
 * Validates AT URI format
 */
function validateAtUri(uri: string): void {
  const atUriPattern = /^at:\/\/did:plc:[a-z0-9]+\/app\.bsky\.feed\.post\/[a-z0-9]+$/;
  if (!atUriPattern.test(uri)) {
    throw new Error('Invalid AT URI format. Expected: at://did:plc:.../app.bsky.feed.post/...');
  }
}

/**
 * Loads and validates image files
 */
async function loadImages(imagePaths: string[], altTexts: string[]): Promise<ImageData[]> {
  if (imagePaths.length > MAX_IMAGES) {
    throw new Error(`Maximum ${MAX_IMAGES} images allowed per post (got ${imagePaths.length})`);
  }

  const images: ImageData[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i]!;
    const alt = altTexts[i] || '';

    // Check file exists
    if (!existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Check file size
    const stats = statSync(imagePath);
    if (stats.size > MAX_IMAGE_SIZE) {
      throw new Error(`Image ${imagePath} exceeds maximum size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB (got ${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    // Determine MIME type from extension
    const extension = imagePath.toLowerCase().match(/\.[^.]+$/)?.[0];
    const mimeType = extension ? SUPPORTED_IMAGE_TYPES[extension] : undefined;

    if (!mimeType) {
      throw new Error(`Unsupported image format for ${imagePath}. Supported: JPEG, PNG, WebP, GIF`);
    }

    // Read image data
    const data = new Uint8Array(readFileSync(imagePath));

    images.push({
      path: imagePath,
      alt,
      data,
      mimeType,
    });
  }

  return images;
}

/**
 * Uploads images to Bluesky and returns blob references
 */
async function uploadImages(auth: any, images: ImageData[]): Promise<any[]> {
  const agent = auth.getAgent();
  const uploadedImages: any[] = [];

  for (const image of images) {
    try {
      const response = await agent.uploadBlob(image.data, {
        encoding: image.mimeType,
      });

      uploadedImages.push({
        alt: image.alt || '',
        image: response.data.blob,
      });
    } catch (error: any) {
      throw new Error(`Failed to upload image ${image.path}: ${error.message}`);
    }
  }

  return uploadedImages;
}

/**
 * Creates the post command
 */
export function createPostCommand(config: ConfigManager): Command {
  const command = new Command('post');

  command
    .description('Create a new post on Bluesky')
    .argument('[text]', 'post text (or read from stdin)')
    .option('-i, --image <path>', 'attach image (can be used multiple times, max 4)', (value, previous: string[]) => {
      return previous ? [...previous, value] : [value];
    }, [] as string[])
    .option('-a, --alt <text>', 'alt text for images (in order)', (value, previous: string[]) => {
      return previous ? [...previous, value] : [value];
    }, [] as string[])
    .option('-r, --reply-to <uri>', 'AT URI of post to reply to')
    .option('-q, --quote <uri>', 'AT URI of post to quote')
    .option('--json', 'output as JSON')
    .action(async (text: string | undefined, options: any) => {
      try {
        // Read post text
        const postText = await readPostText(text);
        validatePostText(postText);

        // Authenticate
        const auth = await requireAuth(config);
        const agent = auth.getAgent();

        // Validate reply-to and quote URIs if provided
        if (options.replyTo) {
          validateAtUri(options.replyTo);
        }
        if (options.quote) {
          validateAtUri(options.quote);
        }

        // Load and upload images if provided
        let imageEmbed: any = undefined;
        if (options.image && options.image.length > 0) {
          const images = await loadImages(options.image, options.alt);
          console.log(chalk.blue(`Uploading ${images.length} image${images.length !== 1 ? 's' : ''}...`));
          const uploadedImages = await uploadImages(auth, images);
          imageEmbed = {
            $type: 'app.bsky.embed.images',
            images: uploadedImages,
          };
        }

        // Process text with RichText for facet detection (@mentions, URLs)
        const rt = new RichText({ text: postText });
        await rt.detectFacets(agent);

        // Build post record
        const postRecord: any = {
          text: rt.text,
          facets: rt.facets,
          createdAt: new Date().toISOString(),
        };

        // Add image embed
        if (imageEmbed) {
          postRecord.embed = imageEmbed;
        }

        // Add quote embed
        if (options.quote) {
          // Fetch quoted post
          try {
            const response = await agent.app.bsky.feed.getPostThread({ uri: options.quote });

            if (!response.success || !response.data.thread) {
              throw new Error('Quoted post not found');
            }

            const thread = response.data.thread;
            if (thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
              throw new Error('Quoted post not found');
            }

            const quotedPost = (thread as any).post;
            postRecord.embed = {
              $type: 'app.bsky.embed.record',
              record: {
                uri: quotedPost.uri,
                cid: quotedPost.cid,
              },
            };
          } catch (error: any) {
            throw new Error(`Failed to fetch quoted post: ${error.message}`);
          }
        }

        // Add reply reference
        if (options.replyTo) {
          // Fetch parent post to get root reference
          try {
            const response = await agent.app.bsky.feed.getPostThread({ uri: options.replyTo });

            if (!response.success || !response.data.thread) {
              throw new Error('Parent post not found');
            }

            const thread = response.data.thread;
            if (thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
              throw new Error('Parent post not found');
            }

            const parentPost = (thread as any).post;

            // Get root reference (if parent is also a reply)
            let rootUri = options.replyTo;
            let rootCid = parentPost.cid;

            if ((parentPost.record as any)?.reply) {
              rootUri = (parentPost.record as any).reply.root.uri;
              rootCid = (parentPost.record as any).reply.root.cid;
            }

            postRecord.reply = {
              root: {
                uri: rootUri,
                cid: rootCid,
              },
              parent: {
                uri: options.replyTo,
                cid: parentPost.cid,
              },
            };
          } catch (error: any) {
            throw new Error(`Failed to fetch parent post: ${error.message}`);
          }
        }

        // Create the post
        const response = await agent.post(postRecord);

        // Format output
        const formatter = new OutputFormatter(
          options.json ? 'json' : 'human',
          config.readConfig().colorOutput
        );

        if (options.json) {
          console.log(JSON.stringify(response, null, 2));
        } else {
          console.log(formatter.formatMessage('Post created successfully!', 'success'));
          console.log(chalk.gray(`URI: ${response.uri}`));
          console.log(chalk.gray(`CID: ${response.cid}`));
        }
      } catch (error: any) {
        if (error.message.includes('Not logged in')) {
          console.error(chalk.red('Error: Not logged in. Run "bsky login" first.'));
        } else {
          console.error(chalk.red(`Error: ${error.message}`));
        }
        process.exit(1);
      }
    });

  return command;
}
