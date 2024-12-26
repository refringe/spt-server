import type { IWsNotificationEvent } from "@spt/models/eft/ws/IWsNotificationEvent";
import type { ISearchFriendResponse } from "../profile/ISearchFriendResponse";

export interface IWsFriendsListAccept extends IWsNotificationEvent {
    profile: ISearchFriendResponse;
}