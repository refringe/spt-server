import { inject, injectable } from "tsyringe";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IEliminationConfig, IQuestConfig, IRepeatableQuestConfig } from "../models/spt/config/IQuestConfig";
import { ConfigServer } from "../servers/ConfigServer";
import { JsonUtil } from "../utils/JsonUtil";
import { MathUtil } from "../utils/MathUtil";
import { ProbabilityObject, ProbabilityObjectArray } from "../utils/RandomUtil";

@injectable()
export class RepeatableQuestHelper
{
    protected questConfig: IQuestConfig;

    constructor(
        @inject("MathUtil") protected mathUtil: MathUtil,
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.questConfig = this.configServer.getConfig(ConfigTypes.QUEST);
    }

    /**
     * Get the relevant elimination config based on the current players PMC level
     * @param pmcLevel Level of PMC character
     * @param repeatableConfig Main repeatable config
     * @returns IEliminationConfig
     */
    public getEliminationConfigByPmcLevel(pmcLevel: number, repeatableConfig: IRepeatableQuestConfig): IEliminationConfig
    {
        return repeatableConfig.questConfig.Elimination.find(x => pmcLevel >= x.levelRange.min && pmcLevel <= x.levelRange.max);
    }

    public probabilityObjectArray<K, V>(configArrayInput: ProbabilityObject<K, V>[]): ProbabilityObjectArray<K, V>
    {
        const configArray = this.jsonUtil.clone(configArrayInput);
        const probabilityArray = new ProbabilityObjectArray<K, V>(this.mathUtil, this.jsonUtil);
        for (const configObject of configArray)
        {
            probabilityArray.push(new ProbabilityObject(configObject.key, configObject.relativeProbability, configObject.data));
        }
        return probabilityArray;
    }
}