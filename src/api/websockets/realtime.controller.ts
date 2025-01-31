import { websocket, kv } from '@nitric/sdk';
import { logger } from '../../common/logger';
import { validateAuth } from '../auth/auth.middleware';

const connectionsKv = kv('connections').allow('get', 'set', 'delete');
export const mySocket = websocket('realtime');

// CONNECT
mySocket.on('connect', async ctx => {
  const authToken = Array.isArray(ctx.req.query['authToken'])
    ? ctx.req.query['authToken'][0]
    : ctx.req.query['authToken'];
  const claims = await validateAuth(authToken);
  const orgId = claims.org_id;

  logger.info('WebSocket connection established', {
    organizationId: orgId,
    connectionId: ctx.req.connectionId,
  });

  await connectionsKv.set(ctx.req.connectionId, { organizationId: orgId });
});

// MESSAGE
export async function onMessage(ctx: any) {
  const msgBody = ctx.req.text();
  const authToken = Array.isArray(ctx.req.query['authToken'])
    ? ctx.req.query['authToken'][0]
    : ctx.req.query['authToken'];
  const claims = await validateAuth(authToken);
  const orgId = claims.org_id;

  logger.info('WebSocket message received', {
    organizationId: orgId,
    connectionId: ctx.req.connectionId,
    message: msgBody,
  });

  try {
    for await (const connectionId of connectionsKv.keys()) {
      const connData = await connectionsKv.get(connectionId);
      if (connData?.organizationId === orgId) {
        await mySocket.send(connectionId, msgBody);
      }
    }
  } catch (error) {
    logger.error('Error sending message', { error });
  }
}

// DISCONNECT
export async function onDisconnect(ctx: any) {
  const authToken = Array.isArray(ctx.req.query['authToken'])
    ? ctx.req.query['authToken'][0]
    : ctx.req.query['authToken'];
  const claims = await validateAuth(authToken);
  const orgId = claims.org_id;

  logger.info('WebSocket connection closed', {
    organizationId: orgId,
    connectionId: ctx.req.connectionId,
  });
  await connectionsKv.delete(ctx.req.connectionId);
}

mySocket.on('message', onMessage);
mySocket.on('disconnect', onDisconnect);
