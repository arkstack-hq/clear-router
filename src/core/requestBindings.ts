import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * The request values the router binds onto a handler's instance (a controller,
 * or the route itself for function handlers).
 */
export const REQUEST_BINDING_KEYS = ['ctx', 'body', 'query', 'params', 'clearRequest'] as const

type RequestBindingKey = typeof REQUEST_BINDING_KEYS[number]
type RequestBindingValues = Partial<Record<RequestBindingKey, any>>

/** The HTTP context of the request whose handler is running. */
const activeRequest = new AsyncLocalStorage<object>()

/** Values bound or assigned outside a request (tests, direct calls). */
const fallbackValues = new WeakMap<object, RequestBindingValues>()

/** Values a handler assigned during a request, per request then per instance. */
const assignedValues = new WeakMap<object, WeakMap<object, RequestBindingValues>>()

/**
 * Run a handler with `ctx` as the active request, so the request bindings of
 * every instance read that request's values for the whole (async) call.
 */
export function runWithRequest<T> (ctx: object, callback: () => T): T {
    return activeRequest.run(ctx, callback)
}

function valueFromRequest (ctx: any, key: RequestBindingKey): any {
    if (key === 'ctx') return ctx
    if (key === 'clearRequest') return ctx.clearRequest

    return ctx.clearRequest?.[key]
}

function valuesFor (owner: object, ctx: object | undefined): RequestBindingValues {
    if (!ctx) {
        if (!fallbackValues.has(owner)) fallbackValues.set(owner, {})

        return fallbackValues.get(owner)!
    }

    if (!assignedValues.has(ctx)) assignedValues.set(ctx, new WeakMap())

    const perInstance = assignedValues.get(ctx)!

    if (!perInstance.has(owner)) perInstance.set(owner, {})

    return perInstance.get(owner)!
}

/**
 * Turn `ctx`, `body`, `query`, `params` and `clearRequest` on a prototype into
 * accessors backed by the active request. One instance serves every request to
 * its route, so plain properties would hand a handler that reads them after an
 * `await` the values of whichever request was bound last.
 *
 * Outside a request the accessors keep their old behaviour: they hold the last
 * value assigned to them. A value a handler assigns during a request stays with
 * that request.
 */
export function defineRequestBindings (
    prototype: object,
    defaults: Partial<Record<RequestBindingKey, () => unknown>> = {}
): void {
    for (const key of REQUEST_BINDING_KEYS) {
        Object.defineProperty(prototype, key, {
            configurable: true,
            enumerable: false,
            get (this: object) {
                const ctx = activeRequest.getStore()
                const values = valuesFor(this, ctx)

                if (key in values) return values[key]
                if (ctx) return valueFromRequest(ctx, key)
                // Each instance gets its own default, as a field initializer would.
                if (defaults[key]) return (values[key] = defaults[key]!())

                return undefined
            },
            set (this: object, value: unknown) {
                valuesFor(this, activeRequest.getStore())[key] = value
            },
        })
    }
}
