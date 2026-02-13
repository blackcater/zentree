import { describe, expect, it, vi } from 'vitest'

import { Container } from './container'

describe('Container', () => {
	describe('singleton', () => {
		it('should register a class as singleton', () => {
			class Foo {}
			Container.singleton(Foo)

			const instance1 = Container.inject(Foo)
			const instance2 = Container.inject(Foo)

			expect(instance1).toBe(instance2)
		})

		it('should register a factory as singleton', () => {
			const factory = vi.fn(() => ({ value: Math.random() }))
			const token = Container.createToken('singleton-test')

			Container.singleton(token, factory)

			const instance1 = Container.inject(token)
			const instance2 = Container.inject(token)

			expect(factory).toHaveBeenCalledTimes(1)
			expect(instance1).toBe(instance2)
		})
	})

	describe('transient', () => {
		it('should register a class as transient', () => {
			class Foo {}
			Container.transient(Foo)

			const instance1 = Container.inject(Foo)
			const instance2 = Container.inject(Foo)

			expect(instance1).not.toBe(instance2)
		})

		it('should register a factory as transient', () => {
			const factory = vi.fn(() => ({ value: Math.random() }))
			const token = Container.createToken('transient-test')

			Container.transient(token, factory)

			const instance1 = Container.inject(token)
			const instance2 = Container.inject(token)

			expect(factory).toHaveBeenCalledTimes(2)
			expect(instance1).not.toBe(instance2)
		})
	})

	describe('inject', () => {
		it('should inject registered dependency', () => {
			class Foo {
				bar = 'bar'
			}
			Container.singleton(Foo)

			const instance = Container.inject(Foo)

			expect(instance).toBeInstanceOf(Foo)
			expect(instance.bar).toBe('bar')
		})

		it('should return undefined when must is false and dependency not found', () => {
			const token = Container.createToken('missing')

			const result = Container.inject(token, false)

			expect(result).toBeUndefined()
		})

		it('should throw error when must is true and dependency not found', () => {
			const token = Container.createToken('missing')

			expect(() => Container.inject(token, undefined as never)).toThrow(
				"Dependency with name 'missing' could not be resolved."
			)
		})

		it('should throw error with token name when dependency not found', () => {
			const token = Container.createToken('myService')

			expect(() => Container.inject(token)).toThrow(
				"Dependency with name 'myService' could not be resolved."
			)
		})
	})

	describe('Token', () => {
		it('should create token with name', () => {
			const token = Container.createToken('myToken')

			expect(token.name).toBe('myToken')
		})

		it('should preserve generic type', () => {
			const token = Container.createToken<string>('stringToken')

			expect(token.name).toBe('stringToken')
		})
	})

	describe('static methods', () => {
		it('should use global container for static inject', () => {
			class Foo {}
			Container.singleton(Foo)

			const instance = Container.inject(Foo)

			expect(instance).toBeInstanceOf(Foo)
		})

		it('should use global container for static singleton', () => {
			class Foo {}
			Container.singleton(Foo)

			const instance1 = Container.inject(Foo)
			const instance2 = Container.inject(Foo)

			expect(instance1).toBe(instance2)
		})

		it('should use global container for static transient', () => {
			class Foo {}
			Container.transient(Foo)

			const instance1 = Container.inject(Foo)
			const instance2 = Container.inject(Foo)

			expect(instance1).not.toBe(instance2)
		})
	})
})
