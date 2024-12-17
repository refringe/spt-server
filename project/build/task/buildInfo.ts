import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "bun";
import { streamToString } from "../project";
import { logHeader } from "../project";

export const buildInfo = async () => {
    logHeader("Writing build data");

    try {
        // Fetch the latest Git commit hash
        const gitResult = spawn(["git", "rev-parse", "HEAD"], { stdout: "pipe", stderr: "pipe" });
        const gitResultExited = await gitResult.exited;
        if (gitResultExited !== 0) {
            const stderr = await streamToString(gitResult.stderr);
            console.error("Error getting Git commit hash:", stderr);
            throw new Error(`Failed to get Git commit hash: ${stderr || "unknown"}`);
        }
        const commitHash = await streamToString(gitResult.stdout);

        // Update core.json
        const coreJSONPath = path.normalize("./dist/SPT_Data/Server/configs/core.json");
        try {
            await fs.access(coreJSONPath); // Check if file exists
        } catch (error) {
            console.error(`The core.json could not be found at ${coreJSONPath}`);
            throw error;
        }

        const coreJSON = await fs.readFile(coreJSONPath, "utf8");
        const coreParsed = JSON.parse(coreJSON);

        coreParsed.commit = commitHash || "";
        coreParsed.buildTime = Date.now();

        console.log("Writing build data to core.json");
        await fs.writeFile(coreJSONPath, JSON.stringify(coreParsed, null, 4));

        console.log("Writing build data to build.json");
        const buildJsonPath = path.normalize("./dist/src/ide/build.json");
        await fs.mkdir(path.dirname(buildJsonPath), { recursive: true });
        const buildInfo = {
            commit: coreParsed.commit,
            buildTime: coreParsed.buildTime,
            sptVersion: coreParsed.sptVersion,
        };
        await fs.writeFile(buildJsonPath, JSON.stringify(buildInfo, null, 4));
    } catch (error) {
        console.error("Error writing build data to JSON:", error);
        throw error;
    }
};
