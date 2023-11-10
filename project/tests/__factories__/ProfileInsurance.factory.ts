import "reflect-metadata";
import { container } from "tsyringe";

import { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import { Insurance } from "@spt-aki/models/eft/profile/IAkiProfile";
import { profileInsuranceFixture } from "@tests/__fixture__/profileInsurance.fixture";
import { format } from "date-fns";

type DateInput = number | number[] | {[index: number]: number;};

export class ProfileInsuranceFactory
{
    private profileInsuranceFixture: Insurance[];

    constructor()
    {
        this.init();
    }

    public init(): this
    {
        this.profileInsuranceFixture = JSON.parse(JSON.stringify(profileInsuranceFixture)); // Deep clone.
        return this;
    }

    /**
     * Adjusts the scheduledTime and messageContent.systemData.date and messageContent.systemData.time, otherwise the
     * dates in the original fixture will likely be expired.
     */
    public adjustPackageDates(dateInput?: DateInput): this
    {
        this.profileInsuranceFixture = this.profileInsuranceFixture.map((insurance, index) =>
        {
            // Default to 1 hour ago.
            const defaultDate = Math.floor((Date.now() / 1000) - (1 * 60 * 60));

            let date: number;
            if (Array.isArray(dateInput) || typeof dateInput === "object")
            {
                date = dateInput[index] || defaultDate;
            }
            else
            {
                date = dateInput || defaultDate;
            }

            insurance.scheduledTime = date;
            insurance.messageContent.systemData.date = format(date, "MM.dd.yyyy");
            insurance.messageContent.systemData.time = format(date, "HH:mm");
            return insurance;
        });

        return this;
    }

    /**
     * Removes all attachment items that are currently attached to their parent, leaving the "normal" base items.
     */
    public removeAttachmentItems(): this
    {
        const itemHelper = container.resolve<ItemHelper>("ItemHelper");

        this.profileInsuranceFixture = this.profileInsuranceFixture.map((insurance) =>
        {
            insurance.items = insurance.items.filter((item) => !itemHelper.isAttachmentAttached(item));
            return insurance;
        });

        return this;
    }

    /**
     * Removes all normal base items leaving only attachment items that are currently attached to their parent.
     * This *will* cause orphaned attachments.
     */
    public removeRegularItems(): this
    {
        const itemHelper = container.resolve<ItemHelper>("ItemHelper");

        this.profileInsuranceFixture = this.profileInsuranceFixture.map((insurance) =>
        {
            insurance.items = insurance.items.filter((item) => itemHelper.isAttachmentAttached(item));
            return insurance;
        });

        return this;
    }

    public get(): Insurance[]
    {
        return this.profileInsuranceFixture;
    }
}
