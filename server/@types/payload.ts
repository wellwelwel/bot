export type Payload = {
  repository: string;
  prNumber: number;
  prTitle: string;
  prUser: string;
  comment: string;
  updateIfIncludes?: string;
};
