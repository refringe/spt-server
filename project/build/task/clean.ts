import fs from "node:fs/promises";
import path from "node:path";
import { logHeader } from "../project";

export const cleanPre = async () => {
    logHeader("Pre-build Clean");
    try {
        await fs.rm(path.normalize("./dist/"), { recursive: true, force: true });
        console.log("Build './dist' directory cleaned.");
    } catch (error) {
        if (error instanceof Error && error.message.includes("does not exist")) {
            return;
        }
        console.error("Error running pre-build clean:", error);
    }
};

export const cleanPost = async () => {
    logHeader("Post-compile Clean");
    try {
        await fs.rm(path.normalize("./dist/src"), { recursive: true, force: true });
        console.log("Build './dist/src' directory removed");

        await fs.rm(path.normalize("./dist/package.json"), { recursive: true, force: true });
        console.log("Build './dist/package.json' directory removed");
    } catch (error) {
        if (error instanceof Error && error.message.includes("does not exist")) {
            return;
        }
        console.error("Error running post-compile clean:", error);
    }
};
