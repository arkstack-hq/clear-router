import '../example/express/web'

import { beforeEach, describe, expect, it } from 'vitest'
import express, { Router as ExRouter } from 'express'

import Router from '../src/express/router'
import request from 'supertest'

describe('Express App (JS)', () => {
    let app: express.Application
    let router: ExRouter

    beforeEach(() => {
        Router.routes = []
        Router.prefix = ''
        Router.groupMiddlewares = []
        Router.globalMiddlewares = []
        Router.routesByPathMethod = {}
        Router.routesByMethod = {}

        app = express()
        router = ExRouter()
        app.use(express.json())
    })

    const setupApp = async (): Promise<void> => {
        Router.apply(router)
        app.use(router)
    }

    it('GET / should return 200', async () => {
        Router.get('/directly', ({ res }) => res.send('Hello World'))
        await setupApp()
        const res = await request(app).get('/directly')
        expect(res.statusCode).toBe(200)
        expect(res.text || res.body).toBeDefined()
    })

    it('should create options route for non-OPTIONS method routes', async () => {
        Router.get('/peeps/:id', ({ res }) => res.send('Hello'))
        await setupApp()
        const res = await request(app).options('/peeps/123')

        expect(res.status).toBe(204)
        expect(res.headers['allow']).toBe('GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD')
    })
})
