import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "bun";
import * as tar from "tar";
import manifest from "../../package.json" assert { type: "json" };
import { streamToString, targetArch, targetPlatform } from "../project";
import { logHeader } from "../project";

export const pnpm = async () => {
    logHeader(`Downloading pnpm for ${targetPlatform}-${targetArch}`);

    try {
        // Get the version of pnpm we need from the package.json.
        const pnpmVersion = manifest.devDependencies["@pnpm/exe"];
        if (!pnpmVersion) {
            throw new Error("Could not find @pnpm/exe in devDependencies");
        }

        // Determine pnpm package name based on the target platform and architecture, defaulting to the windows version.
        const pnpmPackageName = `@pnpm/${targetPlatform === "win32" ? "win" : targetPlatform}-${targetArch}`;

        // Get the tarball URL for the pnpm binary.
        const npmView = spawn(["npm", "view", `${pnpmPackageName}@${pnpmVersion}`, "dist.tarball"]);
        const npmViewResult = await npmView.exited;
        if (npmViewResult !== 0) {
            const stderr = await streamToString(npmView.stderr);
            throw new Error(`Failed to get pnpm tarball URL: ${stderr || "unknown"}`);
        }

        // Fetch the tarball URL from the npm view command.
        const pnpmLink = await streamToString(npmView.stdout);
        if (!pnpmLink) {
            throw new Error("Could not determine pnpm tarball URL");
        }

        console.log(`Downloading pnpm binary from ${pnpmLink}`);
        const response = await fetch(pnpmLink);
        if (!response.ok) {
            throw new Error(`Failed to download pnpm: ${response.status} ${response.statusText}`);
        }
        if (!response.body) {
            throw new Error("Failed to download pnpm: response body is null");
        }

        // Create the pnpm directory
        const pnpmDir = path.normalize("./dist/SPT_Data/Server/@pnpm/exe");
        await fs.mkdir(pnpmDir, { recursive: true });

        // Create a temporary file path for the tarball
        const tempDir = tmpdir();
        const tempFilePath = path.join(tempDir, "pnpm.tgz");

        // Convert the ReadableStream to a Blob
        const blob = await Bun.readableStreamToBlob(response.body);

        // Write the Blob to the temporary filepath
        await Bun.write(tempFilePath, blob);

        // Extract the tarball from the temporary file
        await tar.x({
            cwd: pnpmDir,
            strip: 1,
            file: tempFilePath,
            gzip: true,
        });

        // Delete the temporary file
        await fs.rm(tempFilePath);

        console.log("Downloaded and extracted pnpm binary");
    } catch (error) {
        console.error("Error downloading pnpm:", error);
        throw error;
    }
};
