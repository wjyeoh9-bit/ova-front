import { signupHandler, type Env } from '../../server/handlers';
export const onRequestPost: PagesFunction<Env> = ({request,env}) => signupHandler(request,env);
