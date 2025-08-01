# Mithril Sync 🧙🧰

> A powerful utility for flattening, rebuilding, syncing, diffing, and searching deeply nested JavaScript objects. Inspired by the worlds of LOTR, Marvel, and Harry Potter.

---

## 📦 Installation

```bash
npm install mithril-sync
```

---

## ✨ Features

- Flatten nested objects (objects, arrays, sets, maps)
- Rebuild original object from flattened structure
- Find key/value deeply with flexible filters
- Track changes (diffs)
- Live object mutation tracking
- Apply, revert or sync changes
- Use `dotPath` notation for fast access
- Lightweight, dependency-free

---

## 📘 Usage

```js
const MithrilSync = require("mithril-sync");

const obj = { user: { name: "John", age: 30 }, tags: ["hero", "wizard"] };

const tool = new MithrilSync(obj);
```

---

## 🔍 Methods

### constructor(object)

Initializes the sync tool.

```js
const tool = new MithrilSync({ a: { b: 1 } });
```

---

### flatten(obj)

Static method to flatten any object.

```js
const flat = MithrilSync.flatten({ a: { b: 1 } });
```

---

### rebuild(entries)

Rebuilds original object from flat structure.

```js
const rebuilt = MithrilSync.rebuild(flat);
```

---

### getOriginal()

Returns original input object.

```js
tool.getOriginal();
```

---

### getFlat()

Returns current flat structure (after mutations).

```js
tool.getFlat();
```

---

### rebuild()

Rebuilds object from internal entries.

```js
tool.rebuild();
```

---

### updateEntry(dotPath, newValue)

Updates a specific entry.

```js
tool.updateEntry("user.name", "Jane");
```

---

### removeEntry(dotPath)

Removes a specific path.

```js
tool.removeEntry("user.age");
```

---

### getChanges(options?)

Detects differences from original.

```js
tool.getChanges();
```

---

### mergeWith(object)

Merges new object into existing one.

```js
tool.mergeWith({ user: { email: "john@example.com" } });
```

---

### revertChanges(diff)

Reverts changes based on a diff array.

```js
const diff = tool.getChanges();

tool.revertChanges(diff);
```

---

### watchLive(callback, interval, options?)

Watches object live and returns diffs.

```js
tool.watchLive((changes) => console.log(changes));
```

---

### stopWatch()

Stops live watch.

```js
tool.stopWatch();
```

---

### toTree(filterFn)

Filters entries and rebuilds into tree.

```js
tool.toTree(entry => entry.dotPath.includes("user"));
```

---

### find(options)

Finds key/value with filters and options.

```js
tool.find({ target: "name", matchKeys: true });
```

Supports `fallbackTargets`:

```js
tool.find({
  target: "nickname",
  fallbackTargets: ["alias", "name"]
});
```

---

### Static Utilities

```js
MithrilSync.get(obj, "a.b.c");
MithrilSync.set(obj, "a.b.c", 42);
MithrilSync.watch(oldEntries, newEntries, options);
MithrilSync.applyChanges(obj, diff);
MithrilSync.fromDiff(original, diff);
```

---

## 📜 License

MIT

---

## 🧙 Inspired by

- 🧝‍♂️ Lord of the Rings
- 🧙‍♂️ Harry Potter
- 🦸 Marvel Universe
