import path from "node:path";
import { writeFile as atomicallyWrite } from "atomically";
import fsExtra, { EnsureDirOptions } from "fs-extra";
import type { Data, Path } from "node_modules/atomically/dist/types";
import { injectable } from "tsyringe";

/**
 * This class handles file system operations, using `fs-extra` for most tasks except where atomicity can be improved
 * with the `atomically` package. The goal is to ensure that file operations are as safe as possible.
 *
 * Atomicity is focued on single files, as there's no trivial way to ensure atomicity for directory opterations.
 *
 * Additionally, we force some sane defaults like `utf8` encoding for all file operations.
 */
@injectable()
export class FileSystem {
    /**
     * Copy a file or directory. The directory can have contents.
     *
     * This is atomic for single files, but not as a whole opteration. You'll never end up with a partial file, but you
     * may end up with a partial directory if the process crashes mid-copy.
     *
     * This is recursive method.
     */
    public async copy(src: string, dest: string): Promise<void> {
        const stat = await fsExtra.stat(src);
        if (stat.isDirectory()) {
            await fsExtra.ensureDir(dest);
            const items = await fsExtra.readdir(src, { withFileTypes: true });
            for (const item of items) {
                const srcItem = path.join(src, item.name);
                const destItem = path.join(dest, item.name);
                await this.copy(srcItem, destItem); // Recursive call.
            }
        } else if (stat.isFile()) {
            await fsExtra.ensureDir(path.dirname(dest));
            const data = await fsExtra.readFile(src);
            await atomicallyWrite(dest, data, { encoding: "utf8", timeout: 7500 }); // Atomic write.
        } else {
            throw new Error(`Unsupported file type for copy operation: ${src}`);
        }
    }

    /**
     * Ensures that a directory is empty. Deletes directory contents if the directory is not empty. If the directory
     * does not exist, it is created. The directory itself is not deleted.
     *
     * This is not atomic. If the process crashes mid-operation, you may end up with a partially empty directory.
     */
    public async emptyDir(dirPath: string): Promise<void> {
        await fsExtra.emptyDir(dirPath);
    }

    /**
     * Ensures that the directory exists. If the directory structure does not exist, it is created.
     */
    public async ensureDir(dirPath: string, options?: EnsureDirOptions | number): Promise<void> {
        await fsExtra.ensureDir(dirPath, options);
    }

    /**
     * Ensures that the file exists. If the file that is requested to be created is in directories that do not exist,
     * these directories are created. If the file already exists, it is NOT MODIFIED.
     */
    public async ensureFile(file: string): Promise<void> {
        await fsExtra.ensureFile(file);
    }

    /**
     * Moves a file or directory, even across devices. Does not overwrite by default.
     *
     * Note: When `src` is a file, `dest` must be a file and when `src` is a directory, `dest` must be a directory.
     *
     * This is atomic for same-device single file operations, but not as a whole opteration.
     */
    public async move(src: string, dest: string, overwriteDest = false): Promise<void> {
        await fsExtra.move(src, dest, { overwrite: overwriteDest });
    }

    /**
     * Writes data to a file, overwriting if the file already exists. If the parent directory does not exist, it's
     * created. File must be a file path (a buffer or a file descriptor is not allowed).
     *
     * This is atomic. If the process crashes mid-write, you'll never end up with a partial file.
     */
    public async writeFile(file: string, data: Data): Promise<void> {
        await fsExtra.ensureDir(path.dirname(file));
        await atomicallyWrite(file, data, { encoding: "utf8", timeout: 7500 }); // Atomic write.
    }

    /**
     * Writes an object to a JSON file, overwriting if the file already exists. If the parent directory does not exist,
     * it's created. File must be a file path (a buffer or a file descriptor is not allowed).
     *
     * This is atomic. If the process crashes mid-write, you'll never end up with a partial file.
     */
    public async writeJson(file: string, jsonObject: object, indentationSpaces?: 4): Promise<void> {
        await fsExtra.ensureDir(path.dirname(file));
        const jsonString = JSON.stringify(jsonObject, null, indentationSpaces);
        this.writeFile(file, jsonString);
    }

    /**
     * Test whether the given path exists.
     */
    public async pathExists(fileOrDirPath: string): Promise<boolean> {
        return fsExtra.pathExists(fileOrDirPath);
    }

    /**
     * Reads a JSON file and then parses it into an object.
     */
    public async readJson(file: Path): Promise<object> {
        return fsExtra.readJson(file, { encoding: "utf8" });
    }

    /**
     * Removes a file or directory. The directory can have contents. If the path does not exist, silently does nothing.
     *
     * This is file-atomic, but not directory-atomic. If the process crashes mid-operation, you may end up with some
     * files removed and some not, but not a partial file.
     */
    public async remove(dir: string): Promise<void> {
        await fsExtra.remove(dir);
    }

    /**
     * Get the extension of a file without the dot.
     */
    public static getFileExtension(filepath: string): string {
        return path.extname(filepath).replace(".", "");
    }

    /**
     * Get the filename without its extension.
     */
    public static stripExtension(filepath: string): string {
        return filepath.slice(0, -path.extname(filepath).length);
    }

    /**
     * Minify a JSON file by reading, parsing, and then stringifying it with no indentation.
     *
     * This is atomic. If the process crashes mid-write, you'll never end up with a partial file.
     */
    public async minifyJson(filePath: string): Promise<void> {
        const originalData = await fsExtra.readFile(filePath, "utf8");
        const parsed = JSON.parse(originalData);
        const minified = JSON.stringify(parsed, null, 0);
        await atomicallyWrite(filePath, minified, { encoding: "utf8", timeout: 7500 }); // Atomic write.
    }

    /**
     * Minify all JSON files in a directory by recursively finding all JSON files and minifying them.
     *
     * This is atomic for single files, but not as a whole opteration. You'll never end up with a partial file, but you
     * may end up with a partial directory if the process crashes mid-minify.
     *
     * This is recursive method.
     */
    public async minifyJsonInDir(dir: string): Promise<void> {
        const items = await fsExtra.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                await this.minifyJsonInDir(fullPath); // Recursive call.
            } else if (item.isFile()) {
                if (FileSystem.getFileExtension(item.name).toLowerCase() === "json") {
                    await this.minifyJson(fullPath); // Atomic write.
                }
            }
        }
    }

    /**
     * Get all files in a directory of a specific type.
     */
    public async getFilesOfType(directory: string, fileType: string): Promise<string[]> {
        if (!(await fsExtra.pathExists(directory))) {
            return [];
        }
        const dirents = await fsExtra.readdir(directory, { withFileTypes: true, recursive: true });
        const files = dirents
            .filter((dirent) => !dirent.isDirectory() && dirent.name.endsWith(fileType))
            .map((dirent) => path.resolve(directory, dirent.name));
        return files;
    }

    /**
     * Get all files in a directory.
     */
    public async getFiles(directory: string, searchRecursive = false): Promise<string[]> {
        if (!(await fsExtra.pathExists(directory))) {
            return [];
        }
        const dirents = await fsExtra.readdir(directory, { withFileTypes: true, recursive: searchRecursive });
        const files = dirents.filter((dirent) => dirent.isFile()).map((dirent) => path.resolve(directory, dirent.name));
        return files;
    }

    /**
     * Get all directories in a directory.
     */
    public async getDirectories(directory: string, searchRecursive = false): Promise<string[]> {
        if (!(await fsExtra.pathExists(directory))) {
            return [];
        }
        const dirents = await fsExtra.readdir(directory, { withFileTypes: true, recursive: searchRecursive });
        const directories = dirents
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => path.resolve(directory, dirent.name));
        return directories;
    }
}
