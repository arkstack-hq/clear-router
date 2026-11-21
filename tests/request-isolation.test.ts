import { beforeEach, describe, expect, it } from 'vitest'
import express, { Router as ExRouter } from 'express'

import { Container } from '../src/decorators'
import { Controller } from '../src/Controller'
import { HttpContext } from '../src/types/express'
import Router from '../src/express/router'
import request from 'parasito'

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Reads its request bindings only after an await, so overlapping requests to
 * the same route would see each other's ctx/body/query/params if the shared
 * controller instance carried them.
 */
class EchoController extends Controller<HttpContext> {
    async show () {
        await pause(Number(this.query.delay))

        return {
            id: this.params.id,
            tag: this.query.tag,
            header: this.ctx.req.headers['x-tag'],
            requestTag: this.clearRequest.query.tag,
        }
    }

    async store () {
        await pause(Number(this.query.delay))

        return { tag: this.body.tag }
    }

    async override () {
        this.body = { tag: `${this.body.tag}!` }
        await pause(Number(this.query.delay))

        return { tag: this.body.tag }
    }
}

describe('Request isolation', () => {
    let app: express.Application

    beforeEach(() => {
        Router.configure({ container: { enabled: false, autoDiscover: false } })
        Router.reset()
        Container.clear()

        app = express()
        app.use(express.json())

        Router.get('/echo/:id', [EchoController, 'show'])
        Router.post('/echo', [EchoController, 'store'])
        Router.post('/echo/override', [EchoController, 'override'])

        const router = ExRouter()
        Router.apply(router)
        app.use(router)
    })

    // Earlier requests wait longest, so every later request rebinds the
    // controller before the earlier ones read from it.
    const delays = Array.from({ length: 12 }, (_, i) => (12 - i) * 5)

    it('keeps ctx, params, query and clearRequest per request on a shared controller', async () => {
        const responses = await Promise.all(delays.map((delay, i) =>
            request(app)
                .get(`/echo/${i}?tag=t${i}&delay=${delay}`)
                .set('X-Tag', `h${i}`)
        ))

        responses.forEach((res, i) => {
            expect(res.status).toBe(200)
            expect(res.body).toEqual({ id: String(i), tag: `t${i}`, header: `h${i}`, requestTag: `t${i}` })
        })
    })

    it('keeps the body per request on a shared controller', async () => {
        const responses = await Promise.all(delays.map((delay, i) =>
            request(app).post(`/echo?delay=${delay}`).send({ tag: `b${i}` })
        ))

        responses.forEach((res, i) => expect(res.body).toEqual({ tag: `b${i}` }))
    })

    it('scopes values a handler assigns to its own request', async () => {
        const responses = await Promise.all(delays.map((delay, i) =>
            request(app).post(`/echo/override?delay=${delay}`).send({ tag: `b${i}` })
        ))

        responses.forEach((res, i) => expect(res.body).toEqual({ tag: `b${i}!` }))
    })
})
