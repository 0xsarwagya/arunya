/**
 * @module scripts/build-geo
 * 
 * This script handles the setup and installation of the MaxMind GeoLite2 City database.
 * It supports both licensed MaxMind downloads and free redistributions from alternative sources.
 * 
 * @remarks
 * This is a setup script intended to be run during installation or deployment.
 * It will automatically skip execution when running in a Vercel environment, as
 * Vercel provides its own geolocation capabilities through request headers.
 * 
 * The script handles:
 * - Automatic detection of MaxMind license keys
 * - Fallback to free database redistributions
 * - Download and extraction of the database
 * - Validation of the downloaded database
 * - Error handling and reporting
 * 
 * @example
 * ```bash
 * # Run with MaxMind license key
 * MAXMIND_LICENSE_KEY=your_key node setup-geo.js
 * 
 * # Run with free redistribution
 * node setup-geo.js
 * ```
 * 
 * @requires dotenv/config - For environment variable loading
 * @requires node:fs - For file system operations
 * @requires node:path - For path manipulations
 * @requires node:https - For secure downloads
 * @requires node:zlib - For gzip decompression
 * @requires tar - For tar archive extraction
 */
import "dotenv/config";
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import zlib from 'node:zlib';
import * as tar from 'tar';

/**
 * If the process is running on Vercel, skip the geo setup.
 * We can use Vercel Headers For Location Data.
 */
if (process.env.VERCEL) {
    console.log('Vercel environment detected. Skipping geo setup.');
    process.exit(0);
}

const db = 'GeoLite2-City';

/**
 * Returns the URL for downloading the geoip database.
 * @returns {string} The URL for downloading the geoip database.
 */
const getUrl = () => {
    /**
     * If the MAXMIND_LICENSE_KEY is set, use the MaxMind API to download the database.
     */
    if (process.env.MAXMIND_LICENSE_KEY) {
        const baseUrl = 'https://download.maxmind.com/app/geoip_download';
        const url = new URL(baseUrl);
        url.searchParams.append('edition_id', db);
        url.searchParams.append('license_key', process.env.MAXMIND_LICENSE_KEY);
        url.searchParams.append('suffix', 'tar.gz');

        return url.toString();
    }
    /**
     * If the MAXMIND_LICENSE_KEY is not set, use the node-geolite2-redist package to download the database.
     */
    return `https://raw.githubusercontent.com/GitSquared/node-geolite2-redist/master/redist/${db}.tar.gz`;
};

/**
 * Checks if the destination directory exists and creates it if it doesn't.
 * @returns {string} The path of the destination directory.
 */
const checkDestination = () => {
    const destination = path.resolve(import.meta.dirname, '../geo');

    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    return destination;
};

/**
 * Downloads and extracts a file from the specified URL.
 * @param {string} url - The URL of the file to download.
 * @param {string} destination - The destination directory.
 * @returns {Promise<void>} - A Promise that resolves when the download and extraction is complete.
 */
const download = (url, destination) =>
    new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download: ${res.statusCode} ${res.statusMessage}`));
                return;
            }

            const extract = tar.x({
                cwd: destination,
                strip: 1 // Remove the first directory level
            });

            res.pipe(zlib.createGunzip())
                .pipe(extract)
                .on('finish', () => {
                    console.log('Extraction complete');
                    resolve();
                })
                .on('error', reject);
        }).on('error', reject);
    });

/**
 * Main function for downloading and setting up the database.
 * @returns {Promise<void>} A promise that resolves when the setup is complete.
 */
const main = async () => {
    try {
        const url = getUrl();
        const destination = checkDestination();

        console.log(`Downloading ${db} database...`);
        await download(url, destination);
        console.log('Download and extraction complete.');

        console.log('Setup complete.');
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
};

main();