class MithrilSync {
    constructor(object = {}) {
        this.original = structuredClone(object);
        this.entries = ObjectSyncTool.flatten(object);
        this._watcher = null;
    };

    static flatten(obj = {}, prefix = []) {
        const results = [];
        const stack = [{ current: obj, path: prefix }];

        while (stack.length) {
            const { current, path } = stack.pop();

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
                current.forEach((value, i) => {
                    stack.push({ current: value, path: [...path, i], kind: 'array' });
                });
            } else if (typeof current === 'object' && current !== null) {
                for (const [key, value] of Object.entries(current)) {
                    stack.push({ current: value, path: [...path, key], kind: 'object' });
                }
            } else {
                results.push({ path, dotPath: path.join('.'), value: current, kind: typeof current });
            }
        }

        return results;
    };

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

    static merge(target = {}, source = {}) {
        for (const [key, value] of Object.entries(source)) {
            if (
                typeof value === 'object' && value !== null &&
                typeof target[key] === 'object' && target[key] !== null
            ) {
                target[key] = ObjectSyncTool.merge(target[key], value);
            } else {
                target[key] = value;
            }
        }
        return target;
    };

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

    static get(obj, dotPath) {
        return dotPath.split('.').reduce((o, k) => o?.[k], obj);
    };

    static set(obj, dotPath, value) {
        const keys = dotPath.split('.');
        let ref = obj;
        keys.slice(0, -1).forEach((k) => {
            if (!(k in ref)) ref[k] = {};
            ref = ref[k];
        });
        ref[keys.at(-1)] = value;
    };

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

    static fromDiff(base = {}, diff = []) {
        return this.applyChanges(structuredClone(base), diff);
    };

    syncEntries(entries = []) {
        this.entries = [...entries];
    };

    getOriginal() {
        return structuredClone(this.original);
    };

    getFlat() {
        return structuredClone(this.entries);
    };

    rebuild() {
        return ObjectSyncTool.rebuild(this.entries);
    };

    updateEntry(dotPath, newValue) {
        const index = this.entries.findIndex((e) => e.dotPath === dotPath);
        if (index !== -1) {
            this.entries[index].value = newValue;
        } else {
            const path = dotPath.split('.').map(k => isNaN(k) ? k : +k);
            this.entries.push({ path, dotPath, value: newValue });
        }
    };

    removeEntry(dotPath) {
        this.entries = this.entries.filter((e) => e.dotPath !== dotPath);
    };

    getChanges(options = {}) {
        const currentFlat = ObjectSyncTool.flatten(this.rebuild());
        return ObjectSyncTool.watch(ObjectSyncTool.flatten(this.original), currentFlat, options);
    };

    mergeWith(source = {}) {
        const merged = ObjectSyncTool.merge(this.getOriginal(), source);
        this.entries = ObjectSyncTool.flatten(merged);
    };

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
        const reverted = ObjectSyncTool.applyChanges(this.rebuild(), reversed);
        this.entries = ObjectSyncTool.flatten(reverted);
    };

    watchLive(callback, interval = 500, options = {}) {
        clearInterval(this._watcher);
        let previousFlat = ObjectSyncTool.flatten(this.rebuild());

        this._watcher = setInterval(() => {
            const currentFlat = ObjectSyncTool.flatten(this.rebuild());
            const changes = ObjectSyncTool.watch(previousFlat, currentFlat, options);
            if (changes.length) {
                previousFlat = currentFlat;
                callback(changes);
            }
        }, interval);
    };

    stopWatch() {
        clearInterval(this._watcher);
        this._watcher = null;
    };

    toTree(filterFn = () => true) {
        const filtered = this.entries.filter(filterFn);
        return ObjectSyncTool.rebuild(filtered);
    };

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
                                dotPath: entry.dotPath,
                                context: null
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
