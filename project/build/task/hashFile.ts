import crypto from "node:crypto";
import type { PathLike } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { logHeader } from "../project";

interface AssetData {
    [key: string]: string | AssetData;
}

const generateHashForData = (data: crypto.BinaryLike): string => {
    const hashSum = crypto.createHash("sha1");
    hashSum.update(data);
    return hashSum.digest("hex");
};

const loadRecursiveAsync = async (filepath: PathLike): Promise<AssetData> => {
    const result: AssetData = {};

    try {
        const filesList = await fsp.readdir(filepath);

        for (const file of filesList) {
            const currentPath = path.join(filepath.toString(), file);
            const stats = await fsp.stat(currentPath);

            if (stats.isDirectory()) {
                result[file] = await loadRecursiveAsync(currentPath);
            } else if (path.extname(file) === ".json") {
                const fileContent = await fsp.readFile(currentPath);
                result[path.parse(file).name] = generateHashForData(fileContent);
            }
        }
    } catch (error) {
        console.error(`Error reading directory or file: ${filepath}`, error);
        return {};
    }

    return result;
};

export const hashFile = async () => {
    logHeader("Creating verification file");

    try {
        const hashFileDir = path.normalize("./dist/SPT_Data/Server/checks.dat");
        const assetData = await loadRecursiveAsync("./assets");
        const assetDataString = Buffer.from(JSON.stringify(assetData), "utf-8").toString("base64");

        await fsp.writeFile(hashFileDir, assetDataString);
        console.log("Created `checks.dat` verification file");
    } catch (error) {
        console.error("Error creating `checks.dat` file:", error);
        throw error;
    }
};
