import fs from "node:fs/promises";
import path from "node:path";
import { logHeader } from "../project";

type FileInfo = {
    src: string;
    dest: string;
};

async function copyRecursive(src: string, dest: string) {
    const { readdir, stat, mkdir, copyFile } = fs;

    // Ensure destination directory exists.
    try {
        await mkdir(dest, { recursive: true });
    } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") {
            throw e;
        }
    }

    const entries = await readdir(src);
    for (const entry of entries) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        const stats = await stat(srcPath);

        if (stats.isDirectory()) {
            await copyRecursive(srcPath, destPath);
        } else {
            await copyFile(srcPath, destPath);
        }
    }
}

export const copy = async () => {
    logHeader(`Copying files to './dist/' directory`);

    const destRoot = path.join(__dirname, "../../dist/");
    try {
        const itemsToCopy: FileInfo[] = [
            { src: "./assets", dest: "/SPT_Data/Server" },
            { src: "./src", dest: "/src" },
            { src: "./package.json", dest: "/package.json" },
            { src: "../LICENSE.md", dest: "/LICENSE-Server.md" },
        ];

        for (const item of itemsToCopy) {
            const normalizedSrc = path.normalize(item.src);
            const normalizedDest = path.join(destRoot, item.dest);
            try {
                const srcStat = await fs.stat(normalizedSrc);
                if (srcStat.isDirectory()) {
                    await copyRecursive(normalizedSrc, normalizedDest);
                } else {
                    await fs.mkdir(path.dirname(normalizedDest), { recursive: true });
                    await fs.copyFile(normalizedSrc, normalizedDest);
                }
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                    console.error(`File not found: ${normalizedSrc}`);
                } else {
                    throw error;
                }
            }
        }

        console.log("Files copied to './dist/'");
    } catch (error) {
        console.error("Error copying files:", error);
    }
};
