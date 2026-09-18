import { env } from 'cloudflare:workers';
import { signupHandler, type Env } from '@/server/handlers';
export const POST = (request:Request) => signupHandler(request,env as Env);
