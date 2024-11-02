import * as fs from 'fs';
import * as path from 'path';

function getBase64Image(imagePath: string): { base64: string; mimeType: string } {
   
    const buffer = fs.readFileSync(imagePath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();

    let mimeType = '';

    switch (ext) {
        case '.jpg':
        case '.jpeg':
            mimeType = 'image/jpeg';
            break;
        case '.png':
            mimeType = 'image/png';
            break;
        case '.gif':
            mimeType = 'image/gif';
            break;
        case '.bmp':
            mimeType = 'image/bmp';
            break;
        case '.svg':
            mimeType = 'image/svg+xml';
            break;
        default:
            throw new Error('Unsupported image type');
    }

    return { base64, mimeType };
}


export default getBase64Image;