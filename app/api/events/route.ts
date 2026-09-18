import { env } from 'cloudflare:workers';
import { eventsHandler, type Env } from '@/server/handlers';
export const POST = (request:Request) => eventsHandler(request,env as Env);
