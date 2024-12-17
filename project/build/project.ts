import minimist from "minimist";
import { buildInfo } from "./task/buildInfo";
import { cleanPost, cleanPre } from "./task/clean";
import { compile } from "./task/compile";
import { copy } from "./task/copy";
import { hashFile } from "./task/hashFile";
import { pnpm } from "./task/pnpm";
//import { updateBuildProperties } from "./task/updateBuildProperties";

const knownOptions = { string: ["arch", "platform"], default: { arch: process.arch, platform: process.platform } };
const options = minimist(process.argv.slice(2), knownOptions);
export const targetArch = options.arch;
export const targetPlatform = options.platform;

export function logHeader(taskName: string) {
    console.log(`\n=== ${taskName.toUpperCase()} ===`);
}

const entries = {
    release: "ReleaseEntry.ts",
    debug: "DebugEntry.ts",
    bleeding: "BleedingEdgeEntry.ts",
    bleedingmods: "BleedingEdgeModsEntry.ts",
};

const runBuild = async (packagingType: keyof typeof entries) => {
    logHeader(`Running build ${packagingType}`);
    await cleanPre();
    await copy();
    await pnpm();
    await buildInfo();
    await hashFile();
    await compile(entries[packagingType]);
    await cleanPost();
    //await updateBuildProperties();
};

if (process.argv.includes("build:debug")) {
    await runBuild("debug");
}
if (process.argv.includes("build:release")) {
    await runBuild("release");
}
if (process.argv.includes("build:bleeding")) {
    await runBuild("bleeding");
}
if (process.argv.includes("build:bleedingmods")) {
    await runBuild("bleedingmods");
}

if (process.argv.includes("run:build")) {
    const { exec } = require("node:child_process");
    exec("./build/SPT.Server.exe", { cwd: "build" }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });
}

if (process.argv.includes("run:debug")) {
    const { exec } = require("node:child_process");
    exec("bun run src/ide/TestEntry.ts", (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });
}

export async function streamToString(stream: ReadableStream<Uint8Array> | null): Promise<string | null> {
    if (!stream) return null; // Handle null stream

    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            if (value) chunks.push(value); // Check if value is not null/undefined
        }
    } catch (error) {
        console.error("Error reading stream:", error);
        return null; // Handle stream reading errors
    }
    const allChunks = new Uint8Array(chunks.flatMap((chunk) => Array.from(chunk)));
    return new TextDecoder().decode(allChunks);
}
