export interface Channel {id:string;platform:string;name:string;isActive:boolean}
export interface Media {id:string;mimeType:string;url:string}
export interface ChannelResult {channelId:string;status:string;platformPostId?:string;url?:string;error?:string;pending?:boolean}
export interface RemotePostInput {content:string;channelIds:string[];mediaIds:string[];scheduledAt?:string}
export interface RemotePost {id:string;status:string;scheduledAt:string|null;postChannels:ChannelResult[]}
export interface RemotePublishResult {postId:string;results:ChannelResult[]}
export interface PublisherConnection {connected:boolean;checkedAt:string;capabilities:string[];error:string|null}
export interface PublisherPort {listChannels():Promise<Channel[]>;getBalance():Promise<{balance:number}>;listMedia():Promise<Media[]>;createPost(input:RemotePostInput):Promise<RemotePost>;publishPost(postId:string):Promise<RemotePublishResult>;getPost(postId:string):Promise<RemotePost>}
