import type { ClearRequest } from './ClearRequest'
import type { RequestData } from './types'
import { defineRequestBindings } from './core/requestBindings'

export abstract class Controller<X = any> {
    [x: string]: any
    // Accessors scoped to the active request (see defineRequestBindings).
    declare ctx: X
    declare body: RequestData
    declare query: RequestData
    declare params: RequestData
    declare clearRequest: ClearRequest
}

defineRequestBindings(Controller.prototype)
