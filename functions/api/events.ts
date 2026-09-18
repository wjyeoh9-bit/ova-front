import { eventsHandler, type Env } from '../../server/handlers';
export const onRequestPost: PagesFunction<Env> = ({request,env}) => eventsHandler(request,env);
