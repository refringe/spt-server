import path from "node:path";
import type { OnLoad } from "@spt/di/OnLoad";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import type { IHttpConfig } from "@spt/models/spt/config/IHttpConfig";
import type { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { ImageRouter } from "@spt/routers/ImageRouter";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { LocalisationService } from "@spt/services/LocalisationService";
import { EncodingUtil } from "@spt/utils/EncodingUtil";
import { HashUtil } from "@spt/utils/HashUtil";
import type { ImporterUtil } from "@spt/utils/ImporterUtil";
import { JsonUtil } from "@spt/utils/JsonUtil";
import { VFS } from "@spt/utils/VFS";
import { inject, injectable } from "tsyringe";

@injectable()
export class DatabaseImporter implements OnLoad {
    private hashedFile: any;
    private valid = VaildationResult.UNDEFINED;
    private filepath: string;
    protected httpConfig: IHttpConfig;

    constructor(
        @inject("PrimaryLogger") protected logger: ILogger,
        @inject("VFS") protected vfs: VFS,
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("ImageRouter") protected imageRouter: ImageRouter,
        @inject("EncodingUtil") protected encodingUtil: EncodingUtil,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("ImporterUtil") protected importerUtil: ImporterUtil,
        @inject("ConfigServer") protected configServer: ConfigServer,
    ) {
        this.httpConfig = this.configServer.getConfig(ConfigTypes.HTTP);
    }
    getRoute(): string {
        throw new Error("Method not implemented.");
    }

    public getSptDataPath(): string {
        return path.resolve(globalThis.G_RELEASE_CONFIGURATION ? "./SPT_Data/Server/" : "./assets/");
    }

    public async onLoad(): Promise<void> {
        this.filepath = this.getSptDataPath();

        if (globalThis.G_RELEASE_CONFIGURATION) {
            try {
                const file = "checks.dat";
                const fileWithPath = path.join(this.filepath, file);
                if (this.vfs.exists(fileWithPath)) {
                    console.log(`Reading hashed file: ${fileWithPath}`);
                    this.hashedFile = this.jsonUtil.deserialize(
                        this.encodingUtil.fromBase64(this.vfs.readFile(fileWithPath)),
                        file,
                    );
                } else {
                    this.valid = VaildationResult.NOT_FOUND;
                    this.logger.debug(this.localisationService.getText("validation_not_found"));
                }
            } catch (e) {
                this.valid = VaildationResult.FAILED;
                this.logger.warning(this.localisationService.getText("validation_error_decode"));
            }
        }

        await this.hydrateDatabase(this.filepath);

        const imageFilePath = path.join(this.filepath, "images/");
        const directories = this.vfs.getDirs(imageFilePath);
        this.loadImages(imageFilePath, directories, [
            "/files/achievement/",
            "/files/CONTENT/banners/",
            "/files/handbook/",
            "/files/Hideout/",
            "/files/launcher/",
            "/files/quest/icon/",
            "/files/trader/avatar/",
        ]);
    }

    protected async hydrateDatabase(filepath: string): Promise<void> {
        this.logger.info(this.localisationService.getText("importing_database"));
        const databasePath = path.join(filepath, "database/");
        try {
            const dataToImport = await this.importerUtil.loadAsync<IDatabaseTables>(
                databasePath,
                this.filepath,
                (fileWithPath: string, data: string) => this.onReadValidate(fileWithPath, data),
            );

            const validation =
                this.valid === VaildationResult.FAILED || this.valid === VaildationResult.NOT_FOUND ? "." : "";
            this.logger.info(`${this.localisationService.getText("importing_database_finish")}${validation}`);
            this.databaseServer.setTables(dataToImport);
        } catch (error) {
            this.logger.error(`Error hydrating database: ${error.message}`);
            throw error;
        }
    }

    protected onReadValidate(fileWithPath: string, data: string): void {
        if (globalThis.G_RELEASE_CONFIGURATION && this.hashedFile && !this.validateFile(fileWithPath, data)) {
            this.valid = VaildationResult.FAILED;
        }
    }

    protected validateFile(filePathAndName: string, fileData: any): boolean {
        try {
            // Normalize both paths to ensure consistency
            const normalizedPath = path
                .normalize(filePathAndName)
                .replace(this.filepath, "")
                .replace(/\\/g, "/") // Convert Windows backslashes to forward slashes
                .replace(".json", "");

            this.logger.debug(`Normalized path for validation: ${normalizedPath}`);
            const hashedKey = normalizedPath.split("/").pop(); // Extract the key
            this.logger.debug(`Extracted key for hash lookup: ${hashedKey}`);

            // Compare against hashed file
            const tempObject = this.hashedFile[hashedKey];
            const generatedHash = this.hashUtil.generateSha1ForData(fileData);

            this.logger.debug(`Comparing ${tempObject} to ${generatedHash}`);
            if (!tempObject || tempObject !== generatedHash) {
                this.logger.debug(this.localisationService.getText("validation_error_file", filePathAndName));
                return false;
            }
        } catch (e) {
            this.logger.warning(`Validation error: ${e.message || e}`);
            return false;
        }
        return true;
    }

    public loadImages(filepath: string, directories: string[], routes: string[]): void {
        for (const directoryIndex in directories) {
            const filesInDirectory = this.vfs.getFiles(path.join(filepath, directories[directoryIndex]));
            for (const file of filesInDirectory) {
                const filename = this.vfs.stripExtension(file);
                const routeKey = `${routes[directoryIndex]}${filename}`;
                let imagePath = path.join(filepath, directories[directoryIndex], file);

                const pathOverride = this.getImagePathOverride(imagePath);
                if (pathOverride) {
                    this.logger.debug(`overrode route: ${routeKey} endpoint: ${imagePath} with ${pathOverride}`);
                    imagePath = pathOverride;
                }
                this.imageRouter.addRoute(routeKey, imagePath);
            }
        }
        this.imageRouter.addRoute("/favicon.ico", path.join(filepath, "icon.ico"));
    }

    protected getImagePathOverride(imagePath: string): string {
        return this.httpConfig.serverImagePathOverride[imagePath];
    }
}

enum VaildationResult {
    SUCCESS = 0,
    FAILED = 1,
    NOT_FOUND = 2,
    UNDEFINED = 3,
}
