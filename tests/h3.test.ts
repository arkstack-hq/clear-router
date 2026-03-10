import '../example/h3/web'

import { beforeEach, describe, expect, it } from 'vitest'

import { H3 } from 'h3'
import { H3App } from 'types/h3'
import Router from '../src/h3/router'

describe('H3 App (JS)', () => {
    let app: H3
    let router: H3App

    beforeEach(() => {
        Router.routes = []
        Router.prefix = ''
        Router.groupMiddlewares = []
        Router.globalMiddlewares = []
        Router.routesByPathMethod = {}
        Router.routesByMethod = {}

        app = new H3()
    })

    const setupApp = async (): Promise<void> => {
        Router.apply(app)
        router = Router.apply(app)
    }

    it('GET / should return 200', async () => {
        Router.get('/directly', () => 'Hello World')
        await setupApp()
        const res = await router.fetch(new Request(new URL('http://localhost/directly')))
        expect(res.status).toBe(200)
        expect(await res.text()).toBeDefined()
    })

    it('should create options route for non-OPTIONS method routes', async () => {
        Router.get('/peeps/:id', () => 'Hello')
        await setupApp()
        const res = await router
            .fetch(new global.Request(new URL('http://localhost/peeps/123'), {
                method: 'OPTIONS',
            }))

        expect(res.status).toBe(204)
        expect(res.headers.get('Allow')).toBe('GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD')
    })
})
