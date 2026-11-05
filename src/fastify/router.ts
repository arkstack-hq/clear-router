import type { ApiResourceMiddleware, HttpMethod, ResourceAction, RouteGroupSource } from '../types/basic'
import type { FastifyApp, Handler, HttpContext, Middleware, RouteHandler } from '../types/fastify'
import { isFetchResponse, resolveResponseMeta, responseWasSent } from '../core/responses'

import { CoreRouter } from '../core/CoreRouter'
import type { ResourceRoutes } from '../ResourceRoutes'
import type { Route } from '../Route'
import { RouteGroup } from '../RouteGroup'

/**
 * A route's handler and middleware, registered under the path's shared POST route.
 */
type PostEntry = {
    handler: (req: any, reply: any) => Promise<any>
    middlewares: Array<(req: any, reply: any, next: (error?: Error) => void) => any>
}

/**
 * @class clear-router Fastify Router
 * @description Laravel-style routing system for Fastify using shared clear-router core
 * @author 3m1n3nc3
 * @repository https://github.com/arkstack-hq/clear-router
 */
export class Router extends CoreRouter {
    protected static routerStateNamespace = 'clear-router:fastify'

    protected static formatWildcardParam (): string {
        return '*'
    }

    private static ensureRequestBodyAccessor (req: any): void {
        if (typeof req.getBody !== 'function') {
            req.getBody = () => req.body ?? {}
        }
    }

    private static async sendReturnValue (
        req: any,
        reply: any,
        value: any,
        method: HttpMethod,
        path: string
    ): Promise<any> {
        if (responseWasSent(reply) || value === reply || responseWasSent(value)) return value

        const meta = resolveResponseMeta(value, {
            headers: req.headers,
            method,
            path,
        })

        if (!meta) return undefined

        reply.code(meta.status)

        meta.headers?.forEach((headerValue, key) => {
            reply.header(key, headerValue)
        })

        if (isFetchResponse(meta.body)) {
            meta.body.headers.forEach((headerValue, key) => {
                reply.header(key, headerValue)
            })

            reply.code(meta.body.status)

            return reply.send(Buffer.from(await meta.body.arrayBuffer()))
        }

        if (meta.contentType) {
            reply.type(meta.contentType)
        }

        if (meta.isEmpty) {
            return reply.send()
        }

        return reply.send(meta.body)
    }

    /**
     * Add a route to the router
     * 
     * @param methods       HTTP methods for the route
     * @param path          Route path
     * @param handler       Route handler function
     * @param middlewares   Optional middlewares for the route
     */
    static add<T = any> (
        methods: HttpMethod | HttpMethod[],
        path: string,
        handler: Handler,
        middlewares?: Middleware[] | Middleware
    ): Route<HttpContext, Middleware, Handler<T>> {
        return super.add(methods, path, handler, middlewares)
    }

    /**
     * Define a resourceful API controller with standard CRUD routes
     * 
     * @param basePath     Base path for the resource
     * @param controller   Controller class or instance
     * @param options      Optional configuration for the resource
     */
    static apiResource (
        basePath: string,
        controller: any,
        options?: {
            only?: ResourceAction[]
            except?: ResourceAction[]
            middlewares?: ApiResourceMiddleware<Middleware>
        }
    ): ResourceRoutes<HttpContext, Middleware, Handler> {
        return super.apiResource(basePath, controller, options)
    }

    /**
     * Define a GET route
     * 
     * @param path 
     * @param handler 
     * @param middlewares 
     */
    static get<T = any> (
        path: string,
        handler: Handler<T>,
        middlewares?: Middleware[] | Middleware
    ): Route<HttpContext, Middleware, Handler<T>> {
        return super.get(path, handler, middlewares)
    }

    /**
     * Define a POST route
     * 
     * @param path 
     * @param handler 
     * @param middlewares 
     */
    static post<T = any> (
        path: string,
        handler: Handler<T>,
        middlewares?: Middleware[] | Middleware
    ): Route<HttpContext, Middleware, Handler<T>> {
        return super.post(path, handler, middlewares)
    }

    /**
     * Define a PUT route
     * 
     * @param path 
     * @param handler 
     * @param middlewares 
     */
    static put<T = any> (
        path: string,
        handler: Handler<T>,
        middlewares?: Middleware[] | Middleware
    ): Route<HttpContext, Middleware, Handler<T>> {
        return super.put(path, handler, middlewares)
    }

    /**
     * Define a DELETE route
     * 
     * @param path 
     * @param handler 
     * @param middlewares 
     */
    static delete<T = any> (
        path: string,
        handler: Handler<T>,
        middlewares?: Middleware[] | Middleware
    ): Route<HttpContext, Middleware, Handler<T>> {
        return super.delete(path, handler, middlewares)
    }

    /**
     * Define a PATCH route
     * 
     * @param path 
     * @param handler 
     * @param middlewares 
     */
    static patch<T = any> (
        path: string,
        handler: Handler<T>,
        middlewares?: Middleware[] | Middleware
    ): Route<HttpContext, Middleware, Handler<T>> {
        return super.patch(path, handler, middlewares)
    }

    /**
     * Define an OPTIONS route
     * 
     * @param path 
     * @param handler 
     * @param middlewares 
     */
    static options<T = any> (
        path: string,
        handler: Handler<T>,
        middlewares?: Middleware[] | Middleware
    ): Route<HttpContext, Middleware, Handler<T>> {
        return super.options(path, handler, middlewares)
    }

    /**
     * Define a HEAD route
     * 
     * @param path 
     * @param handler 
     * @param middlewares 
     */
    static head<T = any> (
        path: string,
        handler: Handler<T>,
        middlewares?: Middleware[] | Middleware
    ): Route<HttpContext, Middleware, Handler<T>> {
        return super.head(path, handler, middlewares)
    }

    /**
     * Define a group of routes with a common prefix and optional middlewares
     * 
     * @param prefix 
     * @param callback 
     * @param middlewares 
     */
    static group<T = any, S extends RouteGroupSource = RouteGroupSource> (
        prefix: string,
        source: S,
        middlewares?: Middleware[]
    ): RouteGroup<HttpContext, Middleware, Handler<T>, S> {
        return super.group(prefix, source, middlewares)
    }

    /**
     * Apply middlewares to a group of routes defined within the callback
     * 
     * @param middlewares 
     * @param callback 
     */
    static middleware (middlewares: Middleware[], callback: () => void): void {
        super.middleware(middlewares, callback)
    }

    static allRoutes<T = any> (): Array<Route<HttpContext, Middleware, Handler<T>>>
    /**
     * @param type  - 'path' to get routes organized by path
     */
    static allRoutes<T = any> (type: 'path'): Record<string, Route<HttpContext, Middleware, Handler<T>>>
    /**
     * @param type  - 'method' to get routes organized by method 
     */
    static allRoutes<T = any> (type: 'method'): { [method in Uppercase<HttpMethod>]?: Array<Route<HttpContext, Middleware, Handler<T>>> }
    static allRoutes<T = any> (type: 'name'): Record<string, Route<HttpContext, Middleware, Handler<T>>>
    static allRoutes<T = any> (type?: 'method' | 'path' | 'name'):
        Array<Route<HttpContext, Middleware, Handler<T>>> |
        Record<string, Route<HttpContext, Middleware, Handler<T>>> |
        Record<string, Array<Route<HttpContext, Middleware, Handler<T>>>> {
        return super.allRoutes(type as any) as any
    }

    static route<T = any> (name: string): Route<HttpContext, Middleware, Handler<T>> | undefined {
        return super.route(name)
    }

    /**
     * Apply the defined routes to a Fastify application instance.
     *
     * Fastify allows one handler per method and path, so every POST handler for a
     * path (a real POST route and the `_method` overrides of PUT, PATCH and DELETE
     * routes) is registered as one POST route that dispatches by the override.
     *
     * @param app  - The Fastify application instance
     * @returns    The Fastify application instance with the applied routes
     */
    static apply (app: FastifyApp): FastifyApp {
        const postRoutes = new Map<string, Map<HttpMethod, PostEntry>>()

        for (const route of this.orderedRoutes()) {
            let resolved: ReturnType<typeof Router.resolveHandler>

            try {
                resolved = this.resolveHandler(route)
            } catch (error: any) {
                console.error(`[ROUTES] Error setting up route ${route.path}:`, error.message)
                throw error
            }

            if (!resolved.handlerFunction) continue

            for (const method of route.methods) {
                const allowedMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']

                if (method === 'options' && route.methods.length > 1) continue
                if (!allowedMethods.includes(method)) {
                    throw new Error(`Invalid HTTP method: ${method} for route: ${route.path}`)
                }

                const handler = Router.createHandler(route, resolved, method)
                const middlewares = (route.middlewares ?? []) as PostEntry['middlewares']

                for (const registrationPath of this.resolveRegistrationPaths(route)) {
                    if (method === 'post' || ['put', 'patch', 'delete'].includes(method)) {
                        const entries = postRoutes.get(registrationPath) ?? new Map<HttpMethod, PostEntry>()

                        entries.set(method, { handler, middlewares })
                        postRoutes.set(registrationPath, entries)
                    }

                    if (method === 'post') continue

                    app.route({
                        method: method.toUpperCase() as any,
                        url: registrationPath,
                        preHandler: middlewares as any,
                        handler,
                    })
                }
            }
        }

        for (const [url, entries] of postRoutes) {
            Router.registerPostRoute(app, url, entries)
        }

        return app
    }

    /**
     * Builds the Fastify handler that runs a route for the given method.
     *
     * @param route
     * @param resolved
     * @param method
     * @returns
     */
    private static createHandler (
        route: Route<HttpContext, Middleware, Handler>,
        resolved: ReturnType<typeof Router.resolveHandler>,
        method: HttpMethod
    ): PostEntry['handler'] {
        const { instance, bindingTarget, bindingMethod, bindingHandler, bindingMetadata } = resolved
        const handlerFunction = resolved.handlerFunction as RouteHandler

        return async (req, reply) => {
            Router.ensureRequestBodyAccessor(req)

            const ctx = {
                req: req as HttpContext['req'],
                reply,
            } as HttpContext

            const inst = instance ?? route
            const params = Router.matchRoute(route, ctx, (ctx.req.params as Record<string, any>) ?? {})
            if (params === false) return reply.code(404).send()
            Object.assign((ctx.req as any).params ??= {}, params)

            Router.bindRequestToInstance(ctx, inst, route, {
                body: ctx.req.getBody(),
                query: (ctx.req.query as Record<string, any>) ?? {},
                params,
                method,
            })

            const result = await Router.callHandler(handlerFunction, ctx, bindingTarget, bindingMethod, bindingHandler, bindingMetadata)
            const resolvedResult = await Promise.resolve(result)
            const outgoing = typeof resolvedResult === 'undefined' && ctx.clearResponse?.sent
                ? ctx.clearResponse
                : resolvedResult

            return Router.sendReturnValue(req, reply, outgoing, method, route.path)
        }
    }

    /**
     * Registers the single POST route for a path. It picks the entry named by
     * the `_method` override (or the real POST route when there is none), runs
     * that entry's middleware, then its handler, and answers 404 when no entry matches.
     *
     * @param app
     * @param url
     * @param entries
     */
    private static registerPostRoute (app: FastifyApp, url: string, entries: Map<HttpMethod, PostEntry>): void {
        const pick = (req: any): PostEntry | undefined => {
            const override = Router.resolveMethodOverride(req.method, req.headers as Record<string, any>, req.body)

            return entries.get(override && override !== 'post' ? override : 'post')
        }

        app.route({
            method: 'POST',
            url,
            preHandler: async (req, reply) => {
                const entry = pick(req)

                if (entry) await Router.runMiddlewares(entry.middlewares, req, reply)
            },
            handler: async (req, reply) => {
                const entry = pick(req)

                if (!entry) return reply.code(404).send()

                return entry.handler(req, reply)
            },
        })
    }

    /**
     * Runs Fastify route middleware in order, in async or callback form,
     * stopping once one of them sends the reply.
     *
     * @param middlewares
     * @param req
     * @param reply
     */
    private static async runMiddlewares (middlewares: PostEntry['middlewares'], req: any, reply: any): Promise<void> {
        for (const middleware of [middlewares].flat()) {
            if (reply.sent) return

            if (middleware.length >= 3) {
                await new Promise<void>((resolve, reject) => {
                    Promise.resolve(middleware(req, reply, (error?: Error) => (error ? reject(error) : resolve())))
                        .catch(reject)
                })
            } else {
                await middleware(req, reply, () => undefined)
            }
        }
    }
}

export default Router
