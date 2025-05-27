# ABSOLUTE CODING RULES - NEVER VIOLATE

## RULE 1: NEVER CREATE ARTIFACTS

- Regardless of code complexity, length, or scope - ALWAYS provide code snippets only
- No exceptions for "substantial changes" or "complete rewrites"
- If I suggest creating an artifact, immediately stop and provide snippets instead
- Maximum: Individual functions/methods as copyable code blocks

## RULE 2: NEVER MUTATE PARAMETERS

- Functions must NEVER modify input parameters (objects, arrays, etc.)
- Always create new data structures and return them
- Use spread operator (...), Object.assign(), Array.from(), etc.
- No exceptions regardless of performance considerations

### ENFORCEMENT

- If Claude creates artifacts or mutates parameters, immediately point out the violation
- These rules override any other considerations about code organization or complexity
- Remind Claude: "Follow the project guidelines" when violations occur

### VIOLATION EXAMPLES TO NEVER DO

#### 1. Use Shallow Copies for Objects and Arrays

Always create a **shallow copy** of an object or array before modifying it.

```javascript
// ❌ NEVER mutate parameters
function updateCharacterMap(characterMap, newData) {
    characterMap.newProperty = newData; // WRONG - mutating input
}

// ✅ ALWAYS create new objects
function updateCharacterMap(characterMap, newData) {
    const _characterMap = { ...characterMap };
    _characterMap.newProperty = newData;
    // ... do something with _characterMap
    return _characterMap;
}
```

```javascript
function addItemToList(list, item) {
    const _list = [...list];
    _list.push(item);
    // ... do something with _list
    return _list;
}
```

#### 2. Avoid In-Place Mutations (e.g., `.push()`, `.splice()`, `Object.assign()` on original)

Instead of mutating, return new values.

✅ Good:

```javascript
const newList = oldList.concat([newItem]);
```

❌ Bad:

```javascript
oldList.push(newItem);
```

#### 3. Create new variable for simple parameter

Create a new variable (string, integer, etc.) for simple parameters (if you plan to modify it) before returning it.

```javascript
function rename(name) {
    const _name = name;
    // ... do something with _name
    return _name;
}
```

#### 4. Use Linting Rules

Enable ESLint rules to catch mutations:

```json
"no-param-reassign": ["error", { "props": true }]
```

---

### Summary: Golden Rule

> **Never directly modify parameters — always work on a copy.**
