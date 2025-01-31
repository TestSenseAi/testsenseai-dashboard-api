export type Activity = {
  id: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityResponse = {
  activities: Activity[];
};

export type PaginationQuery = {
  page: number;
  limit: number;
};

export type ActivityRequest = {
  organizationId: string;
  query: PaginationQuery;
  authHeader: string;
  response: ActivityResponse;
  error: Error;
  success: boolean;
  data: ActivityResponse;
  status: number;
  body: string;
  headers: Record<string, string[]>;
  json: () => Promise<ActivityResponse>;
  statusCode: number;
  statusMessage: string;
  statusText: string;
  ok: boolean;
  redirected: boolean;
  type: string;
  url: string;
};
