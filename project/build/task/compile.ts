import path from "node:path";
import { spawn } from "bun";
import { logHeader, streamToString } from "../project";

export const compile = async (entryPoint: string) => {
    logHeader("Compiling executable");

    try {
        const absoluteEntryPoint = path.join("./dist/src/ide", entryPoint);
        const outfile = path.resolve("./dist/server");
        const bunBuildArgs = ["bun", "build", "--compile", "--sourcemap", absoluteEntryPoint, "--outfile", outfile];

        const buildProcess = spawn(bunBuildArgs);
        const buildResult = await buildProcess.exited;
        if (buildResult !== 0) {
            const stderr = await streamToString(buildProcess.stderr);
            throw new Error(`Compilation failed: ${stderr || "unknown"}`);
        }

        console.log("Executable built successfully!");
    } catch (error) {
        console.error("Error building executable:", error);
        throw error;
    }
};
