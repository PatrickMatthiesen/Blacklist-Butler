import { getStorage } from 'firebase-admin/storage';

async function fetchFirebaseTextOnce(path: string): Promise<string> {
    const file = getStorage().bucket().file(path);
    const [fileUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60,
    });

    const response = await Bun.fetch(fileUrl);
    const fileContent = await response.text();

    console.log(
        `[firebase-read] ${path} -> ${response.status} ${response.statusText}; content-type=${response.headers.get('content-type') ?? 'unknown'}`
    );

    if (!response.ok) {
        throw new Error(`Firebase read failed for ${path}: ${response.status} ${response.statusText}; body=${fileContent.slice(0, 250)}`);
    }

    return fileContent;
}

export async function readFirebaseText(path: string, attempts = 3): Promise<string> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await fetchFirebaseTextOnce(path);
        } catch (error) {
            lastError = error;
            console.warn(`[firebase-read] attempt ${attempt}/${attempts} failed for ${path}`, error);
        }
    }

    throw lastError;
}
