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

```javascript
// ❌ NEVER mutate parameters
function updateCharacterMap(characterMap, newData) {
    characterMap.newProperty = newData; // WRONG - mutating input
}

// ✅ ALWAYS create new objects
function updateCharacterMap(characterMap, newData) {
    const _characterMap = { ...characterMap };
    _characterMap.newProperty = newData;
    return _characterMap;
}
```
