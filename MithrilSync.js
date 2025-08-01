/**
 * MithrilSync provides tools for deep object flattening, tracking, diffing,
 * mutation, and live synchronization with support for Maps, Sets, Arrays, and Objects.
 */
class MithrilSync {
    /**
     * @param {Object} object - The object to initialize and track.
     * @example
     * const sync = new MithrilSync({ user: { name: 'Alice' } });
     */
    constructor(object = {}) {
        this.original = structuredClone(object);
        this.entries = MithrilSync.flatten(object);
        this._watcher = null;
    };

    /**
     * Flattens a nested object structure into a list of entries.
     * Supports Map, Set, Array, and plain objects.
     *
     * @param {Object} obj - The object to flatten.
     * @param {Array} prefix - The current path (used internally).
     * @returns {Array} List of flattened entries.
     * @example
     * MithrilSync.flatten({ a: { b: 1 } });
     * // => [{ path: ['a', 'b'], dotPath: 'a.b', value: 1, kind: 'number' }]
     */
    static flatten(obj = {}, prefix = []) {
        const results = [];
        const stack = [{ current: obj, path: prefix, kind: Array.isArray(obj) ? 'array' : typeof obj }];

        while (stack.length) {
            const { current, path, kind } = stack.pop();

            // Include the current node itself (as a container entry), but skip root (empty path)
            if (path.length) {
                results.push({
                    path: [...path],
                    dotPath: path.join('.'),
                    key: path[path.length - 1],
                    value: current,
                    kind: Array.isArray(current)
                        ? 'array'
                        : current instanceof Map
                            ? 'map'
                            : current instanceof Set
                                ? 'set'
                                : typeof current
                });
            }

            // Recurse into child structures
            if (current instanceof Map) {
                for (const [key, value] of current.entries()) {
                    stack.push({ current: value, path: [...path, key], kind: 'map' });
                }
            } else if (current instanceof Set) {
                let index = 0;
                for (const value of current.values()) {
                    stack.push({ current: value, path: [...path, index++], kind: 'set' });
                }
            } else if (Array.isArray(current)) {
                current.forEach((value, index) => {
                    stack.push({ current: value, path: [...path, index], kind: 'array' });
                });
            } else if (typeof current === 'object' && current !== null) {
                for (const [key, value] of Object.entries(current)) {
                    stack.push({ current: value, path: [...path, key], kind: 'object' });
                }
            }
        }

        return results;
    }

    /**
     * Reconstructs an object from flattened entries.
     *
     * @param {Array} entries - The flattened entries to rebuild.
     * @returns {Object} The nested object.
     * @example
     * MithrilSync.rebuild([{ path: ['a', 'b'], value: 1 }]);
     * // => { a: { b: 1 } }
     */
    static rebuild(entries = []) {
        const result = {};
        for (const { path, value } of entries) {
            let ref = result;
            for (let i = 0; i < path.length; i++) {
                const key = path[i];
                if (i === path.length - 1) {
                    ref[key] = value;
                } else {
                    if (!(key in ref)) ref[key] = typeof path[i + 1] === 'number' ? [] : {};
                    ref = ref[key];
                }
            }
        }
        return result;
    };

    /**
     * Deeply merges two objects recursively.
     *
     * @param {Object} target
     * @param {Object} source
     * @returns {Object} The merged object.
     * @example
     * MithrilSync.merge({ a: 1 }, { b: 2 });
     * // => { a: 1, b: 2 }
     */
    static merge(target = {}, source = {}) {
        for (const [key, value] of Object.entries(source)) {
            if (
                typeof value === 'object' && value !== null &&
                typeof target[key] === 'object' && target[key] !== null
            ) {
                target[key] = MithrilSync.merge(target[key], value);
            } else {
                target[key] = value;
            }
        }
        return target;
    };

    /**
     * Compares two sets of entries and returns a list of changes.
     *
     * @param {Array} oldEntries
     * @param {Array} newEntries
     * @param {Object} options
     * @param {boolean} [options.deepCompare=false]
     * @param {boolean} [options.strictTypes=false]
     * @returns {Array} List of changes (added, removed, modified).
     * @example
     * MithrilSync.watch(oldFlat, newFlat);
     */
    static watch(oldEntries = [], newEntries = [], options = {}) {
        const { deepCompare = false, strictTypes = false } = options;
        const changes = [];

        const toMap = (entries) =>
            Object.fromEntries(entries.map(({ dotPath, value }) => [dotPath, value]));

        const oldMap = toMap(oldEntries);
        const newMap = toMap(newEntries);

        const allPaths = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);

        for (const path of allPaths) {
            if (!(path in oldMap)) {
                changes.push({ type: 'added', path, value: newMap[path] });
            } else if (!(path in newMap)) {
                changes.push({ type: 'removed', path, oldValue: oldMap[path] });
            } else {
                const isDifferent = deepCompare
                    ? JSON.stringify(oldMap[path]) !== JSON.stringify(newMap[path])
                    : (strictTypes ? oldMap[path] !== newMap[path] : oldMap[path] != newMap[path]);

                if (isDifferent) {
                    changes.push({
                        type: 'modified',
                        path,
                        oldValue: oldMap[path],
                        newValue: newMap[path],
                    });
                }
            }
        }

        return changes;
    };

    /**
     * Gets a value from an object using dotPath.
     *
     * @param {Object} obj
     * @param {string} dotPath
     * @returns {*} Value at the path or undefined.
     * @example
     * MithrilSync.get({ a: { b: 1 } }, 'a.b');
     * // => 1
     */
    static get(obj, dotPath) {
        return dotPath.split('.').reduce((o, k) => o?.[k], obj);
    };

    /**
     * Sets a value in an object using dotPath.
     *
     * @param {Object} obj
     * @param {string} dotPath
     * @param {*} value
     * @example
     * const obj = {};
     * MithrilSync.set(obj, 'a.b', 42);
     * // obj => { a: { b: 42 } }
     */
    static set(obj, dotPath, value) {
        const keys = dotPath.split('.');
        let ref = obj;
        keys.slice(0, -1).forEach((k) => {
            if (!(k in ref)) ref[k] = {};
            ref = ref[k];
        });
        ref[keys.at(-1)] = value;
    };

    /**
     * Applies a list of changes to a target object.
     *
     * @param {Object} target
     * @param {Array} changes
     * @returns {Object} Modified target
     */
    static applyChanges(target = {}, changes = []) {
        for (const change of changes) {
            const keys = change.path.split('.');
            let ref = target;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in ref)) ref[keys[i]] = {};
                ref = ref[keys[i]];
            }
            const lastKey = keys.at(-1);
            if (change.type === 'removed') {
                delete ref[lastKey];
            } else {
                ref[lastKey] = change.value ?? change.newValue;
            }
        }
        return target;
    };

    /**
     * Builds a new object from a base and a diff.
     *
     * @param {Object} base
     * @param {Array} diff
     * @returns {Object} New object with applied diff
     */
    static fromDiff(base = {}, diff = []) {
        return this.applyChanges(structuredClone(base), diff);
    };

    /**
     * Manually updates the internal entry list.
     *
     * @param {Array} entries - New flattened entries.
     */
    syncEntries(entries = []) {
        this.entries = [...entries];
    };

    /**
     * Returns the original object used in the constructor.
     *
     * @returns {Object}
     */
    getOriginal() {
        return structuredClone(this.original);
    };

    /**
     * Returns the current flattened entries.
     *
     * @returns {Array}
     */
    getFlat() {
        return structuredClone(this.entries);
    };

    /**
     * Rebuilds the full object from flattened entries.
     *
     * @returns {Object}
     */
    rebuild() {
        return MithrilSync.rebuild(this.entries);
    };

    /**
     * Updates or adds a single entry by dotPath.
     *
     * @param {string} dotPath
     * @param {*} newValue
     * @example
     * sync.updateEntry('user.name', 'Bob');
     */
    updateEntry(dotPath, newValue) {
        const index = this.entries.findIndex((e) => e.dotPath === dotPath);
        if (index !== -1) {
            this.entries[index].value = newValue;
        } else {
            const path = dotPath.split('.').map(k => isNaN(k) ? k : +k);
            this.entries.push({ path, dotPath, value: newValue });
        }
    };

    /**
     * Removes a flattened entry by dotPath.
     *
     * @param {string} dotPath
     */
    removeEntry(dotPath) {
        this.entries = this.entries.filter((e) => e.dotPath !== dotPath);
    };

    /**
     * Compares the current rebuilt object with the original.
     *
     * @param {Object} options
     * @returns {Array} List of detected changes.
     */
    getChanges(options = {}) {
        const currentFlat = MithrilSync.flatten(this.rebuild());
        return MithrilSync.watch(MithrilSync.flatten(this.original), currentFlat, options);
    };

    /**
     * Merges the current original object with another one.
     *
     * @param {Object} source
     * @example
     * sync.mergeWith({ user: { email: 'a@b.com' } });
     */
    mergeWith(source = {}) {
        const merged = MithrilSync.merge(this.getOriginal(), source);
        this.entries = MithrilSync.flatten(merged);
    };

    /**
     * Reverts changes using a diff (like undo).
     *
     * @param {Array} diff
     * @example
     * sync.revertChanges(diff);
     */
    revertChanges(diff = []) {
        const reversed = diff.map(change => {
            if (change.type === 'added') {
                return { type: 'removed', path: change.path };
            } else if (change.type === 'removed') {
                return { type: 'added', path: change.path, value: change.oldValue };
            } else if (change.type === 'modified') {
                return {
                    type: 'modified',
                    path: change.path,
                    oldValue: change.newValue,
                    newValue: change.oldValue
                };
            }
        });
        const reverted = MithrilSync.applyChanges(this.rebuild(), reversed);
        this.entries = MithrilSync.flatten(reverted);
    };

    /**
     * Starts watching for live changes and invokes a callback when they occur.
     *
     * @param {Function} callback
     * @param {number} interval - Polling interval in ms.
     * @param {Object} options - Options passed to watch()
     * @example
     * sync.watchLive((changes) => console.log(changes), 1000);
     */
    watchLive(callback, interval = 500, options = {}) {
        clearInterval(this._watcher);
        let previousFlat = MithrilSync.flatten(this.rebuild());

        this._watcher = setInterval(() => {
            const currentFlat = MithrilSync.flatten(this.rebuild());
            const changes = MithrilSync.watch(previousFlat, currentFlat, options);
            if (changes.length) {
                previousFlat = currentFlat;
                callback(changes);
            }
        }, interval);
    };

    /**
     * Stops the live change watcher.
     */
    stopWatch() {
        clearInterval(this._watcher);
        this._watcher = null;
    };

    /**
     * Rebuilds the object from only selected entries.
     *
     * @param {Function} filterFn - A function to filter entries.
     * @returns {Object}
     * @example
     * sync.toTree(entry => entry.dotPath.startsWith('user'));
     */
    toTree(filterFn = () => true) {
        const filtered = this.entries.filter(filterFn);
        return MithrilSync.rebuild(filtered);
    };

    /**
     * Searches through flattened entries with advanced filtering options.
     *
     * @param {Object} options
     * @param {string|number} options.target
     * @param {Array} [options.fallbacks]
     * @param {boolean} [options.matchKeys=true]
     * @param {boolean} [options.matchValues=true]
     * @param {boolean} [options.caseInsensitive=false]
     * @param {boolean} [options.useRegex=false]
     * @param {boolean} [options.findAll=false]
     * @param {Function|null} [options.mutate=null]
     * @param {Array} [options.onlyTypes=[]]
     * @param {'full'|'dotPaths'|'entriesOnly'} [options.returnFormat='full']
     * @param {boolean} [options.includeNull=true]
     * @param {boolean} [options.includeUndefined=true]
     * @param {boolean} [options.includeEmptyString=true]
     * @returns {Object} { matched: boolean, results: array }
     * @example
     * sync.find({ target: 'name', matchKeys: true });
     */
    find({
        target = '',
        fallbacks = [],
        matchKeys = true,
        matchValues = true,
        caseInsensitive = false,
        useRegex = false,
        findAll = false,
        mutate = null,
        onlyTypes = [],
        returnFormat = 'full',
        includeNull = true,
        includeUndefined = true,
        includeEmptyString = true
    } = {}) {
        const targets = [];

        if (typeof target === 'string' && target.trim()) {
            targets.push(target);
        }

        if (Array.isArray(fallbacks)) {
            targets.push(...fallbacks.filter(t => typeof t === 'string' && t.trim()));
        }

        if (targets.length === 0) {
            return { matched: false, results: [] };
        }

        const normalize = (str) => caseInsensitive ? str.toLowerCase() : str;

        const seenPaths = new Set();
        const results = [];

        for (const search of targets) {
            const targetNormalized = normalize(search);
            const regex = useRegex ? new RegExp(search, caseInsensitive ? 'i' : '') : null;

            const isMatch = (input) => {
                if (typeof input !== 'string') input = String(input);
                const testStr = normalize(input);
                return useRegex ? regex.test(input) : testStr === targetNormalized;
            };

            for (const entry of this.entries) {
                const key = entry.path.at(-1);
                const val = entry.value;

                if (onlyTypes.length > 0 && !onlyTypes.includes(typeof val)) continue;
                if (!includeNull && val === null) continue;
                if (!includeUndefined && val === undefined) continue;
                if (!includeEmptyString && val === '') continue;

                let matched = false;

                if (matchKeys && isMatch(String(key))) {
                    matched = true;
                }

                if (!matched && matchValues && isMatch(val)) {
                    matched = true;
                }

                if (matched && !seenPaths.has(entry.dotPath)) {
                    seenPaths.add(entry.dotPath);

                    if (mutate) mutate(entry);

                    switch (returnFormat) {
                        case 'dotPaths':
                            results.push(entry.dotPath);
                            break;
                        case 'entriesOnly':
                            results.push(entry);
                            break;
                        default:
                            results.push({
                                key,
                                value: val,
                                path: entry.path,
                                dotPath: entry.dotPath
                            });
                    }

                    if (!findAll) {
                        return { matched: true, results };
                    }
                }
            }
        }

        return { matched: results.length > 0, results };
    };
};

module.exports = MithrilSync;
