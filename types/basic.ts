import { Middleware as EMiddleware } from 'types/express'
import { Middleware as HMiddleware } from 'types/h3'

/**
 * Controller method reference
 */
export type ControllerHandler = [any, string];

/**
 * HTTP methods supported by the router
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';

/**
 * Common controller action names
 */
export type ControllerAction = 'index' | 'show' | 'create' | 'update' | 'destroy';

/**
 * Generic Object type for request data
 */
export type RequestData = Record<string, any>;

export type ApiResourceMiddleware<M extends EMiddleware | HMiddleware> =
    | M
    | M[]
    | { [K in ControllerAction]?: M | M[] }