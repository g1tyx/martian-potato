import { readdir } from 'fs/promises';
import { join } from 'path';

export default async function handler(req, res) {
    try {
        const imagesDirectory = join(process.cwd(), 'images');
        const files = await readdir(imagesDirectory);
        
        // Filter for image files only
        const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
        );
        
        res.status(200).json(imageFiles);
    } catch (error) {
        console.error('Error reading images directory:', error);
        res.status(500).json({ error: 'Unable to read images directory' });
    }
} 