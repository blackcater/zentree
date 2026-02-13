export class Container {
	readonly #registry: Map<Container.Injectable, Container.Entry>

	private constructor() {
		this.#registry = new Map()
	}

	singleton<T>(token: Container.Constructable<T>): this
	singleton<T>(token: Container.Injectable<T>, factory: () => T): this
	singleton<T>(token: Container.Injectable<T>, factory?: () => T): this {
		if (factory) {
			this.#registry.set(token, { factory, singleton: true })
		} else {
			const Constructable = token as Container.Constructable<T>
			this.#registry.set(token, {
				factory: () => new Constructable(),
				singleton: true,
			})
		}

		return this
	}

	transient<T>(token: Container.Constructable<T>): this
	transient<T>(token: Container.Injectable<T>, factory: () => T): this
	transient<T>(token: Container.Injectable<T>, factory?: () => T): this {
		if (factory) {
			this.#registry.set(token, { factory, singleton: false })
		} else {
			const Constructable = token as Container.Constructable<T>
			this.#registry.set(token, {
				factory: () => new Constructable(),
				singleton: false,
			})
		}

		return this
	}

	inject<T>(token: Container.Injectable<T>): T
	inject<T>(token: Container.Injectable<T>, must: false): T | undefined
	inject<T>(token: Container.Injectable<T>, must = true) {
		const entry = this.#registry.get(token)

		if (entry) {
			if (entry.singleton) {
				if (entry.instance) {
					return entry.instance.value
				}

				entry.instance = { value: entry.factory() }

				return entry.instance.value
			} else {
				return entry.factory()
			}
		}

		if (must) {
			throw new Error(
				`Dependency with name '${token.name}' could not be resolved.`
			)
		}
	}

	static readonly #global = new Container()

	/**
	 * Create dependency identifier Token
	 *
	 * @template T Dependency type
	 *
	 * @param name - Token name
	 *
	 * @returns Newly created Token instance
	 */
	static createToken<T>(name: string) {
		return new Container.Token<T>(name)
	}

	/**
	 * Global inject method binding
	 */
	static readonly inject = Container.#global.inject.bind(Container.#global)

	/**
	 * Global singleton registration method binding
	 */
	static readonly singleton = Container.#global.singleton.bind(
		Container.#global
	)

	/**
	 * Global transient registration method binding
	 */
	static readonly transient = Container.#global.transient.bind(
		Container.#global
	)
}

export namespace Container {
	/**
	 * Private Symbol used to mark Token generic types
	 *
	 * @private
	 */
	const TOKEN_TYPE_SYMBOL = Symbol('token-type')

	/**
	 * Dependency identifier Token class for type-safe dependency identification
	 *
	 * @template T Dependency type
	 */
	export class Token<T = unknown> {
		/**
		 * Private property used to help TypeScript correctly infer types
		 *
		 * @private
		 */
		[TOKEN_TYPE_SYMBOL]?: T

		/**
		 * Create Token instance
		 *
		 * @param name - Token name
		 */
		constructor(readonly name: string) {}
	}

	/**
	 * Abstract constructor type
	 *
	 * @template T Instance type
	 */
	export type AbstractConstructable<T = unknown> = CallableFunction & {
		prototype: T
	}

	/**
	 * Constructor type
	 *
	 * @template T Instance type
	 */
	export type Constructable<T = unknown> = new (...args: any[]) => T

	/**
	 * Injectable dependency identifier type
	 *
	 * @template T Dependency type
	 */
	export type Injectable<T = unknown> =
		| Token<T>
		| AbstractConstructable<T>
		| Constructable<T>

	/**
	 * Dependency registration entry type
	 *
	 * @template T Dependency type
	 */
	export type Entry<T = unknown> = {
		factory: () => T
		singleton: boolean
		instance?: { value: T }
	}
}
