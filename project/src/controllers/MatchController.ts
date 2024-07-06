import { inject, injectable } from "tsyringe";
import { ApplicationContext } from "@spt/context/ApplicationContext";
import { ContextVariableType } from "@spt/context/ContextVariableType";
import { InraidController } from "@spt/controllers/InraidController";
import { LocationController } from "@spt/controllers/LocationController";
import { LootGenerator } from "@spt/generators/LootGenerator";
import { PlayerScavGenerator } from "@spt/generators/PlayerScavGenerator";
import { HealthHelper } from "@spt/helpers/HealthHelper";
import { InRaidHelper } from "@spt/helpers/InRaidHelper";
import { ProfileHelper } from "@spt/helpers/ProfileHelper";
import { TraderHelper } from "@spt/helpers/TraderHelper";
import { IPmcData } from "@spt/models/eft/common/IPmcData";
import { Common } from "@spt/models/eft/common/tables/IBotBase";
import { Item } from "@spt/models/eft/common/tables/IItem";
import { IEndLocalRaidRequestData, IEndRaidResult } from "@spt/models/eft/match/IEndLocalRaidRequestData";
import { IEndOfflineRaidRequestData } from "@spt/models/eft/match/IEndOfflineRaidRequestData";
import { IGetRaidConfigurationRequestData } from "@spt/models/eft/match/IGetRaidConfigurationRequestData";
import { IMatchGroupStartGameRequest } from "@spt/models/eft/match/IMatchGroupStartGameRequest";
import { IMatchGroupStatusRequest } from "@spt/models/eft/match/IMatchGroupStatusRequest";
import { IMatchGroupStatusResponse } from "@spt/models/eft/match/IMatchGroupStatusResponse";
import { IProfileStatusResponse } from "@spt/models/eft/match/IProfileStatusResponse";
import { IStartLocalRaidRequestData } from "@spt/models/eft/match/IStartLocalRaidRequestData";
import { IStartLocalRaidResponseData } from "@spt/models/eft/match/IStartLocalRaidResponseData";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { MessageType } from "@spt/models/enums/MessageType";
import { Traders } from "@spt/models/enums/Traders";
import { IHideoutConfig } from "@spt/models/spt/config/IHideoutConfig";
import { IInRaidConfig } from "@spt/models/spt/config/IInRaidConfig";
import { IMatchConfig } from "@spt/models/spt/config/IMatchConfig";
import { IPmcConfig } from "@spt/models/spt/config/IPmcConfig";
import { IRagfairConfig } from "@spt/models/spt/config/IRagfairConfig";
import { ITraderConfig } from "@spt/models/spt/config/ITraderConfig";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { SaveServer } from "@spt/servers/SaveServer";
import { BotGenerationCacheService } from "@spt/services/BotGenerationCacheService";
import { BotLootCacheService } from "@spt/services/BotLootCacheService";
import { DatabaseService } from "@spt/services/DatabaseService";
import { InsuranceService } from "@spt/services/InsuranceService";
import { LocalisationService } from "@spt/services/LocalisationService";
import { MailSendService } from "@spt/services/MailSendService";
import { MatchBotDetailsCacheService } from "@spt/services/MatchBotDetailsCacheService";
import { MatchLocationService } from "@spt/services/MatchLocationService";
import { PmcChatResponseService } from "@spt/services/PmcChatResponseService";
import { ProfileSnapshotService } from "@spt/services/ProfileSnapshotService";
import { HashUtil } from "@spt/utils/HashUtil";
import { RandomUtil } from "@spt/utils/RandomUtil";
import { TimeUtil } from "@spt/utils/TimeUtil";

@injectable()
export class MatchController
{
    protected matchConfig: IMatchConfig;
    protected inRaidConfig: IInRaidConfig;
    protected traderConfig: ITraderConfig;
    protected pmcConfig: IPmcConfig;
    protected ragfairConfig: IRagfairConfig;
    protected hideoutConfig: IHideoutConfig;

    constructor(
        @inject("PrimaryLogger") protected logger: ILogger,
        @inject("SaveServer") protected saveServer: SaveServer,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("DatabaseService") protected databaseService: DatabaseService,
        @inject("LocationController") protected locationController: LocationController,
        @inject("InraidController") protected inRaidController: InraidController,
        @inject("InRaidHelper") protected inRaidHelper: InRaidHelper,
        @inject("HealthHelper") protected healthHelper: HealthHelper,
        @inject("MatchLocationService") protected matchLocationService: MatchLocationService,
        @inject("MatchBotDetailsCacheService") protected matchBotDetailsCacheService: MatchBotDetailsCacheService,
        @inject("PmcChatResponseService") protected pmcChatResponseService: PmcChatResponseService,
        @inject("PlayerScavGenerator") protected playerScavGenerator: PlayerScavGenerator,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("BotLootCacheService") protected botLootCacheService: BotLootCacheService,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("InsuranceService") protected insuranceService: InsuranceService,
        @inject("ConfigServer") protected configServer: ConfigServer,
        @inject("ProfileSnapshotService") protected profileSnapshotService: ProfileSnapshotService,
        @inject("BotGenerationCacheService") protected botGenerationCacheService: BotGenerationCacheService,
        @inject("MailSendService") protected mailSendService: MailSendService,
        @inject("LootGenerator") protected lootGenerator: LootGenerator,
        @inject("ApplicationContext") protected applicationContext: ApplicationContext,
    )
    {
        this.matchConfig = this.configServer.getConfig(ConfigTypes.MATCH);
        this.inRaidConfig = this.configServer.getConfig(ConfigTypes.IN_RAID);
        this.traderConfig = this.configServer.getConfig(ConfigTypes.TRADER);
        this.pmcConfig = this.configServer.getConfig(ConfigTypes.PMC);
        this.ragfairConfig = this.configServer.getConfig(ConfigTypes.RAGFAIR);
        this.hideoutConfig = this.configServer.getConfig(ConfigTypes.HIDEOUT);
    }

    public getEnabled(): boolean
    {
        return this.matchConfig.enabled;
    }

    /** Handle client/match/group/delete */
    public deleteGroup(info: any): void
    {
        this.matchLocationService.deleteGroup(info);
    }

    /** Handle match/group/start_game */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public joinMatch(info: IMatchGroupStartGameRequest, sessionId: string): IProfileStatusResponse
    {
        const output: IProfileStatusResponse = { maxPveCountExceeded: false, profiles: [] };

        // get list of players joining into the match
        output.profiles.push({
            profileid: "TODO",
            profileToken: "TODO",
            status: "MatchWait",
            sid: "",
            ip: "",
            port: 0,
            version: "live",
            location: "TODO get location",
            raidMode: "Online",
            mode: "deathmatch",
            shortId: undefined,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            additional_info: undefined,
        });

        return output;
    }

    /** Handle client/match/group/status */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getGroupStatus(info: IMatchGroupStatusRequest): IMatchGroupStatusResponse
    {
        return { players: [], maxPveCountExceeded: false };
    }

    /**
     * Handle /client/raid/configuration
     * @param request Raid config request
     * @param sessionID Session id
     */
    public startOfflineRaid(request: IGetRaidConfigurationRequestData, sessionID: string): void
    {
        // Store request data for access during bot generation
        this.applicationContext.addValue(ContextVariableType.RAID_CONFIGURATION, request);

        // TODO: add code to strip PMC of equipment now they've started the raid

        // Set pmcs to difficulty set in pre-raid screen if override in bot config isnt enabled
        if (!this.pmcConfig.useDifficultyOverride)
        {
            this.pmcConfig.difficulty = this.convertDifficultyDropdownIntoBotDifficulty(
                request.wavesSettings.botDifficulty,
            );
        }

        // Store the profile as-is for later use on the post-raid exp screen
        const currentProfile = this.saveServer.getProfile(sessionID);
        this.profileSnapshotService.storeProfileSnapshot(sessionID, currentProfile);
    }

    /**
     * Convert a difficulty value from pre-raid screen to a bot difficulty
     * @param botDifficulty dropdown difficulty value
     * @returns bot difficulty
     */
    protected convertDifficultyDropdownIntoBotDifficulty(botDifficulty: string): string
    {
        // Edge case medium - must be altered
        if (botDifficulty.toLowerCase() === "medium")
        {
            return "normal";
        }

        return botDifficulty;
    }

    /** Handle client/match/offline/end */
    public endOfflineRaid(info: IEndOfflineRaidRequestData, sessionId: string): void
    {
        const pmcData: IPmcData = this.profileHelper.getPmcProfile(sessionId);
        const extractName = info.exitName;

        // Save time spent in raid
        pmcData.Stats.Eft.TotalInGameTime += info.raidSeconds;

        // Clean up cached bots now raid is over
        this.botGenerationCacheService.clearStoredBots();

        // Clear bot loot cache
        this.botLootCacheService.clearCache();

        if (this.extractWasViaCar(extractName))
        {
            this.handleCarExtract(extractName, pmcData, sessionId);
        }

        if (extractName && this.extractWasViaCoop(extractName) && this.traderConfig.fence.coopExtractGift.sendGift)
        {
            this.handleCoopExtract(sessionId, pmcData, extractName);
            this.sendCoopTakenFenceMessage(sessionId);
        }
    }

    /**
     * Did player take a COOP extract
     * @param extractName Name of extract player took
     * @returns True if coop extract
     */
    protected extractWasViaCoop(extractName: string): boolean
    {
        // No extract name, not a coop extract
        if (!extractName)
        {
            return false;
        }

        return this.inRaidConfig.coopExtracts.includes(extractName.trim());
    }

    protected sendCoopTakenFenceMessage(sessionId: string): void
    {
        // Generate reward for taking coop extract
        const loot = this.lootGenerator.createRandomLoot(this.traderConfig.fence.coopExtractGift);
        const mailableLoot: Item[] = [];

        const parentId = this.hashUtil.generate();
        for (const item of loot)
        {
            item.parentId = parentId;
            mailableLoot.push(item);
        }

        // Send message from fence giving player reward generated above
        this.mailSendService.sendLocalisedNpcMessageToPlayer(
            sessionId,
            this.traderHelper.getTraderById(Traders.FENCE),
            MessageType.MESSAGE_WITH_ITEMS,
            this.randomUtil.getArrayValue(this.traderConfig.fence.coopExtractGift.messageLocaleIds),
            mailableLoot,
            this.timeUtil.getHoursAsSeconds(this.traderConfig.fence.coopExtractGift.giftExpiryHours),
        );
    }

    /**
     * Handle when a player extracts using a coop extract - add rep to fence
     * @param sessionId Session/player id
     * @param pmcData Profile
     * @param extractName Name of extract taken
     */
    protected handleCoopExtract(sessionId: string, pmcData: IPmcData, extractName: string): void
    {
        if (!pmcData.CoopExtractCounts)
        {
            pmcData.CoopExtractCounts = {};
        }

        // Ensure key exists for extract
        if (!(extractName in pmcData.CoopExtractCounts))
        {
            pmcData.CoopExtractCounts[extractName] = 0;
        }

        // Increment extract count value
        pmcData.CoopExtractCounts[extractName] += 1;

        // Get new fence standing value
        const newFenceStanding = this.getFenceStandingAfterExtract(
            pmcData,
            this.inRaidConfig.coopExtractBaseStandingGain,
            pmcData.CoopExtractCounts[extractName],
        );
        const fenceId: string = Traders.FENCE;
        pmcData.TradersInfo[fenceId].standing = newFenceStanding;

        // Check if new standing has leveled up trader
        this.traderHelper.lvlUp(fenceId, pmcData);
        pmcData.TradersInfo[fenceId].loyaltyLevel = Math.max(pmcData.TradersInfo[fenceId].loyaltyLevel, 1);

        // Copy updated fence rep values into scav profile to ensure consistency
        const scavData: IPmcData = this.profileHelper.getScavProfile(sessionId);
        scavData.TradersInfo[fenceId].standing = pmcData.TradersInfo[fenceId].standing;
        scavData.TradersInfo[fenceId].loyaltyLevel = pmcData.TradersInfo[fenceId].loyaltyLevel;
    }

    /**
     * Was extract by car
     * @param extractName name of extract
     * @returns true if car extract
     */
    protected extractWasViaCar(extractName: string): boolean
    {
        // exit name is undefined on death
        if (!extractName)
        {
            return false;
        }

        if (extractName.toLowerCase().includes("v-ex"))
        {
            return true;
        }

        return this.inRaidConfig.carExtracts.includes(extractName.trim());
    }

    /**
     * Handle when a player extracts using a car - Add rep to fence
     * @param extractName name of the extract used
     * @param pmcData Player profile
     * @param sessionId Session id
     */
    protected handleCarExtract(extractName: string, pmcData: IPmcData, sessionId: string): void
    {
        // Ensure key exists for extract
        if (!(extractName in pmcData.CarExtractCounts))
        {
            pmcData.CarExtractCounts[extractName] = 0;
        }

        // Increment extract count value
        pmcData.CarExtractCounts[extractName] += 1;

        // Not exact replica of Live behaviour
        // Simplified for now, no real reason to do the whole (unconfirmed) extra 0.01 standing per day regeneration mechanic
        const newFenceStanding = this.getFenceStandingAfterExtract(
            pmcData,
            this.inRaidConfig.carExtractBaseStandingGain,
            pmcData.CarExtractCounts[extractName],
        );
        const fenceId: string = Traders.FENCE;
        pmcData.TradersInfo[fenceId].standing = newFenceStanding;

        // Check if new standing has leveled up trader
        this.traderHelper.lvlUp(fenceId, pmcData);
        pmcData.TradersInfo[fenceId].loyaltyLevel = Math.max(pmcData.TradersInfo[fenceId].loyaltyLevel, 1);

        this.logger.debug(
            `Car extract: ${extractName} used, total times taken: ${pmcData.CarExtractCounts[extractName]}`,
        );

        // Copy updated fence rep values into scav profile to ensure consistency
        const scavData: IPmcData = this.profileHelper.getScavProfile(sessionId);
        scavData.TradersInfo[fenceId].standing = pmcData.TradersInfo[fenceId].standing;
        scavData.TradersInfo[fenceId].loyaltyLevel = pmcData.TradersInfo[fenceId].loyaltyLevel;
    }

    /**
     * Get the fence rep gain from using a car or coop extract
     * @param pmcData Profile
     * @param baseGain amount gained for the first extract
     * @param extractCount Number of times extract was taken
     * @returns Fence standing after taking extract
     */
    protected getFenceStandingAfterExtract(pmcData: IPmcData, baseGain: number, extractCount: number): number
    {
        // Get current standing
        const fenceId: string = Traders.FENCE;
        let fenceStanding = Number(pmcData.TradersInfo[fenceId].standing);

        // get standing after taking extract x times, x.xx format, gain from extract can be no smaller than 0.01
        fenceStanding += Math.max(baseGain / extractCount, 0.01);

        // Ensure fence loyalty level is not above/below the range -7 to 15
        const newFenceStanding = Math.min(Math.max(fenceStanding, -7), 15);
        this.logger.debug(`Old vs new fence standing: ${pmcData.TradersInfo[fenceId].standing}, ${newFenceStanding}`);

        return Number(newFenceStanding.toFixed(2));
    }

    public startLocalRaid(sessionId: string, request: IStartLocalRaidRequestData): IStartLocalRaidResponseData
    {
        // TODO - remove usage of locationController - controller use inside match controller = bad
        const playerProfile = this.profileHelper.getPmcProfile(sessionId);

        const result: IStartLocalRaidResponseData = {
            serverId: `${request.location}.${request.playerSide}.${this.timeUtil.getTimestamp()}`, // TODO - does this need to be more verbose - investigate client?
            serverSettings: this.databaseService.getLocationServices(), // TODO - is this per map or global?
            profile: { insuredItems: playerProfile.InsuredItems },
            locationLoot: this.locationController.generate(request.location), // Move out of controller
        };

        // Clear bot cache ready for a fresh raid
        this.botGenerationCacheService.clearStoredBots();

        return result;
    }

    public endLocalRaid(sessionId: string, request: IEndLocalRaidRequestData): void
    {
        const fullProfile = this.profileHelper.getFullProfile(sessionId);
        const pmcProfile = fullProfile.characters.pmc;
        const scavProfile = fullProfile.characters.scav;
        const postRaidProfile = request.results.profile!;

        // TODO:
        // Update profile
        // Handle insurance
        // Rep gain/loss?
        // Quest status?
        // Counters?
        // Send PMC message to player if necessary
        // Limb health
        // Limb effects
        // Skills
        // Inventory - items not lost on death
        // Stats
        // stats/eft/aggressor - weird values (EFT.IProfileDataContainer.Nickname)

        this.logger.debug(`Raid outcome: ${request.results.result}`);

        // Set flea interval time to out-of-raid value
        this.ragfairConfig.runIntervalSeconds = this.ragfairConfig.runIntervalValues.outOfRaid;
        this.hideoutConfig.runIntervalSeconds = this.hideoutConfig.runIntervalValues.outOfRaid;

        // ServerId has various info stored in it, delimited by a period
        const serverDetails = request.serverId.split(".");

        const locationName = serverDetails[0].toLowerCase();
        const isPmc = serverDetails[1].toLowerCase() === "pmc";
        const mapBase = this.databaseService.getLocation(locationName).base;
        const isDead = this.isPlayerDead(request.results);

        if (!isPmc)
        {
            this.handlePostRaidPlayerScav(sessionId, pmcProfile, scavProfile, isDead);

            return;
        }

        this.handlePostRaidPmc(sessionId, pmcProfile, scavProfile, postRaidProfile, isDead, request);
    }

    protected handlePostRaidPlayerScav(
        sessionId: string,
        pmcProfile: IPmcData,
        scavProfile: IPmcData,
        isDead: boolean,
    ): void
    {
        // Scav died, regen scav loadout and set timer
        if (isDead)
        {
            this.playerScavGenerator.generate(sessionId);
        }

        // Update last played property
        pmcProfile.Info.LastTimePlayedAsSavage = this.timeUtil.getTimestamp();

        // Force a profile save
        this.saveServer.saveProfile(sessionId);
    }

    protected handlePostRaidPmc(
        sessionId: string,
        pmcProfile: IPmcData,
        scavProfile: IPmcData,
        postRaidProfile: IPmcData,
        isDead: boolean,
        request: IEndLocalRaidRequestData,
    ): void
    {
        // Update inventory
        this.inRaidHelper.setInventory(sessionId, pmcProfile, postRaidProfile);

        pmcProfile.Info.Level = postRaidProfile.Info.Level;

        // Add experience points
        pmcProfile.Info.Experience += postRaidProfile.Stats.Eft.TotalSessionExperience;

        // Profile common/mastering skills
        pmcProfile.Skills = postRaidProfile.Skills;

        pmcProfile.Stats.Eft = postRaidProfile.Stats.Eft;

        // Must occur after experience is set and stats copied over
        pmcProfile.Stats.Eft.TotalSessionExperience = 0;

        pmcProfile.Achievements = postRaidProfile.Achievements;

        // Remove skill fatigue values
        this.resetSkillPointsEarnedDuringRaid(pmcProfile.Skills.Common);

        // Straight copy
        pmcProfile.TaskConditionCounters = postRaidProfile.TaskConditionCounters;

        pmcProfile.Encyclopedia = postRaidProfile.Encyclopedia;

        // Must occur after encyclopedia updated
        this.mergePmcAndScavEncyclopedias(pmcProfile, scavProfile);

        // Handle temp, hydration, limb hp/effects
        this.healthHelper.updateProfileHealthPostRaid(pmcProfile, postRaidProfile.Health, sessionId, isDead);

        if (isDead)
        {
            this.pmcChatResponseService.sendKillerResponse(
                sessionId,
                pmcProfile,
                postRaidProfile.Stats.Eft.Aggressor,
            );
            this.matchBotDetailsCacheService.clearCache();

            this.inRaidHelper.deleteInventory(pmcProfile, sessionId);
        }

        const victims = postRaidProfile.Stats.Eft.Victims.filter((victim) =>
            ["pmcbear", "pmcusec"].includes(victim.Role.toLowerCase()),
        );
        if (victims?.length > 0)
        {
            // Player killed PMCs, send some responses to them
            this.pmcChatResponseService.sendVictimResponse(sessionId, victims, pmcProfile);
        }

        // Handle items transferred via BTR to player
        const btrKey = "BTRTransferStash";
        const btrContainerAndItems = request.transferItems[btrKey] ?? [];
        if (btrContainerAndItems.length > 0)
        {
            const itemsToSend = btrContainerAndItems.filter((item) => item._id !== btrKey);
            this.btrItemDelivery(sessionId, Traders.BTR, itemsToSend);
        }

        if (request.lostInsuredItems?.length > 0)
        {
            // TODO - refactor code to work

            // Get array of insured items+child that were lost in raid
            // const gearToStore = this.insuranceService.getGearLostInRaid(
            //     pmcProfile,
            //     postRaidRequest,
            //     preRaidGear,
            //     sessionId,
            //     isDead,
            // );

            // this.insuranceService.storeGearLostInRaidToSendLater(
            //     sessionId,
            //     gearToStore,
            // );
        }
    }

    /**
     * Handle singleplayer/traderServices/itemDelivery
     */
    protected btrItemDelivery(sessionId: string, traderId: string, items: Item[]): void
    {
        const serverProfile = this.saveServer.getProfile(sessionId);
        const pmcData = serverProfile.characters.pmc;

        const dialogueTemplates = this.databaseService.getTrader(traderId).dialogue;
        if (!dialogueTemplates)
        {
            this.logger.error(this.localisationService.getText("inraid-unable_to_deliver_item_no_trader_found", traderId));

            return;
        }
        const messageId = this.randomUtil.getArrayValue(dialogueTemplates.itemsDelivered);
        const messageStoreTime = this.timeUtil.getHoursAsSeconds(this.traderConfig.fence.btrDeliveryExpireHours);

        // Remove any items that were returned by the item delivery, but also insured, from the player's insurance list
        // This is to stop items being duplicated by being returned from both item delivery and insurance
        const deliveredItemIds = items.map((item) => item._id);
        pmcData.InsuredItems = pmcData.InsuredItems
            .filter((insuredItem) => !deliveredItemIds.includes(insuredItem.itemId));

        // Send the items to the player
        this.mailSendService.sendLocalisedNpcMessageToPlayer(
            sessionId,
            this.traderHelper.getTraderById(traderId),
            MessageType.BTR_ITEMS_DELIVERY,
            messageId,
            items,
            messageStoreTime,
        );
    }

    /**
     * Is the player dead after a raid - dead = anything other than "survived" / "runner"
     * @param statusOnExit Exit value from offraidData object
     * @returns true if dead
     */
    protected isPlayerDead(results: IEndRaidResult): boolean
    {
        return ["killed", "missinginaction", "left"].includes(results.result.toLowerCase());
    }

    /**
     * Reset the skill points earned in a raid to 0, ready for next raid
     * @param commonSkills Profile common skills to update
     */
    protected resetSkillPointsEarnedDuringRaid(commonSkills: Common[]): void
    {
        for (const skill of commonSkills)
        {
            skill.PointsEarnedDuringSession = 0.0;
        }
    }

    /**
     * merge two dictionaries together
     * Prioritise pair that has true as a value
     * @param primary main dictionary
     * @param secondary Secondary dictionary
     */
    protected mergePmcAndScavEncyclopedias(primary: IPmcData, secondary: IPmcData): void
    {
        function extend(target: { [key: string]: boolean }, source: Record<string, boolean>)
        {
            for (const key in source)
            {
                if (Object.hasOwn(source, key))
                {
                    target[key] = source[key];
                }
            }
            return target;
        }

        const merged = extend(extend({}, primary.Encyclopedia), secondary.Encyclopedia);
        primary.Encyclopedia = merged;
        secondary.Encyclopedia = merged;
    }
}
