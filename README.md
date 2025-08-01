# mithril-sync

A powerful utility to flatten, diff, rebuild, and sync deeply nested JavaScript data structures — inspired by magic, forged in code.

## ✅ Features

- Flatten deeply nested objects
- Rebuild from flattened data
- Watch for live changes
- Compare (diff) versions
- Modify or revert selectively
- Advanced searching with filters and mutation

## 📦 Installation

```bash
npm install @syncx/object-toolkit
```

## 📘 Usage

```js
const { ObjectSyncTool } = require('@syncx/object-toolkit');

const tool = new ObjectSyncTool({ user: { name: 'John', age: 30 } });

console.log(tool.find({ target: 'Alice' }));
console.log(tool.getFlat());
console.log(tool.rebuild());

const changes = tool.getChanges();

tool.revertChanges(changes);
```

## 📚 API Docs

See full API in `src/ObjectSyncTool.js` for detailed method documentation.

## 📄 License

MIT
