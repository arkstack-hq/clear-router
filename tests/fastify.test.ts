import { beforeEach, describe, expect, it } from 'vitest'
import fastify, { FastifyInstance } from 'fastify'

import Router from '../src/fastify/router'
import request from 'parasito'

describe('Fastify App (JS)', () => {
    let app: FastifyInstance

    beforeEach(() => {
        Router.reset()

        app = fastify()
    })

    const setupApp = async (): Promise<void> => {
        Router.apply(app)
        await app.ready()
    }

    it('GET / should return 200', async () => {
        Router.get('/directly', () => 'Hello World')

        await setupApp()

        const res = await app.inject({ method: 'GET', url: '/directly' })
        expect(res.statusCode).toBe(200)
        expect(res.body).toBe('Hello World')
    })

    it('supports direct primitive, object, and Response returns', async () => {
        Router.get('/html', () => '<h1>Hello</h1>')
        Router.get('/api/text', () => '<h1>Hello</h1>')
        Router.post('/created', () => 42)
        Router.get('/payload', () => ({ ok: true }))
        Router.put('/api/users/:id', ({ clearRequest, clearResponse }) => {
            return clearResponse
                .status(202)
                .setHeader('x-user-id', clearRequest.param('id'))
                .json({
                    id: clearRequest.param('id'),
                    name: clearRequest.input('name'),
                    method: clearRequest.method,
                })
        })
        Router.get('/fetch-response', () => new Response('accepted', {
            status: 202,
            headers: { 'content-type': 'text/custom' },
        }))

        await setupApp()

        await request(app).get('/html')
            .expect(200)
            .expect('content-type', 'text/html; charset=utf-8')
            .expect('<h1>Hello</h1>')

        await request(app).get('/api/text')
            .expect(200)
            .expect('content-type', 'text/plain; charset=utf-8')

        await request(app).post('/created').expect(201).expect('42')

        await request(app).get('/payload')
            .expect('content-type', 'application/json; charset=utf-8')
            .expect({ ok: true })

        await request(app).put('/api/users/123')
            .send({ name: 'Ada' })
            .expect(202)
            .expect('content-type', 'application/json; charset=utf-8')
            .expect('x-user-id', '123')
            .expect({ id: '123', name: 'Ada', method: 'PUT' })

        await request(app).get('/fetch-response')
            .expect('content-type', 'text/custom')
            .expect('accepted')
    })

    it('should create options route for non-OPTIONS method routes', async () => {
        Router.get('/peeps/:id', () => 'Hello')

        await setupApp()

        await request(app).options('/peeps/123')
            .expect(204)
            .expect('allow', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD')
    })

    it('should always expose req.getBody in handlers', async () => {
        Router.get('/body-check', ({ req }) => {
            return {
                hasGetBody: typeof req.getBody === 'function',
                body: req.getBody(),
            }
        })

        Router.post('/body-check', ({ req }) => {
            return {
                hasGetBody: typeof req.getBody === 'function',
                body: req.getBody(),
            }
        })

        await setupApp()

        const getRes = await app.inject({ method: 'GET', url: '/body-check' })
        expect(getRes.statusCode).toBe(200)
        expect(getRes.json()).toEqual({
            hasGetBody: true,
            body: {},
        })

        const payload = { foo: 'bar' }
        const postRes = await app.inject({
            method: 'POST',
            url: '/body-check',
            payload,
        })
        expect(postRes.statusCode).toBe(201)
        expect(postRes.json()).toEqual({
            hasGetBody: true,
            body: payload,
        })
    })

    it('supports POST _method override for PUT routes', async () => {
        Router.put('/api/users/:id', ({ req }) => {
            return {
                method: req.method,
                id: (req.params as Record<string, string>).id,
            }
        })

        await setupApp()

        const res = await app.inject({
            method: 'POST',
            url: '/api/users/123',
            payload: { _method: 'PUT' },
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({
            method: 'POST',
            id: '123',
        })
    })

    it('returns 404 for POST to PUT route when _method override is missing', async () => {
        Router.put('/api/users/:id', () => 'updated')

        await setupApp()

        const res = await app.inject({
            method: 'POST',
            url: '/api/users/123',
            payload: {},
        })

        expect(res.statusCode).toBe(404)
    })

    it('shares one POST route between method overrides on the same path', async () => {
        Router.add(['put', 'patch'], '/api/users/:id', ({ req }) => ({ updated: (req.params as Record<string, string>).id }))
        Router.delete('/api/users/:id', () => ({ deleted: true }))

        await setupApp()

        const patch = await app.inject({ method: 'POST', url: '/api/users/1', payload: { _method: 'PATCH' } })
        const remove = await app.inject({ method: 'POST', url: '/api/users/1', payload: { _method: 'DELETE' } })
        const missing = await app.inject({ method: 'POST', url: '/api/users/1', payload: {} })

        expect(patch.json()).toEqual({ updated: '1' })
        expect(remove.json()).toEqual({ deleted: true })
        expect(missing.statusCode).toBe(404)
    })

    it('keeps a POST route next to method overrides on the same path', async () => {
        Router.post('/api/posts', () => ({ created: true }))
        Router.put('/api/posts', () => ({ replaced: true }))

        await setupApp()

        const create = await app.inject({ method: 'POST', url: '/api/posts', payload: {} })
        const replace = await app.inject({ method: 'POST', url: '/api/posts', payload: { _method: 'PUT' } })

        expect(create.json()).toEqual({ created: true })
        expect(replace.json()).toEqual({ replaced: true })
    })

    it('runs only the matching route middleware for an overridden POST', async () => {
        const seen: string[] = []

        Router.put('/api/items/:id', () => ({ ok: 'put' }), [async () => void seen.push('put')])
        Router.delete('/api/items/:id', () => ({ ok: 'delete' }), [
            (_req: unknown, _reply: unknown, next: () => void) => {
                seen.push('delete')
                next()
            },
        ])

        await setupApp()

        const res = await app.inject({ method: 'POST', url: '/api/items/1', payload: { _method: 'DELETE' } })

        expect(res.json()).toEqual({ ok: 'delete' })
        expect(seen).toEqual(['delete'])
    })

    it('supports apiResource controllers', async () => {
        class UserController {
            index () {
                return { action: 'index' }
            }

            create () {
                return { action: 'create' }
            }

            show () {
                return { action: 'show' }
            }

            update () {
                return { action: 'update' }
            }

            destroy () {
                return { action: 'destroy' }
            }
        }

        Router.apiResource('/users', UserController as never)

        await setupApp()

        const update = await app.inject({ method: 'PUT', url: '/users/1', payload: {} })
        const viaOverride = await app.inject({ method: 'POST', url: '/users/1', payload: { _method: 'PUT' } })
        const destroy = await app.inject({ method: 'POST', url: '/users/1', payload: { _method: 'DELETE' } })
        const store = await app.inject({ method: 'POST', url: '/users', payload: {} })

        expect(update.json()).toEqual({ action: 'update' })
        expect(viaOverride.json()).toEqual({ action: 'update' })
        expect(destroy.json()).toEqual({ action: 'destroy' })
        expect(store.json()).toEqual({ action: 'create' })
    })
})
