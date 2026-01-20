const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const sharp = require('sharp');

// Configuration
const SEARCH_DIR = process.cwd(); // Run in current directory
const TOLERANCE_PX = 2; // Tolerance for height difference (approximating user's "2px/inch" intent as "2px total difference")

async function main() {
    console.log('Searching for JPG files...');

    // Find all jpg/jpeg files recursively
    const files = await glob('**/*.{jpg,jpeg,JPG,JPEG}', {
        cwd: SEARCH_DIR,
        absolute: true,
        ignore: ['**/*_copy.jpg', '**/*_merged.jpg', '**/node_modules/**'] // Ignore already merged files or node_modules
    });

    if (files.length === 0) {
        console.log('No JPG files found.');
        return;
    }

    // Group files by directory to ensure we only merge files within the same folder
    const filesByDir = {};
    files.forEach(file => {
        const dir = path.dirname(file);
        if (!filesByDir[dir]) filesByDir[dir] = [];
        filesByDir[dir].push(file);
    });

    // Process each directory
    for (const dir of Object.keys(filesByDir)) {
        const dirFiles = filesByDir[dir].sort(); // Sort alphabetically

        console.log(`\nProcessing directory: ${dir}`);
        if (dirFiles.length < 2) {
            console.log('  Not enough files to merge.');
            continue;
        }

        // Pair files: 1+2, 3+4, ...
        for (let i = 0; i < dirFiles.length; i += 2) {
            if (i + 1 >= dirFiles.length) {
                console.log(`  Skipping single file: ${path.basename(dirFiles[i])}`);
                break;
            }

            const file1 = dirFiles[i];
            const file2 = dirFiles[i + 1];
            const filename1 = path.basename(file1, path.extname(file1));

            // Output filename: OriginalName_copy.jpg (using first file's name)
            const outputFilename = `${filename1}_copy.jpg`;
            const outputPath = path.join(dir, outputFilename);

            if (fs.existsSync(outputPath)) {
                console.log(`  Skipping (already exists): ${outputFilename}`);
                continue;
            }

            try {
                const img1 = sharp(file1);
                const img2 = sharp(file2);

                const meta1 = await img1.metadata();
                const meta2 = await img2.metadata();

                // Check validation: Height difference
                const heightDiff = Math.abs(meta1.height - meta2.height);

                if (heightDiff > TOLERANCE_PX) {
                    console.warn(`  [WARNING] Height mismatch detected for ${path.basename(file1)} (${meta1.height}px) and ${path.basename(file2)} (${meta2.height}px). Diff: ${heightDiff}px`);
                } else {
                    // Ideally we might resize to match, but user asked for warning. 
                    // We will proceed to merge anyway, taking the max height.
                }

                const maxHeight = Math.max(meta1.height, meta2.height);
                const totalWidth = meta1.width + meta2.width;

                // Composite
                await sharp({
                    create: {
                        width: totalWidth,
                        height: maxHeight,
                        channels: 3,
                        background: { r: 255, g: 255, b: 255 }
                    }
                })
                    .composite([
                        { input: file1, left: 0, top: 0 },
                        { input: file2, left: meta1.width, top: 0 } // Align top
                    ])
                    .jpeg({ quality: 90 })
                    .toFile(outputPath);

                console.log(`  Merged: ${path.basename(file1)} + ${path.basename(file2)} -> ${outputFilename}`);

            } catch (err) {
                console.error(`  Error merging ${path.basename(file1)} and ${path.basename(file2)}:`, err.message);
            }
        }
    }
    console.log('\nDone.');
}

main().catch(err => console.error(err));
